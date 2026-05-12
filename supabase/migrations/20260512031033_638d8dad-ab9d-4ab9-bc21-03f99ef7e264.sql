
-- Family members
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  relation TEXT,
  date_of_birth DATE,
  notes TEXT,
  avatar_color TEXT DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fm select own" ON public.family_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fm insert own" ON public.family_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fm update own" ON public.family_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fm delete own" ON public.family_members FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER fm_updated BEFORE UPDATE ON public.family_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  specialist_type TEXT NOT NULL,
  doctor_name TEXT,
  clinic TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appt select own" ON public.appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "appt insert own" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appt update own" ON public.appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "appt delete own" ON public.appointments FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER appt_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lifestyle logs
CREATE TABLE public.lifestyle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours NUMERIC,
  water_glasses INTEGER,
  stress_level INTEGER,
  exercise_minutes INTEGER,
  diet_quality INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);
ALTER TABLE public.lifestyle_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ll select own" ON public.lifestyle_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ll insert own" ON public.lifestyle_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ll update own" ON public.lifestyle_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ll delete own" ON public.lifestyle_logs FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER ll_updated BEFORE UPDATE ON public.lifestyle_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Chat conversations
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc select own" ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cc insert own" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cc update own" ON public.chat_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cc delete own" ON public.chat_conversations FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER cc_updated BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm select own" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cm insert own" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cm delete own" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX chat_messages_conv_idx ON public.chat_messages(conversation_id, created_at);

-- Prescriptions
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
  file_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  raw_text TEXT,
  medicines JSONB DEFAULT '[]'::jsonb,
  ai_explanation TEXT,
  prescribed_date DATE,
  doctor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rx select own" ON public.prescriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rx insert own" ON public.prescriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rx update own" ON public.prescriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rx delete own" ON public.prescriptions FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER rx_updated BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add family_member_id to existing reports/medical_reports for family tracking
ALTER TABLE public.reports ADD COLUMN family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL;
ALTER TABLE public.medical_reports ADD COLUMN family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL;

-- Storage bucket for prescriptions
INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions', 'prescriptions', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "rx storage select own" ON storage.objects FOR SELECT
  USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "rx storage insert own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "rx storage delete own" ON storage.objects FOR DELETE
  USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);
