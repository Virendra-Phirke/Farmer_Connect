-- Add landmark field for user profile address details
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS landmark VARCHAR;

CREATE INDEX IF NOT EXISTS profiles_landmark_idx ON public.profiles(landmark);
