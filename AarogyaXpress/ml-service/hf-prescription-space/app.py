import hmac
import os
from contextlib import asynccontextmanager
from io import BytesIO

import torch
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from transformers import DonutProcessor, VisionEncoderDecoderModel

MODEL_ID = "chinmays18/medical-prescription-ocr"
MAX_UPLOAD_BYTES = 4 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
processor = None
model = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global processor, model
    processor = DonutProcessor.from_pretrained(MODEL_ID)
    model = VisionEncoderDecoderModel.from_pretrained(MODEL_ID)
    model.to("cpu").eval()
    yield
    model = None
    processor = None


app = FastAPI(title="AarogyaXpress Prescription OCR", lifespan=lifespan)


@app.get("/api/health")
def health():
    return {"status": "ok", "model": MODEL_ID, "ready": model is not None}


@app.post("/api/prescription/ocr")
async def prescription_ocr(
    image: UploadFile = File(...),
    x_ocr_service_token: str | None = Header(default=None),
):
    expected_token = os.environ.get("OCR_SERVICE_TOKEN", "")
    if not expected_token:
        raise HTTPException(status_code=503, detail="OCR service is not configured.")
    if not x_ocr_service_token or not hmac.compare_digest(x_ocr_service_token, expected_token):
        raise HTTPException(status_code=401, detail="Unauthorized.")
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Upload a JPG, PNG, or WEBP prescription image.")

    raw = await image.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image is too large. Maximum size is 4 MB.")
    try:
        source = Image.open(BytesIO(raw))
        source = ImageOps.exif_transpose(source).convert("RGB")
        source.load()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="The uploaded file is not a readable image.")
    if source.width < 128 or source.height < 128:
        raise HTTPException(status_code=400, detail="Image resolution is too small to read.")

    try:
        pixels = processor(images=source, return_tensors="pt").pixel_values
        prompt = "<s_ocr>"
        decoder_ids = processor.tokenizer(prompt, return_tensors="pt").input_ids
        with torch.inference_mode():
            generated = model.generate(
                pixel_values=pixels,
                decoder_input_ids=decoder_ids,
                max_length=512,
                num_beams=1,
                early_stopping=True,
            )
        text = processor.batch_decode(generated, skip_special_tokens=True)[0].strip()
        if not text:
            raise HTTPException(status_code=422, detail="No text was recognized. Try a clearer image.")
        return {
            "status": "ocr_extracted",
            "raw_text": text,
            "ocr_engine": f"Donut ({MODEL_ID})",
            "review_required": True,
            "notice": "Handwritten text may be misread. Verify every extracted medicine and dose against the original prescription. This model is not clinically validated and does not provide medical advice.",
        }
    except HTTPException:
        raise
    except Exception:
        app.logger.exception("Donut prescription OCR failed")
        raise HTTPException(status_code=502, detail="The OCR model could not process this image.")
