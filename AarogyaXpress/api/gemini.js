const USER_RATE_LIMIT = 20;
const WINDOW_MS = 60_000;
const rateBuckets = new Map();
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

async function verifyFirebaseToken(idToken) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(process.env.FIREBASE_API_KEY || "AIzaSyCJ686_Ir--GInCc2SUXBKZJ4GITDjDOUY")}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!response.ok) return null;
  const result = await response.json();
  const user = result.users?.[0];
  if (!user || user.localId === undefined || user.disabled) return null;
  return user.localId;
}

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

  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) return res.status(401).json({ error: "Sign in before using AI analysis." });

  const userId = await verifyFirebaseToken(idToken).catch(() => null);
  if (!userId) return res.status(401).json({ error: "Your session expired. Sign in again." });
  if (!checkRateLimit(userId)) {
    return res.status(429).json({ error: "AI request limit reached. Please wait a minute and try again." });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(503).json({ error: "Gemini is not configured. Add a valid server-only GEMINI_API_KEY in Vercel." });
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
  const parts = [];
  for (const part of body.parts) {
    if (typeof part?.text === "string" && part.text.length <= 20_000) {
      parts.push({ text: part.text });
      continue;
    }
    const image = part?.inlineData;
    if (
      image &&
      ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(image.mimeType) &&
      typeof image.data === "string" &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(image.data)
    ) {
      parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } });
      continue;
    }
    return res.status(400).json({ error: "Invalid AI request." });
  }
  const size = Buffer.byteLength(JSON.stringify(parts), "utf8");
  if (size > MAX_REQUEST_BYTES) return res.status(413).json({ error: "Document is too large. Please upload a smaller file." });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] }),
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
    const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!text) return res.status(502).json({ error: "Gemini returned no analysis. Please try again with a clearer image." });
    return res.status(200).json({ text });
  } catch {
    return res.status(502).json({ error: "Could not reach Gemini. Please try again." });
  }
}
