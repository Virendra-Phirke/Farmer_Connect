-- Add detailed location fields to farmer_groups
ALTER TABLE public.farmer_groups
ADD COLUMN state VARCHAR,
ADD COLUMN district VARCHAR,
ADD COLUMN taluka VARCHAR;

-- Add RLS policy to allow users to delete their own messages
CREATE POLICY "Allow delete own farmer_group_messages" ON public.farmer_group_messages 
FOR DELETE USING (auth.uid() = sender_id);
