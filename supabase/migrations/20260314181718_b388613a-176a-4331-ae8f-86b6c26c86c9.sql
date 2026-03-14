CREATE TABLE public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'lovable',
  api_key_encrypted text,
  model text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins manage ai_settings"
  ON public.ai_settings FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "All authenticated read ai_settings"
  ON public.ai_settings FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.ai_settings (provider, is_active, model)
VALUES ('lovable', true, 'google/gemini-3-flash-preview');