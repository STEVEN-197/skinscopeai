
-- Medical reports table: stores uploaded lab reports (PDF/image) or manual entries
CREATE TABLE public.medical_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'upload', -- 'upload' | 'manual'
  report_type TEXT, -- e.g. 'blood', 'lft', 'cbc', 'other'
  file_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  raw_text TEXT,
  extracted_values JSONB DEFAULT '{}'::jsonb, -- { bilirubin: {value, unit, ref_low, ref_high, flag}, ... }
  abnormalities JSONB DEFAULT '[]'::jsonb,    -- [{ name, value, severity, note }]
  summary TEXT,
  ai_analysis JSONB DEFAULT '{}'::jsonb,      -- { plain_language, comparison_note, trend }
  report_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own medical reports"
  ON public.medical_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own medical reports"
  ON public.medical_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own medical reports"
  ON public.medical_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own medical reports"
  ON public.medical_reports FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_medical_reports_updated_at
  BEFORE UPDATE ON public.medical_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_medical_reports_user_date ON public.medical_reports(user_id, created_at DESC);

-- Health insights cache: persisted AI-generated longitudinal insights
CREATE TABLE public.health_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary TEXT NOT NULL,
  observations JSONB DEFAULT '[]'::jsonb,     -- [{ title, detail, level }]
  trends JSONB DEFAULT '[]'::jsonb,           -- [{ metric, direction, note }]
  recommendations JSONB DEFAULT '[]'::jsonb,  -- [{ title, detail, category }]
  inputs_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own health insights"
  ON public.health_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own health insights"
  ON public.health_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own health insights"
  ON public.health_insights FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_health_insights_user_date ON public.health_insights(user_id, generated_at DESC);

-- Storage bucket for medical report files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-reports', 'medical-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own medical report files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'medical-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own medical report files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'medical-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own medical report files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'medical-reports' AND auth.uid()::text = (storage.foldername(name))[1]);
