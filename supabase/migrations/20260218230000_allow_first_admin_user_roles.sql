-- Allow the first user to insert their own role (bootstrap for /setup).
-- Once user_roles has any row, only admins can insert/update/delete (existing policy).
CREATE POLICY "Allow first user to assign own role during setup" ON public.user_roles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.user_roles)
  );
