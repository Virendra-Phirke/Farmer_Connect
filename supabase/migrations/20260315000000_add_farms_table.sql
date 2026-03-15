-- Create farms table to allow farmers to manage multiple farms
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    farm_name VARCHAR NOT NULL,
    state VARCHAR NOT NULL,
    district VARCHAR NOT NULL,
    taluka VARCHAR,
    village_city VARCHAR,
    survey_number VARCHAR,
    gat_number VARCHAR,
    land_size_acres NUMERIC,
    soil_type VARCHAR,
    farming_type VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read for all users" ON farms FOR SELECT USING (true);
CREATE POLICY "Enable all access for all users" ON farms FOR ALL USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS farms_profile_id_idx ON farms(profile_id);
CREATE INDEX IF NOT EXISTS farms_state_district_idx ON farms(state, district);
