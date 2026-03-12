-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins can read all roles
CREATE POLICY "Admins read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage roles
CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can read own role
CREATE POLICY "Users read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin whitelist table for email-based fallback
CREATE TABLE public.admin_whitelist (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins read whitelist"
ON public.admin_whitelist
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to check admin by role OR whitelist
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.admin_whitelist aw
    JOIN public.user_profiles up ON up.email = aw.email
    WHERE up.user_id = _user_id
  )
$$;

-- Allow admins to read ALL user_profiles (for user management)
CREATE POLICY "Admins read all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to read ALL subscriptions
CREATE POLICY "Admins read all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to update subscriptions
CREATE POLICY "Admins update subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to manage subscription_plans
CREATE POLICY "Admins manage plans"
ON public.subscription_plans
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));