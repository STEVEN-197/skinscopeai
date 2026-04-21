

# Add Real ML to SkinScope

Right now your app uses **rule-based color math + a hosted vision LLM (Gemini)**. There's no actual trained model. Here's how to add real ML — pick the level that matches your goal.

## Three levels (pick one)

### Level 1 — In-browser CNN (recommended, $0, no backend)
Run a small pre-trained image model directly in the browser using **ONNX Runtime Web** or **TensorFlow.js**. Adds a real neural network signal alongside your existing color rules and Gemini.

- **Model**: MobileNetV2 (or EfficientNet-Lite) pre-trained on ImageNet, fine-tuned on a small jaundice/redness/skin-condition dataset (or use a public dermatology model from HuggingFace like `Falconsai/nsfw_image_detection` style — there are open skin/jaundice classifiers).
- **Where it runs**: Client-side via WebAssembly (no server cost, works offline, fully private — image never leaves the device for this step).
- **Output**: Class probabilities (e.g., `jaundice: 0.78, healthy: 0.15, redness: 0.07`) + an embedding vector.
- **Integration**: Becomes a 3rd signal, blended with color rules + Gemini for the final severity.

### Level 2 — Hugging Face Inference API (hosted real models, ~free tier)
Call a real trained vision model (e.g., `google/vit-base`, a fine-tuned dermatology ViT, or a CLIP-based zero-shot classifier) from your edge function. No training needed, real ML signal, but adds an external API key + latency.

### Level 3 — Train your own model (full ML pipeline, weeks of work)
Collect a labeled dataset (jaundice/healthy/burn/rash photos), fine-tune a CNN in Python (Colab), export to ONNX, deploy via Level 1. This is the "real" ML answer but requires data collection, labeling, and ML expertise. Out of scope for a single Lovable build — I'd recommend Level 1 with an existing pre-trained model.

## Recommended build (Level 1)

### What changes
1. **New file** `src/lib/ml-classifier.ts` — loads an ONNX model from `/public/models/skin-classifier.onnx`, preprocesses the image (resize 224×224, normalize), runs inference, returns class probabilities.
2. **New dependency** `onnxruntime-web` — runs ONNX models in the browser via WebAssembly.
3. **Model file** placed at `public/models/skin-classifier.onnx` (~10–15 MB MobileNetV2). I'll use a publicly available pre-trained skin/medical image model (e.g., from HuggingFace's ONNX zoo) — if none fits perfectly for jaundice specifically, we use a general medical/skin classifier and map its outputs to your three regions.
4. **Update** `src/routes/dashboard.analyze.tsx` — after color analysis, run ML inference and add a "Running on-device ML model…" stage. Pass ML probabilities to the edge function.
5. **Update** `supabase/functions/analyze-skin/index.ts` — accept `mlPredictions` in the body, include them in the Gemini prompt as a third signal, and **blend severity with new weights**: 50% Gemini + 30% ML model + 20% historical trend (instead of current 70/30 Gemini/history).
6. **Update** report page to show a new "ML Model Predictions" card with class probabilities as a bar chart.
7. **Migration** — add `ml_predictions jsonb` column to `reports` table to store the ML output.

### Technical details

**Pipeline after image capture:**
```text
Image → Color Rules (existing)
      → ONNX MobileNet (NEW, in-browser, ~200ms)
      → Upload → Gemini Vision (existing)
      → Blend all 3 → Final severity
      → Save report with all signals
```

**ONNX inference snippet:**
```ts
import * as ort from "onnxruntime-web";
const session = await ort.InferenceSession.create("/models/skin-classifier.onnx");
const tensor = preprocessImage(imageElement); // [1,3,224,224] float32
const { output } = await session.run({ input: tensor });
const probs = softmax(output.data);
```

**Bundle size**: ~2 MB for `onnxruntime-web` WASM + ~10–15 MB model (lazy-loaded on first analyze, cached forever).

**Honesty**: The pre-trained model will be a general skin/image classifier, not a medical-grade jaundice detector. It's a real ML signal but the disclaimer (educational tool, not medical advice) stays.

## Out of scope
- Training a custom model from scratch (needs labeled dataset)
- Real-time camera ML (would need optimization)
- Removing the Gemini call (it adds reasoning + recommendations the CNN can't)

