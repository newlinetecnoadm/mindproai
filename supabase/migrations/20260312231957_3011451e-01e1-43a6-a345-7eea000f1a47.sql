-- ============================================================
-- 001: User Profiles
-- ============================================================
CREATE TABLE public.user_profiles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT,
  avatar_url  TEXT,
  onboarding_done BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 002: Plans & Subscriptions
-- ============================================================
CREATE TABLE public.subscription_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  price_brl       NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  features        JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.subscription_plans (name, display_name, price_brl, features) VALUES
('free', 'Gratuito', 0.00, '{"max_diagrams": 3, "max_boards": 2, "max_collaborators": 0, "export_pdf": false, "export_png": true, "ai_suggestions": false, "templates": ["basic"], "trial_days": 14}'),
('pro', 'Pro', 29.90, '{"max_diagrams": -1, "max_boards": -1, "max_collaborators": 5, "export_pdf": true, "export_png": true, "ai_suggestions": true, "templates": ["all"], "trial_days": 0}'),
('business', 'Business', 79.90, '{"max_diagrams": -1, "max_boards": -1, "max_collaborators": -1, "export_pdf": true, "export_png": true, "ai_suggestions": true, "templates": ["all"], "priority_support": true, "trial_days": 0}');

CREATE TABLE public.subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id                 UUID NOT NULL REFERENCES public.subscription_plans(id),
  status                  TEXT NOT NULL DEFAULT 'trialing',
  trial_ends_at           TIMESTAMPTZ,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  stripe_price_id         TEXT,
  canceled_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE name = 'free';
  INSERT INTO public.subscriptions (user_id, plan_id, status, trial_ends_at)
  VALUES (NEW.user_id, free_plan_id, 'trialing', NOW() + INTERVAL '14 days');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_subscription();

-- ============================================================
-- 003: Diagrams
-- ============================================================
CREATE TYPE public.diagram_type AS ENUM (
  'mindmap', 'flowchart', 'orgchart', 'timeline',
  'concept_map', 'swimlane', 'wireframe'
);

CREATE TABLE public.diagrams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Sem título',
  type        public.diagram_type NOT NULL DEFAULT 'mindmap',
  thumbnail   TEXT,
  data        JSONB NOT NULL DEFAULT '{"nodes": [], "edges": [], "viewport": {}}',
  theme       TEXT DEFAULT 'default',
  template_id TEXT,
  is_public   BOOLEAN DEFAULT FALSE,
  public_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  version     INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_diagrams_user_id ON public.diagrams(user_id);
CREATE INDEX idx_diagrams_updated ON public.diagrams(updated_at DESC);

CREATE TABLE public.diagram_collaborators (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id  UUID NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'viewer',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(diagram_id, user_id)
);

-- ============================================================
-- 004: Boards
-- ============================================================
CREATE TABLE public.boards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Novo Board',
  description TEXT,
  cover_color TEXT DEFAULT '#1e293b',
  cover_image TEXT,
  is_starred  BOOLEAN DEFAULT FALSE,
  is_closed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.board_columns (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.board_cards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id     UUID NOT NULL REFERENCES public.board_columns(id) ON DELETE CASCADE,
  board_id      UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  cover_color   TEXT,
  cover_image   TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  due_date      TIMESTAMPTZ,
  is_complete   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.card_labels (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name     TEXT,
  color    TEXT NOT NULL
);

CREATE TABLE public.card_label_assignments (
  card_id  UUID NOT NULL REFERENCES public.board_cards(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.card_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

CREATE TABLE public.card_checklists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID NOT NULL REFERENCES public.board_cards(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Checklist',
  position   INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.checklist_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.card_checklists(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  is_checked   BOOLEAN DEFAULT FALSE,
  position     INTEGER DEFAULT 0,
  due_date     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.card_attachments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID NOT NULL REFERENCES public.board_cards(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  mime_type  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.card_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID NOT NULL REFERENCES public.board_cards(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.card_members (
  card_id UUID NOT NULL REFERENCES public.board_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);

CREATE TABLE public.board_members (
  board_id   UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (board_id, user_id)
);

CREATE INDEX idx_board_columns_board ON public.board_columns(board_id, position);
CREATE INDEX idx_board_cards_column  ON public.board_cards(column_id, position);
CREATE INDEX idx_card_comments_card  ON public.card_comments(card_id, created_at DESC);

-- ============================================================
-- 005: Events (Agenda)
-- ============================================================
CREATE TABLE public.events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  all_day     BOOLEAN DEFAULT FALSE,
  color       TEXT DEFAULT '#6366f1',
  card_id     UUID REFERENCES public.board_cards(id) ON DELETE SET NULL,
  diagram_id  UUID REFERENCES public.diagrams(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_user_range ON public.events(user_id, start_at, end_at);

-- ============================================================
-- 006: Invitations
-- ============================================================
CREATE TABLE public.invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email   TEXT NOT NULL,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resource_type   TEXT NOT NULL,
  resource_id     UUID NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member',
  status          TEXT NOT NULL DEFAULT 'pending',
  token           TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_email  ON public.invitations(invited_email, status);
CREATE INDEX idx_invitations_token  ON public.invitations(token);
CREATE INDEX idx_invitations_sender ON public.invitations(invited_by);

-- ============================================================
-- 007: RLS Policies
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are public" ON public.subscription_plans FOR SELECT USING (TRUE);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.diagrams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner CRUD diagrams" ON public.diagrams FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Collaborator reads diagram" ON public.diagrams FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.diagram_collaborators WHERE diagram_id = diagrams.id AND user_id = auth.uid())
);
CREATE POLICY "Collaborator editor updates diagram" ON public.diagrams FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.diagram_collaborators WHERE diagram_id = diagrams.id AND user_id = auth.uid() AND role = 'editor')
);
CREATE POLICY "Public diagrams are visible" ON public.diagrams FOR SELECT USING (is_public = TRUE);

ALTER TABLE public.diagram_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Diagram owner manages collaborators" ON public.diagram_collaborators FOR ALL USING (
  EXISTS (SELECT 1 FROM public.diagrams WHERE id = diagram_id AND user_id = auth.uid())
);
CREATE POLICY "Collaborator sees own entry" ON public.diagram_collaborators FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner CRUD boards" ON public.boards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Member reads board" ON public.boards FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.board_members WHERE board_id = boards.id AND user_id = auth.uid())
);

ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board member accesses columns" ON public.board_columns FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.boards b
    LEFT JOIN public.board_members bm ON bm.board_id = b.id AND bm.user_id = auth.uid()
    WHERE b.id = board_id AND (b.user_id = auth.uid() OR bm.user_id IS NOT NULL)
  )
);

ALTER TABLE public.board_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board member accesses cards" ON public.board_cards FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.boards b
    LEFT JOIN public.board_members bm ON bm.board_id = b.id AND bm.user_id = auth.uid()
    WHERE b.id = board_id AND (b.user_id = auth.uid() OR bm.user_id IS NOT NULL)
  )
);

ALTER TABLE public.card_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board member accesses labels" ON public.card_labels FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.boards b
    LEFT JOIN public.board_members bm ON bm.board_id = b.id AND bm.user_id = auth.uid()
    WHERE b.id = board_id AND (b.user_id = auth.uid() OR bm.user_id IS NOT NULL)
  )
);

ALTER TABLE public.card_label_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board member accesses label assignments" ON public.card_label_assignments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.board_cards bc
    JOIN public.boards b ON b.id = bc.board_id
    LEFT JOIN public.board_members bm ON bm.board_id = b.id AND bm.user_id = auth.uid()
    WHERE bc.id = card_id AND (b.user_id = auth.uid() OR bm.user_id IS NOT NULL)
  )
);

ALTER TABLE public.card_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board member accesses checklists" ON public.card_checklists FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.board_cards bc
    JOIN public.boards b ON b.id = bc.board_id
    LEFT JOIN public.board_members bm ON bm.board_id = b.id AND bm.user_id = auth.uid()
    WHERE bc.id = card_id AND (b.user_id = auth.uid() OR bm.user_id IS NOT NULL)
  )
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board member accesses checklist items" ON public.checklist_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.card_checklists cl
    JOIN public.board_cards bc ON bc.id = cl.card_id
    JOIN public.boards b ON b.id = bc.board_id
    LEFT JOIN public.board_members bm ON bm.board_id = b.id AND bm.user_id = auth.uid()
    WHERE cl.id = checklist_id AND (b.user_id = auth.uid() OR bm.user_id IS NOT NULL)
  )
);

ALTER TABLE public.card_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board member accesses attachments" ON public.card_attachments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.board_cards bc
    JOIN public.boards b ON b.id = bc.board_id
    LEFT JOIN public.board_members bm ON bm.board_id = b.id AND bm.user_id = auth.uid()
    WHERE bc.id = card_id AND (b.user_id = auth.uid() OR bm.user_id IS NOT NULL)
  )
);

ALTER TABLE public.card_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board member accesses comments" ON public.card_comments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.board_cards bc
    JOIN public.boards b ON b.id = bc.board_id
    LEFT JOIN public.board_members bm ON bm.board_id = b.id AND bm.user_id = auth.uid()
    WHERE bc.id = card_id AND (b.user_id = auth.uid() OR bm.user_id IS NOT NULL)
  )
);

ALTER TABLE public.card_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board member accesses card members" ON public.card_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.board_cards bc
    JOIN public.boards b ON b.id = bc.board_id
    LEFT JOIN public.board_members bm ON bm.board_id = b.id AND bm.user_id = auth.uid()
    WHERE bc.id = card_id AND (b.user_id = auth.uid() OR bm.user_id IS NOT NULL)
  )
);

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Board owner manages members" ON public.board_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.boards WHERE id = board_id AND user_id = auth.uid())
);
CREATE POLICY "Member sees own membership" ON public.board_members FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own events" ON public.events FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sender manages invitations" ON public.invitations FOR ALL USING (auth.uid() = invited_by);
CREATE POLICY "Recipient reads invitation" ON public.invitations FOR SELECT USING (
  auth.uid() = invited_user_id OR
  invited_email = (SELECT email FROM public.user_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Recipient updates invitation" ON public.invitations FOR UPDATE USING (
  auth.uid() = invited_user_id OR
  invited_email = (SELECT email FROM public.user_profiles WHERE user_id = auth.uid())
);

-- ============================================================
-- Updated_at trigger function (reusable)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_diagrams_updated_at BEFORE UPDATE ON public.diagrams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_board_cards_updated_at BEFORE UPDATE ON public.board_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_card_comments_updated_at BEFORE UPDATE ON public.card_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();