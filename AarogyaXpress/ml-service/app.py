"""Local research inference service for AarogyaXpress.

The chest X-ray route uses a local CheXNet DenseNet121 research checkpoint.
The retinal route is enabled only after training the local IDRiD baseline.
Prescription handling is OCR plus transparent extraction rules; it never
chooses a medicine or invents dosing instructions.
"""

from __future__ import annotations

import io
import importlib.util
import os
import re
import shutil
import threading
from pathlib import Path

import pytesseract
import torch
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parent
RETINA_CHECKPOINT = Path(os.environ.get("AAROGYA_RETINA_CHECKPOINT", ROOT / "artifacts" / "retina_idrid_densenet121.pt"))
FINGERPRINT_CHECKPOINT = Path(os.environ.get("AAROGYA_FINGERPRINT_CHECKPOINT", ROOT / "artifacts" / "fingerprint_blood_group_resnet.h5"))
from chexnet_model import CHECKPOINT as XRAY_CHECKPOINT, predict as predict_chexnet
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/tiff"}
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
CORS(app, resources={r"/api/*": {"origins": os.environ.get("AAROGYA_ALLOWED_ORIGIN", "*")}})

_xray_model = None
_xray_lock = threading.Lock()
_retina_model = None
_retina_lock = threading.Lock()
_fingerprint_model = None
_fingerprint_lock = threading.Lock()


def _read_upload(field: str = "image") -> tuple[Image.Image, str]:
    uploaded = request.files.get(field)
    if uploaded is None or not uploaded.filename:
        raise ValueError("Image file is required.")
    if uploaded.mimetype not in ALLOWED_MIME:
        raise ValueError("Upload a JPG, PNG, WEBP, or TIFF image.")
    raw = uploaded.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ValueError("Image is too large. Maximum size is 15 MB.")
    try:
        image = Image.open(io.BytesIO(raw))
        image = ImageOps.exif_transpose(image)
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("The uploaded file is not a readable image.") from exc
    if image.width < 128 or image.height < 128:
        raise ValueError("Image resolution is too small for this research prototype.")
    return image, uploaded.filename


def _get_xray_model():
    global _xray_model
    if _xray_model is None:
        with _xray_lock:
            if _xray_model is None:
                _xray_model = True
    return _xray_model


def _get_retina_model():
    global _retina_model
    if not RETINA_CHECKPOINT.exists():
        return None
    if _retina_model is None:
        with _retina_lock:
            if _retina_model is None:
                from torchvision.models import DenseNet121_Weights, densenet121

                model = densenet121(weights=None)
                model.classifier = torch.nn.Linear(model.classifier.in_features, 5)
                checkpoint = torch.load(RETINA_CHECKPOINT, map_location=DEVICE, weights_only=True)
                model.load_state_dict(checkpoint["model_state_dict"])
                _retina_model = model.to(DEVICE).eval()
    return _retina_model


@app.get("/api/health")
def health():
    ocr_available = shutil.which("tesseract") is not None
    return jsonify({
        "status": "ok",
        "device": DEVICE,
        "models": {
            "chest_xray": {"available": XRAY_CHECKPOINT.exists(), "weights": str(XRAY_CHECKPOINT), "loaded": _xray_model is not None},
            "retinal_fundus": {"available": RETINA_CHECKPOINT.exists(), "checkpoint": RETINA_CHECKPOINT.name},
            "fingerprint_blood_group_research": {"available": FINGERPRINT_CHECKPOINT.exists(), "checkpoint": FINGERPRINT_CHECKPOINT.name},
            "prescription_ocr": {"available": ocr_available},
        },
        "notice": "Research prototype only; not for diagnosis or treatment decisions.",
    })


def _get_fingerprint_model():
    global _fingerprint_model
    if not FINGERPRINT_CHECKPOINT.exists():
        return None
    if _fingerprint_model is None:
        with _fingerprint_lock:
            if _fingerprint_model is None:
                try:
                    from tensorflow.keras.models import load_model
                except ImportError as exc:
                    raise RuntimeError("Install ml-service/fingerprint-requirements.txt with Python 3.11 to enable this research model.") from exc
                _fingerprint_model = load_model(FINGERPRINT_CHECKPOINT, compile=False)
    return _fingerprint_model


@app.post("/api/fingerprint/analyze")
def analyze_fingerprint():
    try:
        image, filename = _read_upload()
        model = _get_fingerprint_model()
        if model is None:
            return jsonify({
                "error": "Fingerprint research checkpoint is not installed on this model service.",
                "model_ready": False,
            }), 503

        import numpy as np
        from tensorflow.keras.applications.resnet50 import preprocess_input
        from tensorflow.keras.preprocessing.image import img_to_array

        image = image.convert("RGB").resize((256, 256))
        tensor = img_to_array(image).astype("float32")
        tensor = preprocess_input(np.expand_dims(tensor, axis=0))
        scores = np.asarray(model.predict(tensor, verbose=0))[0]
        labels = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"]
        if scores.shape[0] != len(labels):
            raise ValueError("The fingerprint checkpoint does not return the expected eight classes.")
        ranked = sorted(
            [{"model_class": label, "score": round(float(score), 4)} for label, score in zip(labels, scores)],
            key=lambda item: item["score"],
            reverse=True,
        )
        return jsonify({
            "status": "experimental_research_output",
            "filename": filename,
            "model": "Fingerprint Blood Group Detection · ResNet50 research checkpoint",
            "top_model_class": ranked[0]["model_class"],
            "class_scores": ranked,
            "score_note": "Unvalidated model scores only. They are not a blood-group test or calibrated probabilities.",
            "clinical_use": False,
            "review_required": True,
            "image_storage": "not_stored",
        })
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception:
        app.logger.exception("Fingerprint research inference failed")
        return jsonify({"error": "Fingerprint research model could not process this image. Check the model service logs."}), 500


@app.post("/api/xray/analyze")
def analyze_xray():
    try:
        image, filename = _read_upload()
        ranked = predict_chexnet(image)
        return jsonify({
            "status": "research_screening_output",
            "filename": filename,
            "model": "CheXNet DenseNet121 · NIH ChestX-ray14 checkpoint",
            "signals": ranked,
            "score_note": "Model scores are uncalibrated research outputs, not diagnostic probabilities or a diagnosis.",
            "clinical_use": False,
            "review_required": True,
        })
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        app.logger.exception("X-ray inference failed")
        return jsonify({"error": "X-ray model could not process this image. Check the model service logs."}), 500


@app.post("/api/retina/analyze")
def analyze_retina():
    try:
        image, filename = _read_upload()
        model = _get_retina_model()
        if model is None:
            return jsonify({
                "error": "Retinal model is not trained yet. Follow ml-service/README.md to train the IDRiD research baseline.",
                "model_ready": False,
            }), 503
        from torchvision import transforms

        preprocess = transforms.Compose([
            transforms.Resize((512, 512)),
            transforms.ToTensor(),
            transforms.Normalize(mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225)),
        ])
        tensor = preprocess(image.convert("RGB")).unsqueeze(0).to(DEVICE)
        with torch.inference_mode():
            probabilities = torch.softmax(model(tensor), dim=1)[0].detach().cpu().numpy()
        grade = int(probabilities.argmax())
        labels = ["No DR", "Mild NPDR", "Moderate NPDR", "Severe NPDR", "Proliferative DR"]
        return jsonify({
            "status": "research_screening_output",
            "filename": filename,
            "model": "DenseNet121 fine-tuned on IDRiD training labels",
            "predicted_grade": labels[grade],
            "class_scores": [{"grade": label, "score": round(float(prob), 4)} for label, prob in zip(labels, probabilities)],
            "score_note": "Scores are experimental and not calibrated for clinical use.",
            "clinical_use": False,
            "review_required": True,
        })
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        app.logger.exception("Retinal inference failed")
        return jsonify({"error": "Retinal model could not process this image. Check the model service logs."}), 500


STRENGTH_RE = re.compile(r"\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|g|ml|iu|units?)\b", re.I)
FREQUENCY_RE = re.compile(r"\b(?:once|twice|thrice)\s+(?:a\s+)?day\b|\b(?:od|bd|bid|tds|tid|qid|sos|hs|prn)\b|\bevery\s+\d+\s+hours?\b", re.I)
DURATION_RE = re.compile(r"\b(?:for\s+)?\d+\s*(?:days?|weeks?|months?)\b", re.I)
DOSE_RE = re.compile(r"\b\d+\s?(?:tablets?|tabs?|capsules?|caps?|drops?|ml)\b", re.I)


def _extract_prescription_lines(text: str) -> list[dict]:
    items = []
    for raw_line in text.splitlines():
        line = re.sub(r"^[\s•*\-\d.)]+", "", raw_line).strip()
        if len(line) < 4 or not (STRENGTH_RE.search(line) or FREQUENCY_RE.search(line) or DOSE_RE.search(line)):
            continue
        strength = STRENGTH_RE.search(line)
        frequency = FREQUENCY_RE.search(line)
        duration = DURATION_RE.search(line)
        dose = DOSE_RE.search(line)
        before_strength = line[:strength.start()].strip(" :,-") if strength else ""
        candidate = re.sub(r"^(?:tab(?:let)?|cap(?:sule)?|syp|syrup|inj(?:ection)?)[.\s]+", "", before_strength, flags=re.I).strip()
        items.append({
            "medicine_candidate": candidate or None,
            "strength_text": strength.group(0) if strength else None,
            "dose_text": dose.group(0) if dose else None,
            "frequency_text": frequency.group(0) if frequency else None,
            "duration_text": duration.group(0) if duration else None,
            "source_line": line,
            "review_required": True,
        })
    return items


@app.post("/api/prescription/ocr")
def prescription_ocr():
    try:
        image, filename = _read_upload()
        # Follow the upstream OCR project's multilingual Tesseract approach,
        # but use only language packs installed by the service operator.
        installed_languages = set(pytesseract.get_languages(config=""))
        requested_languages = os.environ.get("AAROGYA_TESSERACT_LANGUAGES", "ara+eng+fra").split("+")
        languages = [language for language in requested_languages if language in installed_languages]
        if not languages:
            return jsonify({"error": "Install a Tesseract language pack (eng, ara, or fra) to enable prescription OCR."}), 503

        gray = ImageOps.autocontrast(image.convert("L"))
        # Light binarization helps Tesseract with photographed prescriptions.
        threshold = gray.point(lambda pixel: 255 if pixel > 130 else 0)
        text = pytesseract.image_to_string(threshold, lang="+".join(languages), config="--psm 6")
        lines = _extract_prescription_lines(text)
        return jsonify({
            "status": "ocr_extracted",
            "filename": filename,
            "raw_text": text,
            "medicine_lines": lines,
            "ocr_engine": f"Tesseract OCR ({'+'.join(languages)})",
            "notice": "OCR may misread handwriting, medicine names, or doses. Verify every field against the original prescription; this tool does not provide dosage advice.",
        })
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except pytesseract.TesseractNotFoundError:
        return jsonify({"error": "Tesseract OCR is not installed. On macOS run: brew install tesseract"}), 503
    except Exception:
        app.logger.exception("Prescription OCR failed")
        return jsonify({"error": "OCR could not process this image. Check that Tesseract is installed."}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("AAROGYA_AI_PORT", "8001")), debug=False)
