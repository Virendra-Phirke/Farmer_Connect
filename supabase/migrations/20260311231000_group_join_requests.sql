-- Create the farmer_group_requests table
CREATE TABLE IF NOT EXISTS public.farmer_group_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.farmer_groups(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, profile_id)
);

-- Note: RLS is bypassed in edge functions or client setup since Clerk handles Auth
-- But if using Supabase standard, we'll allow all for now.
ALTER TABLE public.farmer_group_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on farmer_group_requests" 
ON public.farmer_group_requests
FOR ALL 
USING (true)
WITH CHECK (true);
