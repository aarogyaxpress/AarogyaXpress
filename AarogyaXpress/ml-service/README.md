# AarogyaXpress local AI service

This service makes the current web app's image workflows honest and runnable:

- `/api/prescription/ocr`: local Tesseract OCR plus transparent field extraction; every candidate needs human confirmation.
- `/api/xray/analyze`: local CheXNet DenseNet121 checkpoint from `artifacts/chexnet/model.pth.tar`; reports raw model signals, not a diagnosis.
- `/api/retina/analyze`: IDRiD-trained DenseNet121 baseline. This route stays unavailable until you train the local checkpoint.

## Start locally (macOS)

From the repository root:

```bash
python3 -m venv ml-service/.venv
source ml-service/.venv/bin/activate
python -m pip install -r ml-service/requirements.txt
brew install tesseract  # skip if `tesseract --version` already works
python ml-service/app.py
```

For multilingual prescription text, install Tesseract's Arabic and French language data as well as English (`brew install tesseract-lang` on macOS, or the matching `tesseract-ocr-ara` and `tesseract-ocr-fra` packages on Debian/Ubuntu). The OCR endpoint uses whichever of `ara`, `eng`, and `fra` are installed. Set `AAROGYA_TESSERACT_LANGUAGES` to a `+`-separated list to select languages explicitly.

The Doc Analyser and medicine scanner use Tesseract.js in the browser by default, including on Vercel. If `VITE_AI_SERVICE_URL` is explicitly set, image OCR is sent to this Flask endpoint instead. To use the Python service from a hosted frontend, deploy it to a separate Python-capable host, set `VITE_AI_SERVICE_URL` in the frontend's build environment to its HTTPS origin, and set `AAROGYA_ALLOWED_ORIGIN` on the service to the exact frontend origin. Vercel's static Vite deployment does not run this Flask service. If browser OCR fails, the React app falls back to its existing image analysis.

The CheXNet checkpoint is loaded locally on the first X-ray request. Start the React app in another terminal with `npm run dev`; the UI calls `http://localhost:8001`.

## Retinal training data

Download IDRiD from its [official challenge page](https://idrid.grand-challenge.org/Data/) and read its access terms. Do not add images or labels to Git. Then run:

```bash
source ml-service/.venv/bin/activate
python ml-service/train_retina.py --dataset /path/to/IDRiD
```

If the archive has a different folder layout, pass paths explicitly:

```bash
python ml-service/train_retina.py \
  --dataset /path/to/IDRiD \
  --labels '/path/to/IDRiD Disease Grading Training Labels.csv' \
  --images '/path/to/Original Images/a. Training Set'
```

The training script uses an ImageNet-initialized DenseNet121 and fine-tunes the five IDRiD DR grades. This is a research baseline, not training from random initialization and not a clinically validated system. It makes an internal grouped 80/20 development split and saves the best validation macro-F1 checkpoint at `ml-service/artifacts/retina_idrid_densenet121.pt`. Keep any official test set untouched for final evaluation.

## X-ray model scope

The X-ray service uses the cloned CheXNet DenseNet121 checkpoint trained on NIH ChestX-ray14. Its scores are uncalibrated; it is not a TB-specific Indian model. To build an India-specific disease model, agree on the target and reference labels with clinical partners, train/fine-tune on appropriately governed data, and evaluate on held-out institutions.

## Safety and data handling

- No upload is stored by this local service; request files are processed in memory.
- Do not put patient images, reports, or identifiers in Git or public demo hosting.
- The service is a research prototype and must not be used for diagnosis, treatment, medication decisions, or triage of real patients.
- For public deployment, replace localhost-only setup with authenticated infrastructure, audited storage policy, consent flow, and institution-approved clinical validation.
