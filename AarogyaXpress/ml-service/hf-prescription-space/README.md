---
title: AarogyaXpress Prescription OCR
emoji: 💊
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Handwritten prescription OCR service

This Space serves [`chinmays18/medical-prescription-ocr`](https://huggingface.co/chinmays18/medical-prescription-ocr) as a raw-text OCR endpoint. It does not diagnose, verify a prescription, or recommend medication or dosage. A human must check every extracted value against the source.

## Deploy the Space

Create a new Hugging Face **Docker Space**, then copy the files in this folder to the Space repository and push them. The Space downloads the model weights from Hugging Face at startup; the model file is about 809 MB, so its first start can take a while.

Add `OCR_SERVICE_TOKEN` under **Space settings → Variables and secrets → Secrets**. Generate a new random value; do not commit it.

## Connect Vercel

Add these environment variables to the AarogyaXpress Vercel project:

- `HF_DONUT_OCR_URL` — the Space origin, for example `https://<username>-<space-name>.hf.space`
- `HF_DONUT_OCR_TOKEN` — the same random value as the Space's `OCR_SERVICE_TOKEN`
- `VITE_HF_DONUT_OCR` — `true`

Keep the Hugging Face token server-only. After changing Vercel variables, redeploy so the frontend flag and API function both receive their settings. If the Space is unavailable, the app falls back to browser Tesseract OCR.

The existing `GEMINI_API_KEY` is still needed to turn recognized text into the app's structured medicine details; Donut performs OCR only.

This Space processes uploaded prescription images in memory and does not save them.

## Endpoint

`POST /api/prescription/ocr` with multipart field `image`. The endpoint requires `X-OCR-Service-Token` and returns `raw_text`, model id, and a human-review notice.
