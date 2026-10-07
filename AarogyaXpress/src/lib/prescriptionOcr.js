const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL;

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

  // Tesseract.js runs in the browser; the uploaded prescription image is not
  // sent to another server for OCR. Language data is fetched by the worker.
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
