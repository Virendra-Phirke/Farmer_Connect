
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('farmer', 'buyer', 'equipment_owner');

-- User roles table (separate from profiles per security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (clerk_user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Public read so frontend can check role
CREATE POLICY "Anyone can view user roles" ON public.user_roles FOR SELECT USING (true);

-- Write handled via edge function with service role key

-- Remove role column from profiles (it's now in user_roles)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
