-- Add village field to farmer_groups
ALTER TABLE public.farmer_groups
ADD COLUMN IF NOT EXISTS village VARCHAR;

-- Update RLS policy to allow users to delete their own messages OR allow the group creator to delete ANY message
DROP POLICY IF EXISTS "Allow delete own farmer_group_messages" ON public.farmer_group_messages;

CREATE POLICY "Allow delete own or admin farmer_group_messages" ON public.farmer_group_messages 
FOR DELETE USING (
  auth.uid() = sender_id 
  OR 
  auth.uid() IN (
    SELECT created_by 
    FROM public.farmer_groups 
    WHERE id = group_id
  )
);
