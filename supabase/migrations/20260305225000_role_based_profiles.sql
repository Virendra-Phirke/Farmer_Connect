-- Create the inheritance tables for role-based profiles
-- These tables directly link 1-to-1 with the base "profiles" table

-- 1. Farmer Profiles
CREATE TABLE IF NOT EXISTS farmer_profiles (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    land_size_acres NUMERIC,
    soil_type TEXT,
    available_equipment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Equipment Owner Profiles
CREATE TABLE IF NOT EXISTS equipment_owner_profiles (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    available_equipment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Buyer Profiles (Hotels/Restaurants)
CREATE TABLE IF NOT EXISTS buyer_profiles (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles ENABLE ROW LEVEL SECURITY;

-- Create Policies (allow all for now to support Clerk anon key routing)
CREATE POLICY "Enable read access for all users" ON farmer_profiles FOR SELECT USING (true);
CREATE POLICY "Enable all access for all users" ON farmer_profiles FOR ALL USING (true);

CREATE POLICY "Enable read access for all users" ON equipment_owner_profiles FOR SELECT USING (true);
CREATE POLICY "Enable all access for all users" ON equipment_owner_profiles FOR ALL USING (true);

CREATE POLICY "Enable read access for all users" ON buyer_profiles FOR SELECT USING (true);
CREATE POLICY "Enable all access for all users" ON buyer_profiles FOR ALL USING (true);

-- Data Migration: Move existing role-specific data from 'profiles' into the new tables based on 'user_roles'
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT p.id, p.land_size_acres, p.soil_type, p.available_equipment, ur.role
        FROM profiles p
        JOIN user_roles ur ON p.clerk_user_id = ur.clerk_user_id
    LOOP
        IF rec.role = 'farmer' THEN
            INSERT INTO farmer_profiles (profile_id, land_size_acres, soil_type, available_equipment)
            VALUES (rec.id, rec.land_size_acres, rec.soil_type, rec.available_equipment)
            ON CONFLICT (profile_id) DO NOTHING;
        ELSIF rec.role = 'equipment_owner' THEN
            INSERT INTO equipment_owner_profiles (profile_id, available_equipment)
            VALUES (rec.id, rec.available_equipment)
            ON CONFLICT (profile_id) DO NOTHING;
        ELSIF rec.role = 'hotel_restaurant_manager' THEN
            INSERT INTO buyer_profiles (profile_id)
            VALUES (rec.id)
            ON CONFLICT (profile_id) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- Drop the old schema fields from the 'profiles' base table to enforce the new schema
ALTER TABLE profiles 
DROP COLUMN IF EXISTS land_size_acres,
DROP COLUMN IF EXISTS soil_type,
DROP COLUMN IF EXISTS available_equipment,
DROP COLUMN IF EXISTS latitude,
DROP COLUMN IF EXISTS longitude;
