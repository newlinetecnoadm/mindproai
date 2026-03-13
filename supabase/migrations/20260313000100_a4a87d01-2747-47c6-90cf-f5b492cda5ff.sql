
-- Fix infinite recursion on boards <-> board_members
-- Drop the recursive policy on board_members
DROP POLICY IF EXISTS "Board owner manages members" ON public.board_members;

-- Recreate using a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_board_owner(_board_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.boards
    WHERE id = _board_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_diagram_owner(_diagram_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.diagrams
    WHERE id = _diagram_id AND user_id = _user_id
  )
$$;

-- Recreate board_members policy using security definer function
CREATE POLICY "Board owner manages members"
ON public.board_members
FOR ALL
TO authenticated
USING (public.is_board_owner(board_id, auth.uid()))
WITH CHECK (public.is_board_owner(board_id, auth.uid()));

-- Fix infinite recursion on diagrams <-> diagram_collaborators
DROP POLICY IF EXISTS "Diagram owner manages collaborators" ON public.diagram_collaborators;

CREATE POLICY "Diagram owner manages collaborators"
ON public.diagram_collaborators
FOR ALL
TO authenticated
USING (public.is_diagram_owner(diagram_id, auth.uid()))
WITH CHECK (public.is_diagram_owner(diagram_id, auth.uid()));

-- Also fix the boards SELECT policy that queries board_members (which queries boards back)
DROP POLICY IF EXISTS "Member reads board" ON public.boards;

CREATE OR REPLACE FUNCTION public.is_board_member(_board_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = _board_id AND user_id = _user_id
  )
$$;

CREATE POLICY "Member reads board"
ON public.boards
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_board_member(id, auth.uid()));

-- Fix diagram collaborator SELECT policy similarly
DROP POLICY IF EXISTS "Collaborator reads diagram" ON public.diagrams;

CREATE OR REPLACE FUNCTION public.is_diagram_collaborator(_diagram_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.diagram_collaborators
    WHERE diagram_id = _diagram_id AND user_id = _user_id
  )
$$;

CREATE POLICY "Collaborator reads diagram"
ON public.diagrams
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_public = true OR public.is_diagram_collaborator(id, auth.uid()));

-- Also fix the collaborator editor update policy
DROP POLICY IF EXISTS "Collaborator editor updates diagram" ON public.diagrams;

CREATE OR REPLACE FUNCTION public.is_diagram_editor(_diagram_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.diagram_collaborators
    WHERE diagram_id = _diagram_id AND user_id = _user_id AND role = 'editor'
  )
$$;

CREATE POLICY "Collaborator editor updates diagram"
ON public.diagrams
FOR UPDATE
TO authenticated
USING (public.is_diagram_editor(id, auth.uid()));

-- Drop the old public diagrams policy since it's now merged into "Collaborator reads diagram"
DROP POLICY IF EXISTS "Public diagrams are visible" ON public.diagrams;
