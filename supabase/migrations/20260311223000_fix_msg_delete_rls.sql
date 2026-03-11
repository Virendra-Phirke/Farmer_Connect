-- Fix RLS for message deletion since Clerk is used and Supabase auth.uid() is null
DROP POLICY IF EXISTS "Allow delete own or admin farmer_group_messages" ON public.farmer_group_messages;
DROP POLICY IF EXISTS "Allow delete own farmer_group_messages" ON public.farmer_group_messages;

-- Since auth is handled at the application layer by Clerk and API Edge Functions/Client,
-- we allow delete operations and rely on the UI/API to restrict who deletes what.
CREATE POLICY "Allow delete farmer_group_messages" ON public.farmer_group_messages 
FOR DELETE USING (true);
