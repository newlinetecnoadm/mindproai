-- Allow board members to update the board (e.g. theme)
CREATE POLICY "Board member updates board"
ON public.boards
FOR UPDATE
TO authenticated
USING (can_access_board(id, auth.uid()))
WITH CHECK (can_access_board(id, auth.uid()));