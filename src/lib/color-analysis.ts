// Client-side color analysis using Canvas API.
// Mirrors the OpenCV RGB/HSV approach from the original spec.

export interface ColorFeatures {
  avgR: number;
  avgG: number;
  avgB: number;
  avgH: number; // 0-360
  avgS: number; // 0-100
  avgV: number; // 0-100
  yellowRatio: number; // % pixels in yellow hue range
  redRatio: number; // % pixels in red hue range
  darkRatio: number; // % low-value pixels
  brightness: number; // 0-100
  blurScore: number;
  colorCastScore: number;
  tooDark: boolean;
  tooBright: boolean;
  blurry: boolean;
  extremeColorCast: boolean;
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, v * 100];
}

export async function analyzeImageFile(file: File): Promise<ColorFeatures> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return analyzeImageElement(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function analyzeImageElement(img: HTMLImageElement): ColorFeatures {
  // Downscale to keep analysis fast and consistent
  const maxDim = 256;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.floor(img.width * scale));
  const h = Math.max(1, Math.floor(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  let sumR = 0,
    sumG = 0,
    sumB = 0;
  let sumH = 0,
    sumS = 0,
    sumV = 0;
  let yellow = 0,
    red = 0,
    dark = 0;
  let count = 0;
  let edgeEnergy = 0;
  let edgeCount = 0;

  const luminance = new Float32Array(w * h);

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    sumR += r;
    sumG += g;
    sumB += b;
    const [hh, ss, vv] = rgbToHsv(r, g, b);
    sumH += hh;
    sumS += ss;
    sumV += vv;

    // Yellow hue: 35-70, with reasonable saturation/value
    if (hh >= 35 && hh <= 70 && ss >= 25 && vv >= 30) yellow++;
    // Red hue: wraps near 0/360
    if ((hh <= 15 || hh >= 345) && ss >= 30 && vv >= 25) red++;
    if (vv < 20) dark++;
    luminance[pixelIndex] = 0.299 * r + 0.587 * g + 0.114 * b;
    count++;
  }

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const idx = y * w + x;
      const dx = Math.abs(luminance[idx] - luminance[idx + 1]);
      const dy = Math.abs(luminance[idx] - luminance[idx + w]);
      edgeEnergy += dx + dy;
      edgeCount += 2;
    }
  }

  const avgR = +(sumR / count).toFixed(2);
  const avgG = +(sumG / count).toFixed(2);
  const avgB = +(sumB / count).toFixed(2);
  const brightness = +(sumV / count).toFixed(2);
  const blurScore = +(edgeEnergy / Math.max(1, edgeCount)).toFixed(2);
  const channelMean = (avgR + avgG + avgB) / 3;
  const colorCastScore = +(
    (Math.abs(avgR - channelMean) + Math.abs(avgG - channelMean) + Math.abs(avgB - channelMean)) /
    3
  ).toFixed(2);
  const tooDark = brightness < 22 || (dark / count) * 100 > 55;
  const tooBright = brightness > 92;
  const blurry = blurScore < 14;
  const extremeColorCast = colorCastScore > 36;

  return {
    avgR,
    avgG,
    avgB,
    avgH: +(sumH / count).toFixed(2),
    avgS: +(sumS / count).toFixed(2),
    avgV: +(sumV / count).toFixed(2),
    yellowRatio: +((yellow / count) * 100).toFixed(2),
    redRatio: +((red / count) * 100).toFixed(2),
    darkRatio: +((dark / count) * 100).toFixed(2),
    brightness,
    blurScore,
    colorCastScore,
    tooDark,
    tooBright,
    blurry,
    extremeColorCast,
  };
}

// Region-based threshold logic mirrors the original spec
export interface RuleResult {
  condition: string;
  severity: "none" | "mild" | "moderate" | "severe";
  ruleConfidence: number;
}

export function applyRegionRules(region: "eye" | "skin" | "palm", f: ColorFeatures): RuleResult {
  // Thresholds tuned per region
  const yellowThresh =
    region === "eye"
      ? { mild: 8, moderate: 18, severe: 30 }
      : region === "palm"
        ? { mild: 12, moderate: 25, severe: 40 }
        : { mild: 15, moderate: 28, severe: 45 };

  const redThresh = { mild: 20, moderate: 35, severe: 55 };

  const y = f.yellowRatio;
  const r = f.redRatio;

  let condition = "normal";
  let severity: RuleResult["severity"] = "none";
  let ruleConfidence = 60;

  if (y >= yellowThresh.severe) {
    condition = "jaundice_possible";
    severity = "severe";
    ruleConfidence = 88;
  } else if (y >= yellowThresh.moderate) {
    condition = "jaundice_possible";
    severity = "moderate";
    ruleConfidence = 78;
  } else if (y >= yellowThresh.mild) {
    condition = "jaundice_possible";
    severity = "mild";
    ruleConfidence = 68;
  } else if (r >= redThresh.severe || r >= redThresh.moderate || r >= redThresh.mild) {
    condition = "unclear";
    severity = r >= redThresh.severe ? "severe" : r >= redThresh.moderate ? "moderate" : "mild";
    ruleConfidence = r >= redThresh.severe ? 70 : r >= redThresh.moderate ? 62 : 55;
  }

  return { condition, severity, ruleConfidence };
}
