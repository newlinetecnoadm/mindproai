
-- Workspaces table
CREATE TABLE public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Meus Boards',
  is_default BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Workspace members
CREATE TABLE public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Add workspace_id to boards
ALTER TABLE public.boards ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Access requests for diagrams
CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL DEFAULT 'diagram',
  resource_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.can_access_workspace(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces WHERE id = _workspace_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(_workspace_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces WHERE id = _workspace_id AND user_id = _user_id
  )
$$;

-- RLS: Workspaces
CREATE POLICY "Owner CRUD workspaces" ON public.workspaces FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Member reads workspace" ON public.workspaces FOR SELECT
  TO authenticated USING (can_access_workspace(id, auth.uid()));

-- RLS: Workspace members
CREATE POLICY "Owner manages workspace members" ON public.workspace_members FOR ALL
  TO authenticated USING (is_workspace_owner(workspace_id, auth.uid()))
  WITH CHECK (is_workspace_owner(workspace_id, auth.uid()));

CREATE POLICY "Member sees own membership" ON public.workspace_members FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- RLS: Access requests
CREATE POLICY "Requester creates/reads own requests" ON public.access_requests FOR ALL
  TO authenticated USING (auth.uid() = requester_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Owner manages requests" ON public.access_requests FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id);
