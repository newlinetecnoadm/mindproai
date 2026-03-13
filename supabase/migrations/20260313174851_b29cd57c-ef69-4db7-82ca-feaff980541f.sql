
-- New notification preferences per module
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS notify_diagram_shared boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_diagram_commented boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_agenda_reminders boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_agenda_event_updated boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_board_card_assigned boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_board_checklist_done boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_board_label_changed boolean NOT NULL DEFAULT true;
