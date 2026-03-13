
-- Allow admins to insert subscriptions (for manual plan assignment)
CREATE POLICY "Admins insert subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- Allow admins to delete subscriptions
CREATE POLICY "Admins delete subscriptions" ON public.subscriptions
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
