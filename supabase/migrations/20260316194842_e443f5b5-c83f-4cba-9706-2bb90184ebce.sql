
-- boards.workspace_id -> workspaces.id CASCADE
ALTER TABLE public.boards DROP CONSTRAINT IF EXISTS boards_workspace_id_fkey;
ALTER TABLE public.boards ADD CONSTRAINT boards_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- board_columns.board_id -> boards.id CASCADE
ALTER TABLE public.board_columns DROP CONSTRAINT IF EXISTS board_columns_board_id_fkey;
ALTER TABLE public.board_columns ADD CONSTRAINT board_columns_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;

-- board_cards.board_id -> boards.id CASCADE
ALTER TABLE public.board_cards DROP CONSTRAINT IF EXISTS board_cards_board_id_fkey;
ALTER TABLE public.board_cards ADD CONSTRAINT board_cards_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;

-- board_cards.column_id -> board_columns.id CASCADE
ALTER TABLE public.board_cards DROP CONSTRAINT IF EXISTS board_cards_column_id_fkey;
ALTER TABLE public.board_cards ADD CONSTRAINT board_cards_column_id_fkey FOREIGN KEY (column_id) REFERENCES public.board_columns(id) ON DELETE CASCADE;

-- board_members.board_id -> boards.id CASCADE
ALTER TABLE public.board_members DROP CONSTRAINT IF EXISTS board_members_board_id_fkey;
ALTER TABLE public.board_members ADD CONSTRAINT board_members_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;

-- card_labels.board_id -> boards.id CASCADE
ALTER TABLE public.card_labels DROP CONSTRAINT IF EXISTS card_labels_board_id_fkey;
ALTER TABLE public.card_labels ADD CONSTRAINT card_labels_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE;

-- card_activities.card_id -> board_cards.id CASCADE
ALTER TABLE public.card_activities DROP CONSTRAINT IF EXISTS card_activities_card_id_fkey;
ALTER TABLE public.card_activities ADD CONSTRAINT card_activities_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.board_cards(id) ON DELETE CASCADE;

-- card_attachments.card_id -> board_cards.id CASCADE
ALTER TABLE public.card_attachments DROP CONSTRAINT IF EXISTS card_attachments_card_id_fkey;
ALTER TABLE public.card_attachments ADD CONSTRAINT card_attachments_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.board_cards(id) ON DELETE CASCADE;

-- card_checklists.card_id -> board_cards.id CASCADE
ALTER TABLE public.card_checklists DROP CONSTRAINT IF EXISTS card_checklists_card_id_fkey;
ALTER TABLE public.card_checklists ADD CONSTRAINT card_checklists_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.board_cards(id) ON DELETE CASCADE;

-- card_comments.card_id -> board_cards.id CASCADE
ALTER TABLE public.card_comments DROP CONSTRAINT IF EXISTS card_comments_card_id_fkey;
ALTER TABLE public.card_comments ADD CONSTRAINT card_comments_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.board_cards(id) ON DELETE CASCADE;

-- card_label_assignments.card_id -> board_cards.id CASCADE
ALTER TABLE public.card_label_assignments DROP CONSTRAINT IF EXISTS card_label_assignments_card_id_fkey;
ALTER TABLE public.card_label_assignments ADD CONSTRAINT card_label_assignments_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.board_cards(id) ON DELETE CASCADE;

-- card_label_assignments.label_id -> card_labels.id CASCADE
ALTER TABLE public.card_label_assignments DROP CONSTRAINT IF EXISTS card_label_assignments_label_id_fkey;
ALTER TABLE public.card_label_assignments ADD CONSTRAINT card_label_assignments_label_id_fkey FOREIGN KEY (label_id) REFERENCES public.card_labels(id) ON DELETE CASCADE;

-- card_members.card_id -> board_cards.id CASCADE
ALTER TABLE public.card_members DROP CONSTRAINT IF EXISTS card_members_card_id_fkey;
ALTER TABLE public.card_members ADD CONSTRAINT card_members_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.board_cards(id) ON DELETE CASCADE;

-- card_reminders.card_id -> board_cards.id CASCADE
ALTER TABLE public.card_reminders DROP CONSTRAINT IF EXISTS card_reminders_card_id_fkey;
ALTER TABLE public.card_reminders ADD CONSTRAINT card_reminders_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.board_cards(id) ON DELETE CASCADE;

-- checklist_items.checklist_id -> card_checklists.id CASCADE
ALTER TABLE public.checklist_items DROP CONSTRAINT IF EXISTS checklist_items_checklist_id_fkey;
ALTER TABLE public.checklist_items ADD CONSTRAINT checklist_items_checklist_id_fkey FOREIGN KEY (checklist_id) REFERENCES public.card_checklists(id) ON DELETE CASCADE;

-- workspace_members.workspace_id -> workspaces.id CASCADE
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_workspace_id_fkey;
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- events referencing cards/diagrams
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_card_id_fkey;
ALTER TABLE public.events ADD CONSTRAINT events_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.board_cards(id) ON DELETE SET NULL;
