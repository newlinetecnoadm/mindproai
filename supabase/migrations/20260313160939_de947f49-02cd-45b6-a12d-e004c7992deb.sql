
CREATE TABLE public.card_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.board_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_activities_card_id ON public.card_activities(card_id);
CREATE INDEX idx_card_activities_created_at ON public.card_activities(created_at DESC);

ALTER TABLE public.card_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board member accesses activities"
ON public.card_activities
FOR ALL
TO authenticated
USING (can_access_card(card_id, auth.uid()))
WITH CHECK (can_access_card(card_id, auth.uid()));
