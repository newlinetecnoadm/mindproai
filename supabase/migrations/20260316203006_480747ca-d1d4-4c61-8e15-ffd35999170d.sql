-- Allow workspace members to access boards and their related data through can_access_board
CREATE OR REPLACE FUNCTION public.can_access_board(_board_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_board_owner(_board_id, _user_id)
      OR public.is_board_member(_board_id, _user_id)
      OR EXISTS (
        SELECT 1
        FROM public.boards b
        WHERE b.id = _board_id
          AND b.workspace_id IS NOT NULL
          AND public.can_access_workspace(b.workspace_id, _user_id)
      );
$$;

-- Make invitation visibility robust (case-insensitive email + jwt fallback)
DROP POLICY IF EXISTS "Recipient reads invitation" ON public.invitations;
CREATE POLICY "Recipient reads invitation"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() = invited_user_id
  OR lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  OR lower(invited_email) = lower(coalesce((
    SELECT up.email
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
  ), ''))
);

DROP POLICY IF EXISTS "Recipient updates invitation" ON public.invitations;
CREATE POLICY "Recipient updates invitation"
ON public.invitations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = invited_user_id
  OR lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  OR lower(invited_email) = lower(coalesce((
    SELECT up.email
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
  ), ''))
);

-- Let workspace members read boards inside shared workspaces
DROP POLICY IF EXISTS "Member reads board" ON public.boards;
CREATE POLICY "Member reads board"
ON public.boards
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_board_member(id, auth.uid())
  OR (workspace_id IS NOT NULL AND public.can_access_workspace(workspace_id, auth.uid()))
);