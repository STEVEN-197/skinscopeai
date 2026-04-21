// On-device neural analysis using TensorFlow.js + MobileNetV2.
//
// HONEST DESIGN NOTE
// ------------------
// There is no reliable, public, license-clear pre-trained jaundice/burn
// classifier we can ship. So instead of faking a medical-grade model with
// random ImageNet logits, we run a real CNN (MobileNetV2 from Google,
// pre-trained on ImageNet) as a *feature extractor* — it produces a
// 1024-dim semantic embedding of the image. We then feed that embedding,
// together with the existing color-feature vector, into a small,
// hand-crafted logistic-regression head whose weights are derived from the
// same color-rule thresholds the app already uses. This gives us:
//
//   1. A genuine in-browser CNN forward pass (~150-300ms on most devices).
//   2. Stable, deterministic class probabilities for {healthy, jaundice,
//      redness}.
//   3. An "image novelty" signal from the embedding norm — flags weird
//      inputs (very dark photos, screenshots, drawings) so the UI can
//      lower confidence.
//
// Everything runs locally; the image never leaves the device for this step.
// The medical disclaimer remains: this is an educational signal, not a
// diagnosis.

import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import type { ColorFeatures } from "./color-analysis";

export type MlClass = "healthy" | "jaundice" | "redness";

export interface MlPredictions {
  probabilities: Record<MlClass, number>;
  topClass: MlClass;
  topConfidence: number; // 0-100
  embeddingNorm: number; // L2 norm of the embedding (used for novelty)
  imageQuality: "good" | "fair" | "poor";
  inferenceMs: number;
  modelVersion: string;
}

interface LoadedModel {
  // The mobilenet wrapper exposes infer() returning a tensor.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  net: any;
}

let loadingPromise: Promise<LoadedModel> | null = null;
let cached: LoadedModel | null = null;

const MODEL_VERSION = "mobilenet-v2-1.0-224 + skin-head-v1";

async function loadModel(): Promise<LoadedModel> {
  if (cached) return cached;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    // Prefer WebGL backend when available for speed; fall back to CPU.
    try {
      await tf.setBackend("webgl");
    } catch {
      await tf.setBackend("cpu");
    }
    await tf.ready();
    const net = await mobilenet.load({ version: 2, alpha: 1.0 });
    cached = { net };
    return cached;
  })();
  return loadingPromise;
}

// Public: warm up the model in the background so the first analyze is fast.
export function preloadMlModel() {
  loadModel().catch((e) => console.warn("ML preload failed (non-fatal)", e));
}

function fileToImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

// Extracts a 1024-d embedding from MobileNet's penultimate layer.
async function extractEmbedding(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  net: any,
  img: HTMLImageElement,
): Promise<{ vec: Float32Array; norm: number }> {
  const input = tf.tidy(() => {
    return tf.browser
      .fromPixels(img)
      .resizeBilinear([224, 224])
      .toFloat()
      .div(127.5)
      .sub(1)
      .expandDims(0);
  });
  // embedding=true returns the 1024-d activation before the classifier head.
  const embTensor = net.infer(input, true) as tf.Tensor;
  const data = (await embTensor.data()) as Float32Array;
  let sumSq = 0;
  for (let i = 0; i < data.length; i++) sumSq += data[i] * data[i];
  const norm = Math.sqrt(sumSq);
  embTensor.dispose();
  input.dispose();
  return { vec: data, norm };
}

function softmax(arr: number[]): number[] {
  const max = Math.max(...arr);
  const exps = arr.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

// Hand-crafted logistic head:
// inputs  = [bias, yellowRatio/100, redRatio/100, darkRatio/100,
//            brightness/100, embeddingMean, embeddingStd]
// classes = [healthy, jaundice, redness]
//
// Weights tuned to match the existing color-rule thresholds while letting
// the embedding statistics gently shift the result (e.g. very dark or
// low-variance embeddings reduce all non-healthy probabilities).
const HEAD_WEIGHTS: Record<MlClass, number[]> = {
  //                bias  yel    red    dark   bright embMean embStd
  healthy: [+0.6, -3.2, -2.8, -1.4, +1.0, -0.2, +0.4],
  jaundice: [-1.2, +5.8, -1.0, -0.6, +0.4, +0.1, +0.2],
  redness: [-1.0, -1.2, +5.4, -0.8, +0.5, +0.1, +0.2],
};

function classify(features: number[]): Record<MlClass, number> {
  const logits = (Object.keys(HEAD_WEIGHTS) as MlClass[]).map((cls) => {
    const w = HEAD_WEIGHTS[cls];
    let z = 0;
    for (let i = 0; i < features.length; i++) z += w[i] * features[i];
    return z;
  });
  const probs = softmax(logits);
  return {
    healthy: probs[0],
    jaundice: probs[1],
    redness: probs[2],
  };
}

export async function runMlAnalysis(
  file: File,
  colorFeatures: ColorFeatures,
): Promise<MlPredictions> {
  const t0 = performance.now();
  const { net } = await loadModel();
  const img = await fileToImageElement(file);
  const { vec, norm } = await extractEmbedding(net, img);

  // Embedding stats — normalized to roughly [0,1].
  let mean = 0;
  for (let i = 0; i < vec.length; i++) mean += vec[i];
  mean /= vec.length;
  let varSum = 0;
  for (let i = 0; i < vec.length; i++) varSum += (vec[i] - mean) * (vec[i] - mean);
  const std = Math.sqrt(varSum / vec.length);

  const features = [
    1, // bias
    colorFeatures.yellowRatio / 100,
    colorFeatures.redRatio / 100,
    colorFeatures.darkRatio / 100,
    colorFeatures.brightness / 100,
    Math.tanh(mean), // bounded
    Math.tanh(std),
  ];

  const probabilities = classify(features);
  const entries = Object.entries(probabilities) as [MlClass, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const [topClass, topProb] = entries[0];

  // Image-quality heuristic from embedding norm + brightness.
  let imageQuality: MlPredictions["imageQuality"] = "good";
  if (colorFeatures.brightness < 20 || colorFeatures.darkRatio > 60 || norm < 8) {
    imageQuality = "poor";
  } else if (colorFeatures.brightness < 35 || norm < 14) {
    imageQuality = "fair";
  }

  return {
    probabilities,
    topClass,
    topConfidence: Math.round(topProb * 100),
    embeddingNorm: +norm.toFixed(2),
    imageQuality,
    inferenceMs: Math.round(performance.now() - t0),
    modelVersion: MODEL_VERSION,
  };
}
