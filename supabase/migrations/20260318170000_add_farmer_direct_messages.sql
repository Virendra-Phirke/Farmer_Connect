-- Direct farmer-to-farmer chat table (not group based)
CREATE TABLE IF NOT EXISTS public.farmer_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_farmer_direct_messages_sender ON public.farmer_direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_farmer_direct_messages_receiver ON public.farmer_direct_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_farmer_direct_messages_created_at ON public.farmer_direct_messages(created_at DESC);

ALTER TABLE public.farmer_direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select farmer_direct_messages" ON public.farmer_direct_messages;
DROP POLICY IF EXISTS "Allow insert farmer_direct_messages" ON public.farmer_direct_messages;
DROP POLICY IF EXISTS "Allow delete farmer_direct_messages" ON public.farmer_direct_messages;

-- Keep policy style aligned with existing project-wide permissive policies
CREATE POLICY "Allow select farmer_direct_messages"
ON public.farmer_direct_messages
FOR SELECT
USING (true);

CREATE POLICY "Allow insert farmer_direct_messages"
ON public.farmer_direct_messages
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow delete farmer_direct_messages"
ON public.farmer_direct_messages
FOR DELETE
USING (true);
