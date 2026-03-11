-- Aligning with the Product Requirements Document (PRD)

-- 1. Add 'Farming Type' to farmer_profiles
ALTER TABLE farmer_profiles ADD COLUMN IF NOT EXISTS farming_type TEXT;

-- 2. Create 'hotel_crop_requirements' to allow Hotels to POST needs that Farmers fulfill
CREATE TABLE IF NOT EXISTS hotel_crop_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES buyer_profiles(profile_id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL,
    quantity_kg NUMERIC NOT NULL,
    required_by_date DATE,
    status TEXT DEFAULT 'open', -- 'open', 'fulfilled', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE hotel_crop_requirements ENABLE ROW LEVEL SECURITY;

-- Allow all users to read posted hotel requirements
CREATE POLICY "Enable read access for all users" ON hotel_crop_requirements FOR SELECT USING (true);

-- Allow all users to create/update (Supabase requests use Anon key here because Clerk handles auth)
CREATE POLICY "Enable insert for all users" ON hotel_crop_requirements FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON hotel_crop_requirements FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON hotel_crop_requirements FOR DELETE USING (true);
