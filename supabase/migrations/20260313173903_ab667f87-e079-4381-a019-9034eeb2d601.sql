
-- Notifications table for in-app notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL, -- 'comment', 'mention', 'card_moved', 'member_added', 'due_soon'
  title text NOT NULL,
  body text,
  board_id uuid REFERENCES public.boards(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.board_cards(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Index for fast lookups
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, is_read, created_at DESC);
