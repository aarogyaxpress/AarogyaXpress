import { auth } from "../firebase";

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL;
const HF_DONUT_OCR_ENABLED = import.meta.env.VITE_HF_DONUT_OCR === "true";

async function extractWithDonut(file) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in to use prescription OCR.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  const token = await user.getIdToken();
  const response = await fetch("/api/prescription-ocr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image: btoa(binary), mimeType: file.type }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Handwriting OCR is unavailable.");
  if (!result.raw_text?.trim()) throw new Error("No text was recognized in this image.");
  return result;
}

export async function extractPrescriptionText(file) {
  if (AI_SERVICE_URL) {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`${AI_SERVICE_URL.replace(/\/$/, "")}/api/prescription/ocr`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || `Prescription OCR service returned ${response.status}.`);
    }
    if (!result.raw_text?.trim()) {
      throw new Error("No text was recognized in this image.");
    }
    return result;
  }

  if (HF_DONUT_OCR_ENABLED) {
    try {
      return await extractWithDonut(file);
    } catch (error) {
      console.warn("Donut OCR unavailable; falling back to browser OCR:", error);
    }
  }

  // The fallback runs locally in the browser; the image is not sent for OCR.
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("ara+eng+fra", 1);
  try {
    const { data } = await worker.recognize(file);
    if (!data.text?.trim()) {
      throw new Error("No text was recognized in this image.");
    }
    return { raw_text: data.text, ocr_engine: "Tesseract.js (Arabic, English, French)" };
  } finally {
    await worker.terminate();
  }
}
