
-- Symptom Diary table
CREATE TABLE public.symptom_diary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  itch INT NOT NULL DEFAULT 0 CHECK (itch >= 0 AND itch <= 10),
  pain INT NOT NULL DEFAULT 0 CHECK (pain >= 0 AND pain <= 10),
  redness INT NOT NULL DEFAULT 0 CHECK (redness >= 0 AND redness <= 10),
  dryness INT NOT NULL DEFAULT 0 CHECK (dryness >= 0 AND dryness <= 10),
  irritation INT NOT NULL DEFAULT 0 CHECK (irritation >= 0 AND irritation <= 10),
  swelling INT NOT NULL DEFAULT 0 CHECK (swelling >= 0 AND swelling <= 10),
  products_used TEXT[] DEFAULT '{}',
  triggers TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.symptom_diary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own diary" ON public.symptom_diary FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own diary" ON public.symptom_diary FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own diary" ON public.symptom_diary FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own diary" ON public.symptom_diary FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_symptom_diary_updated_at
  BEFORE UPDATE ON public.symptom_diary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Follow-up scan',
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed')),
  report_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reminders" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reminders" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reminders" ON public.reminders FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
