
-- We need to also add an RLS policy so profiles can be inserted by the user themselves (for first admin setup)
-- This is needed because when signUp creates a user, the profile must be insertable

-- Allow users to insert their own profile (needed for initial setup / self-registration flow)
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile  
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
