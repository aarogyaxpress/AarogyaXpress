"""Train a five-class DenseNet121 baseline on IDRiD disease-grading labels.

This is an educational research pipeline, not a clinically validated model.
It uses only the IDRiD training labels and creates a patient/image-grouped
development split. Keep the official test labels untouched for final reporting.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd
import torch
from PIL import Image
from sklearn.metrics import balanced_accuracy_score, f1_score
from sklearn.model_selection import GroupShuffleSplit
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.models import DenseNet121_Weights, densenet121
from tqdm import tqdm


def find_column(columns, *needles):
    for column in columns:
        normalized = re.sub(r"[^a-z0-9]+", " ", str(column).lower()).strip()
        if all(needle in normalized for needle in needles):
            return column
    return None


class FundusDataset(Dataset):
    def __init__(self, rows, transform):
        self.rows = rows.reset_index(drop=True)
        self.transform = transform

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index):
        row = self.rows.iloc[index]
        image = Image.open(row.image_path).convert("RGB")
        return self.transform(image), int(row.grade)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, required=True, help="Root folder containing IDRiD files")
    parser.add_argument("--labels", type=Path, default=None, help="Training grading CSV; auto-discovered when omitted")
    parser.add_argument("--images", type=Path, default=None, help="Training fundus image folder; auto-discovered when omitted")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "artifacts" / "retina_idrid_densenet121.pt")
    args = parser.parse_args()

    labels_path = args.labels or next(iter(args.dataset.rglob("*Training*Labels*.csv")), None)
    image_dir = args.images or next(iter(args.dataset.rglob("*Training*Set")), None)
    if labels_path is None or image_dir is None:
        raise SystemExit("Could not discover IDRiD training labels/images. Pass --labels and --images explicitly.")
    labels = pd.read_csv(labels_path)
    image_column = find_column(labels.columns, "image")
    grade_column = find_column(labels.columns, "retinopathy", "grade")
    if image_column is None or grade_column is None:
        raise SystemExit(f"Expected image-name and retinopathy-grade columns; found: {list(labels.columns)}")

    image_lookup = {p.stem.lower(): p for p in image_dir.rglob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png"}}
    records = []
    for _, row in labels.iterrows():
        stem = Path(str(row[image_column])).stem.lower()
        image_path = image_lookup.get(stem)
        if image_path is None:
            continue
        try:
            grade = int(row[grade_column])
        except (TypeError, ValueError):
            continue
        if grade not in range(5):
            continue
        # Group any left/right or repeated files sharing the IDRiD patient stem.
        match = re.search(r"(\d+)", stem)
        records.append({"image_path": image_path, "grade": grade, "group": match.group(1) if match else stem})
    data = pd.DataFrame(records)
    if len(data) < 20:
        raise SystemExit(f"Only {len(data)} labeled images matched. Check the supplied image and label paths.")

    train_indices, val_indices = next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42).split(data, data.grade, data.group))
    train_rows, val_rows = data.iloc[train_indices], data.iloc[val_indices]
    train_transform = transforms.Compose([
        transforms.Resize((512, 512)),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.12, contrast=0.12, saturation=0.08),
        transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
    ])
    eval_transform = transforms.Compose([
        transforms.Resize((512, 512)),
        transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
    ])
    train_loader = DataLoader(FundusDataset(train_rows, train_transform), batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(FundusDataset(val_rows, eval_transform), batch_size=args.batch_size, shuffle=False, num_workers=0)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    weights = DenseNet121_Weights.DEFAULT
    model = densenet121(weights=weights)
    model.classifier = nn.Linear(model.classifier.in_features, 5)
    model = model.to(device)
    counts = torch.bincount(torch.tensor(train_rows.grade.to_list()), minlength=5).float().clamp_min(1)
    class_weights = (counts.sum() / (5 * counts)).to(device)
    loss_fn = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-4)
    best_f1 = -1.0

    for epoch in range(args.epochs):
        model.train()
        train_loss = 0.0
        for images, targets in tqdm(train_loader, desc=f"Epoch {epoch + 1}/{args.epochs}"):
            images, targets = images.to(device), targets.to(device)
            optimizer.zero_grad(set_to_none=True)
            loss = loss_fn(model(images), targets)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(targets)
        model.eval()
        truth, predicted = [], []
        with torch.inference_mode():
            for images, targets in val_loader:
                logits = model(images.to(device))
                predicted.extend(logits.argmax(1).cpu().tolist())
                truth.extend(targets.tolist())
        macro_f1 = f1_score(truth, predicted, average="macro", zero_division=0)
        balanced_acc = balanced_accuracy_score(truth, predicted)
        mean_loss = train_loss / max(1, len(train_rows))
        print(f"epoch={epoch + 1} train_loss={mean_loss:.4f} val_macro_f1={macro_f1:.4f} val_balanced_accuracy={balanced_acc:.4f}")
        if macro_f1 > best_f1:
            best_f1 = macro_f1
            args.output.parent.mkdir(parents=True, exist_ok=True)
            torch.save({
                "model_state_dict": model.cpu().state_dict(),
                "labels": ["No DR", "Mild NPDR", "Moderate NPDR", "Severe NPDR", "Proliferative DR"],
                "architecture": "torchvision densenet121; ImageNet initialization; IDRiD retinopathy-grade fine-tuning",
                "development_split": "GroupShuffleSplit 80/20, random_state=42",
                "validation_macro_f1": float(macro_f1),
                "validation_balanced_accuracy": float(balanced_acc),
                "train_rows": len(train_rows), "validation_rows": len(val_rows),
            }, args.output)
            model.to(device)
            print(f"saved best checkpoint: {args.output}")

    print("Research baseline complete. Do not report this internal validation score as clinical performance.")


if __name__ == "__main__":
    main()
