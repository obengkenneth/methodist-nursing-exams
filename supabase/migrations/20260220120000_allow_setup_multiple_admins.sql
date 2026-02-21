-- Allow the setup page to create multiple admin accounts.
-- Replace the "first user only" policy with one that lets any new user assign themselves
-- the admin role (used when signing up via /setup with the setup key).
DROP POLICY IF EXISTS "Allow first user to assign own role during setup" ON public.user_roles;

CREATE POLICY "Allow setup page to assign admin role" ON public.user_roles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'admin'::public.app_role
  );

COMMENT ON POLICY "Allow setup page to assign admin role" ON public.user_roles IS
  'Allows users who sign up via /setup (with setup key) to assign themselves the admin role. Multiple admins can be created this way.';
