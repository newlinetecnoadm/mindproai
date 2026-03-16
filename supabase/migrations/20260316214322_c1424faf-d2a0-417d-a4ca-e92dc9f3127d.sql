
-- Create diagram_workspaces table
CREATE TABLE public.diagram_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Meus Diagramas',
  is_default BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique index: one default per user
CREATE UNIQUE INDEX idx_diagram_workspaces_default_per_user 
  ON public.diagram_workspaces (user_id) WHERE is_default = true;

-- Add workspace_id to diagrams
ALTER TABLE public.diagrams ADD COLUMN diagram_workspace_id UUID REFERENCES public.diagram_workspaces(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.diagram_workspaces ENABLE ROW LEVEL SECURITY;

-- Owner full CRUD
CREATE POLICY "Owner CRUD diagram_workspaces" ON public.diagram_workspaces
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.diagram_workspaces;
