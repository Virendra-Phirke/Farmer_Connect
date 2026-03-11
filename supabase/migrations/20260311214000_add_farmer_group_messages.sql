-- Create table for farmer group messages
CREATE TABLE IF NOT EXISTS public.farmer_group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.farmer_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.farmer_group_messages ENABLE ROW LEVEL SECURITY;

-- Add policies
-- Anyone can view messages (in application logic we secure it to members only or we can do it here if possible)
-- For simplicity and matching current structure, public read policy:
CREATE POLICY "Anyone can view farmer group messages" ON public.farmer_group_messages FOR SELECT USING (true);

-- Allow inserts
CREATE POLICY "Allow insert farmer_group_messages" ON public.farmer_group_messages FOR INSERT WITH CHECK (true);
