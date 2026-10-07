import { authenticatedUserId } from "./_lib/firebaseAuth.js";

const USER_RATE_LIMIT = 20;
const WINDOW_MS = 60_000;
const rateBuckets = new Map();
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

function checkRateLimit(userId) {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    rateBuckets.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (bucket.count >= USER_RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const userId = await authenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Your session expired. Sign in again." });
  if (!checkRateLimit(userId)) {
    return res.status(429).json({ error: "AI request limit reached. Please wait a minute and try again." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid AI request." });
  }
  if (!Array.isArray(body?.parts) || body.parts.length === 0 || body.parts.length > 3) {
    return res.status(400).json({ error: "Invalid AI request." });
  }
  const input = [];
  for (const part of body.parts) {
    if (typeof part?.text === "string" && part.text.length <= 20_000) {
      input.push({ type: "text", text: part.text });
      continue;
    }
    const image = part?.inlineData;
    if (
      image &&
      ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(image.mimeType) &&
      typeof image.data === "string" &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(image.data)
    ) {
      input.push({
        type: image.mimeType === "application/pdf" ? "document" : "image",
        mime_type: image.mimeType,
        data: image.data,
      });
      continue;
    }
    return res.status(400).json({ error: "Invalid AI request." });
  }
  const size = Buffer.byteLength(JSON.stringify(input), "utf8");
  if (size > MAX_REQUEST_BYTES) return res.status(413).json({ error: "Document is too large. Please upload a smaller file." });

  const hasPdf = input.some((part) => part.type === "document");
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const provider = process.env.AI_PROVIDER || (groqKey ? "groq" : "gemini");

  if (provider === "groq" && !hasPdf) {
    if (!groqKey) return res.status(503).json({ error: "Groq is not configured. Add a server-only GROQ_API_KEY in Vercel." });
    try {
      const content = input.flatMap((part) => {
        if (part.type === "text") return [{ type: "text", text: part.text }];
        return [{
          type: "image_url",
          image_url: { url: `data:${part.mime_type};base64,${part.data}` },
        }];
      });
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
          messages: [{ role: "user", content }],
          temperature: 0.2,
          max_completion_tokens: 4096,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return res.status(503).json({ error: "Groq rejected the server key. Check GROQ_API_KEY in Vercel." });
        }
        if (response.status === 429) return res.status(429).json({ error: "Groq rate limit reached. Please wait and try again." });
        return res.status(502).json({ error: "Groq could not complete the request. Please try again." });
      }
      const text = result.choices?.[0]?.message?.content?.trim();
      if (!text) return res.status(502).json({ error: "Groq returned no analysis. Please try again with a clearer image." });
      return res.status(200).json({ text });
    } catch {
      return res.status(502).json({ error: "Could not reach Groq. Please try again." });
    }
  }

  // Groq vision accepts images and text. Keep PDF analysis on Gemini when a
  // Gemini key is configured; Groq does not currently accept PDF documents.
  if (!geminiKey) {
    if (provider === "groq" && hasPdf) {
      return res.status(415).json({ error: "PDF analysis needs GEMINI_API_KEY. Groq mode currently accepts images and text; upload a page as an image or configure Gemini for PDFs." });
    }
    return res.status(503).json({ error: "AI is not configured. Add GROQ_API_KEY or GEMINI_API_KEY as a server-only Vercel environment variable." });
  }
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify({
          model,
          input,
          store: false,
          generation_config: { max_output_tokens: 4096 },
        }),
      }
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = result.error?.details?.find((detail) => detail.reason)?.reason;
      if (reason === "CONSUMER_SUSPENDED") {
        return res.status(503).json({ error: "Google suspended this Gemini project. Create a key in an active project and update Vercel's server-only GEMINI_API_KEY." });
      }
      if (response.status === 401 || response.status === 403) {
        return res.status(503).json({ error: "Gemini rejected the server key. Check that GEMINI_API_KEY belongs to an active project with the Gemini API enabled." });
      }
      return res.status(502).json({ error: "Gemini could not complete the request. Please try again." });
    }
    if (result.status && result.status !== "completed") {
      return res.status(502).json({ error: "Gemini could not complete the interaction. Please try again." });
    }
    const text = result.steps
      ?.filter((step) => step.type === "model_output")
      .flatMap((step) => step.content || [])
      .filter((part) => part.type === "text")
      .map((part) => part.text || "")
      .join("")
      .trim();
    if (!text) return res.status(502).json({ error: "Gemini returned no analysis. Please try again with a clearer image." });
    return res.status(200).json({ text });
  } catch {
    return res.status(502).json({ error: "Could not reach Gemini. Please try again." });
  }
}
