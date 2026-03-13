-- Helper to centralize board access checks and avoid heavy recursive joins
CREATE OR REPLACE FUNCTION public.can_access_board(_board_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_board_owner(_board_id, _user_id)
      OR public.is_board_member(_board_id, _user_id)
$$;

CREATE OR REPLACE FUNCTION public.can_access_card(_card_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.board_cards bc
    WHERE bc.id = _card_id
      AND public.can_access_board(bc.board_id, _user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_checklist(_checklist_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.card_checklists cl
    JOIN public.board_cards bc ON bc.id = cl.card_id
    WHERE cl.id = _checklist_id
      AND public.can_access_board(bc.board_id, _user_id)
  )
$$;

-- boards children
DROP POLICY IF EXISTS "Board member accesses columns" ON public.board_columns;
CREATE POLICY "Board member accesses columns"
ON public.board_columns
FOR ALL
TO authenticated
USING (public.can_access_board(board_id, auth.uid()))
WITH CHECK (public.can_access_board(board_id, auth.uid()));

DROP POLICY IF EXISTS "Board member accesses cards" ON public.board_cards;
CREATE POLICY "Board member accesses cards"
ON public.board_cards
FOR ALL
TO authenticated
USING (public.can_access_board(board_id, auth.uid()))
WITH CHECK (public.can_access_board(board_id, auth.uid()));

DROP POLICY IF EXISTS "Board member accesses labels" ON public.card_labels;
CREATE POLICY "Board member accesses labels"
ON public.card_labels
FOR ALL
TO authenticated
USING (public.can_access_board(board_id, auth.uid()))
WITH CHECK (public.can_access_board(board_id, auth.uid()));

-- card-level tables
DROP POLICY IF EXISTS "Board member accesses attachments" ON public.card_attachments;
CREATE POLICY "Board member accesses attachments"
ON public.card_attachments
FOR ALL
TO authenticated
USING (public.can_access_card(card_id, auth.uid()))
WITH CHECK (public.can_access_card(card_id, auth.uid()));

DROP POLICY IF EXISTS "Board member accesses checklists" ON public.card_checklists;
CREATE POLICY "Board member accesses checklists"
ON public.card_checklists
FOR ALL
TO authenticated
USING (public.can_access_card(card_id, auth.uid()))
WITH CHECK (public.can_access_card(card_id, auth.uid()));

DROP POLICY IF EXISTS "Board member accesses comments" ON public.card_comments;
CREATE POLICY "Board member accesses comments"
ON public.card_comments
FOR ALL
TO authenticated
USING (public.can_access_card(card_id, auth.uid()))
WITH CHECK (public.can_access_card(card_id, auth.uid()));

DROP POLICY IF EXISTS "Board member accesses label assignments" ON public.card_label_assignments;
CREATE POLICY "Board member accesses label assignments"
ON public.card_label_assignments
FOR ALL
TO authenticated
USING (public.can_access_card(card_id, auth.uid()))
WITH CHECK (public.can_access_card(card_id, auth.uid()));

DROP POLICY IF EXISTS "Board member accesses card members" ON public.card_members;
CREATE POLICY "Board member accesses card members"
ON public.card_members
FOR ALL
TO authenticated
USING (public.can_access_card(card_id, auth.uid()))
WITH CHECK (public.can_access_card(card_id, auth.uid()));

DROP POLICY IF EXISTS "Board member accesses checklist items" ON public.checklist_items;
CREATE POLICY "Board member accesses checklist items"
ON public.checklist_items
FOR ALL
TO authenticated
USING (public.can_access_checklist(checklist_id, auth.uid()))
WITH CHECK (public.can_access_checklist(checklist_id, auth.uid()));