from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms


ROOT = Path(__file__).resolve().parent
CHECKPOINT = Path(__import__("os").environ.get("AAROGYA_CHEXNET_CHECKPOINT", ROOT / "artifacts" / "chexnet" / "model.pth.tar"))
CLASS_NAMES = [
    "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass", "Nodule",
    "Pneumonia", "Pneumothorax", "Consolidation", "Edema", "Emphysema", "Fibrosis",
    "Pleural_Thickening", "Hernia",
]
PREPROCESS = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])


class DenseNet121(nn.Module):
    def __init__(self):
        super().__init__()
        self.densenet121 = models.densenet121(weights=None)
        self.densenet121.classifier = nn.Sequential(nn.Linear(self.densenet121.classifier.in_features, 14), nn.Sigmoid())

    def forward(self, image):
        return self.densenet121(image)


@lru_cache(maxsize=1)
def load_model():
    if not CHECKPOINT.is_file():
        raise FileNotFoundError(f"CheXNet checkpoint not found: {CHECKPOINT}")
    checkpoint = torch.load(CHECKPOINT, map_location="cpu", weights_only=True)
    state = {
        re.sub(r"\.(norm|conv)\.(\d+)\.", r".\1\2.", key.removeprefix("module.")): value
        for key, value in checkpoint["state_dict"].items()
    }
    model = DenseNet121()
    model.load_state_dict(state, strict=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return model.to(device).eval(), device


def predict(image: Image.Image):
    model, device = load_model()
    tensor = PREPROCESS(image.convert("RGB")).unsqueeze(0).to(device)
    with torch.inference_mode():
        scores = model(tensor)[0].detach().cpu().tolist()
    return sorted(
        ({"finding": label, "model_score": round(float(score), 4)} for label, score in zip(CLASS_NAMES, scores)),
        key=lambda row: row["model_score"], reverse=True,
    )[:6]
