-- Drop the existing restrictive policy and replace with one that allows authenticated users to read basic profile info
-- This is needed for invitation flows where we look up users by email
DROP POLICY IF EXISTS "Users read own profile" ON public.user_profiles;

CREATE POLICY "Authenticated users read profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);