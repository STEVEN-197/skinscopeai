import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  Eye,
  Hand,
  Sparkles,
  Loader2,
  X,
  AlertTriangle,
  ArrowRight,
  Camera,
  RefreshCw,
  SwitchCamera,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { analyzeImageFile, applyRegionRules } from "@/lib/color-analysis";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/analyze")({
  head: () => ({ meta: [{ title: "New Analysis — SkinScope AI" }] }),
  component: AnalyzePage,
});

type Region = "eye" | "skin" | "palm";

const REGIONS: { id: Region; label: string; icon: typeof Eye; hint: string }[] = [
  { id: "eye", label: "Eye", icon: Eye, hint: "Sclera (white of the eye)" },
  { id: "skin", label: "Skin", icon: Sparkles, hint: "Face, arm, or affected area" },
  { id: "palm", label: "Palm", icon: Hand, hint: "Inside of the hand" },
];

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AnalyzePage() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [region, setRegion] = useState<Region>("skin");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [mode, setMode] = useState<"upload" | "camera">("upload");
  const [cameraOn, setCameraOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraStarting, setCameraStarting] = useState(false);

  const handleFileSelect = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Image is too large (max 8 MB).");
      return;
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  const startCamera = async (facing: "user" | "environment" = facingMode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera not supported in this browser.");
      return;
    }
    setCameraStarting(true);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Could not access camera";
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
        toast.error("Camera permission denied. Please allow camera access.");
      } else {
        toast.error(msg);
      }
    } finally {
      setCameraStarting(false);
    }
  };

  const switchFacing = async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    if (cameraOn) await startCamera(next);
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error("Camera not ready yet.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
    if (!blob) {
      toast.error("Capture failed.");
      return;
    }
    const captured = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    setFile(captured);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(captured));
    stopCamera();
  };

  // Auto-stop camera when leaving camera mode or unmounting
  useEffect(() => {
    if (mode !== "camera") stopCamera();
  }, [mode]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const reset = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const runAnalysis = async () => {
    if (!file || !user || !session) return;
    setAnalyzing(true);
    try {
      // 1. Color analysis (client-side)
      setStage("Extracting color features…");
      const colorFeatures = await analyzeImageFile(file);
      const ruleResult = applyRegionRules(region, colorFeatures);

      // 2. Upload image to private storage
      setStage("Uploading image securely…");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("skin-images")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

      // 3. Convert to data URL for AI vision
      setStage("Running AI vision analysis…");
      const imageBase64 = await fileToDataURL(file);

      // 4. Call edge function
      const { data: aiData, error: fnErr } = await supabase.functions.invoke("analyze-skin", {
        body: { imageBase64, region, colorFeatures, ruleResult },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (aiData?.error) throw new Error(aiData.error);

      // 5. Persist
      setStage("Saving report…");
      const { data: inserted, error: insErr } = await supabase
        .from("reports")
        .insert([
          {
            user_id: user.id,
            image_path: path,
            region,
            condition: aiData.condition,
            severity: aiData.severity,
            confidence: aiData.confidence,
            observations: aiData.observations,
            recommendation: aiData.recommendation,
            trend: aiData.trend_note ? `${aiData.trend}: ${aiData.trend_note}` : aiData.trend,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            color_features: colorFeatures as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ai_raw: aiData as any,
          },
        ])
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);

      toast.success("Analysis complete!");
      navigate({ to: "/dashboard/reports/$reportId", params: { reportId: inserted.id } });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
      setStage("");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className="text-sm font-medium text-primary">New analysis</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Upload an image to analyze
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          Choose the body region, upload a clear photo in good lighting, and get an AI-powered wellness report.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Upload card */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant md:p-6">
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium">Region</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {REGIONS.map((r) => {
                  const active = region === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRegion(r.id)}
                      disabled={analyzing}
                      className={cn(
                        "group flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all",
                        active
                          ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      <div
                        className={cn(
                          "grid h-10 w-10 place-items-center rounded-lg transition-colors",
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <r.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.label}</p>
                        <p className="text-[11px] text-muted-foreground">{r.hint}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Image</Label>
              {!previewUrl ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={analyzing}
                  className="mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-12 text-center transition-colors hover:border-primary/40 hover:bg-muted/50"
                >
                  <Upload className="h-7 w-7 text-primary" />
                  <p className="font-medium">Click to upload</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, or HEIC · Max 8 MB</p>
                </button>
              ) : (
                <div className="relative mt-2 overflow-hidden rounded-xl border border-border bg-muted">
                  {/* Image preview */}
                  <img
                    src={previewUrl}
                    alt="Upload preview"
                    className="max-h-[360px] w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={reset}
                    disabled={analyzing}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />
            </div>

            <Button
              onClick={runAnalysis}
              disabled={!file || analyzing}
              size="lg"
              className="w-full bg-gradient-hero text-primary-foreground shadow-elegant hover:opacity-95"
            >
              {analyzing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {stage || "Analyzing…"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  Run analysis <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Info side */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-gradient-card p-5 shadow-elegant md:p-6">
            <h3 className="font-display text-lg font-semibold">How it works</h3>
            <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span>
                <span>We extract RGB & HSV features from your image right in your browser.</span>
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
                <span>A vision model reviews the image with region-specific thresholds.</span>
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
                <span>Your past reports inform the trend (improving · stable · worsening).</span>
              </li>
            </ol>
          </div>

          <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning-foreground" />
            <div>
              <p className="font-medium text-foreground">Educational use only</p>
              <p className="mt-1 text-muted-foreground">
                SkinScope AI does not diagnose medical conditions. Always consult a healthcare professional for any concerning findings.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-display text-base font-semibold">Tips for best results</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li>• Use natural daylight, avoid yellow lamps</li>
              <li>• Keep the camera 15–25 cm from the area</li>
              <li>• Make sure the area fills most of the frame</li>
              <li>• Clean lens, steady hand, neutral background</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
