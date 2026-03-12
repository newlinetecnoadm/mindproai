
-- Fix infinite recursion on boards RLS policies
-- The issue: board_cards/board_columns policies check board_members which checks boards, creating recursion

-- Drop problematic policies on boards
DROP POLICY IF EXISTS "Member reads board" ON public.boards;
DROP POLICY IF EXISTS "Owner CRUD boards" ON public.boards;

-- Recreate without recursion - owner policy is simple, member policy uses direct check
CREATE POLICY "Owner CRUD boards" ON public.boards
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Member reads board" ON public.boards
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT bm.user_id FROM public.board_members bm WHERE bm.board_id = boards.id)
  );

-- Fix board_members policy to avoid recursion through boards
DROP POLICY IF EXISTS "Board owner manages members" ON public.board_members;
CREATE POLICY "Board owner manages members" ON public.board_members
  FOR ALL TO public
  USING (
    EXISTS (SELECT 1 FROM public.boards WHERE boards.id = board_members.board_id AND boards.user_id = auth.uid())
  );

-- Fix board_cards policy
DROP POLICY IF EXISTS "Board member accesses cards" ON public.board_cards;
CREATE POLICY "Board member accesses cards" ON public.board_cards
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_cards.board_id
      AND (b.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid()))
    )
  );

-- Fix board_columns policy
DROP POLICY IF EXISTS "Board member accesses columns" ON public.board_columns;
CREATE POLICY "Board member accesses columns" ON public.board_columns
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = board_columns.board_id
      AND (b.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid()))
    )
  );

-- Fix card_labels policy
DROP POLICY IF EXISTS "Board member accesses labels" ON public.card_labels;
CREATE POLICY "Board member accesses labels" ON public.card_labels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = card_labels.board_id
      AND (b.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.board_members bm WHERE bm.board_id = b.id AND bm.user_id = auth.uid()))
    )
  );
