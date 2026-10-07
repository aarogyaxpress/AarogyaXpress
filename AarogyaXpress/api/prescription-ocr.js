import { authenticatedUserId } from "./_lib/firebaseAuth.js";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const userId = await authenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: "Sign in before using prescription OCR." });

  const spaceUrl = process.env.HF_DONUT_OCR_URL;
  const serviceToken = process.env.HF_DONUT_OCR_TOKEN;
  if (!spaceUrl || !serviceToken) {
    return res.status(503).json({ error: "Handwriting OCR is not configured. Browser OCR will be used instead." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid OCR request." });
  }

  const { image, mimeType } = body || {};
  if (
    typeof image !== "string" ||
    !ALLOWED_MIME_TYPES.has(mimeType) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(image)
  ) {
    return res.status(400).json({ error: "Upload a valid JPG, PNG, or WEBP image." });
  }
  const imageBuffer = Buffer.from(image, "base64");
  if (imageBuffer.length === 0 || imageBuffer.length > MAX_IMAGE_BYTES) {
    return res.status(413).json({ error: "Image is too large. Please upload an image under 3 MB." });
  }

  let endpoint;
  try {
    const base = new URL(spaceUrl);
    if (base.protocol !== "https:") throw new Error("HTTPS required");
    base.pathname = `${base.pathname.replace(/\/$/, "")}/api/prescription/ocr`;
    endpoint = base.toString();
  } catch {
    return res.status(503).json({ error: "The handwriting OCR service URL is invalid." });
  }

  try {
    const form = new FormData();
    form.append("image", new Blob([imageBuffer], { type: mimeType }), "prescription-image");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "X-OCR-Service-Token": serviceToken },
      body: form,
      signal: AbortSignal.timeout(240_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status === 401 ? 503 : response.status;
      return res.status(status).json({ error: result.detail || "Handwriting OCR could not process this image." });
    }
    if (typeof result.raw_text !== "string" || !result.raw_text.trim()) {
      return res.status(502).json({ error: "The handwriting OCR model returned no text." });
    }
    return res.status(200).json(result);
  } catch (error) {
    const message = error?.name === "TimeoutError"
      ? "The handwriting OCR service took too long. Try again or use the browser OCR fallback."
      : "Could not reach the handwriting OCR service.";
    return res.status(502).json({ error: message });
  }
}
