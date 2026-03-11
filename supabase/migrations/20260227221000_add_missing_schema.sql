/*
  # Add Missing Schema for Foamer's Connect

  1. Enum Changes
    - Add 'hotel_restaurant_manager' to app_role enum

  2. Column Additions
    - profiles: available_equipment
    - crop_listings: expected_harvest_date, location
    - crop_recommendations: location
    - farmer_groups: crop_type

  3. New Tables
    - equipment_bookings: rental booking system
    - purchase_requests: buyer purchase requests
    - supply_contracts: long-term supply agreements

  4. RLS Policies
    - Public SELECT on all new tables
    - Writes via service role key (Clerk auth)
*/

-- 1. Add hotel_restaurant_manager to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hotel_restaurant_manager';

-- 2. Column additions to existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS available_equipment TEXT;

ALTER TABLE public.crop_listings ADD COLUMN IF NOT EXISTS expected_harvest_date DATE;
ALTER TABLE public.crop_listings ADD COLUMN IF NOT EXISTS location TEXT;

ALTER TABLE public.crop_recommendations ADD COLUMN IF NOT EXISTS location TEXT;

ALTER TABLE public.farmer_groups ADD COLUMN IF NOT EXISTS crop_type TEXT;

-- 3. Equipment Bookings table
CREATE TABLE IF NOT EXISTS public.equipment_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment_listings(id) ON DELETE CASCADE,
  renter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  total_price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Purchase Requests table
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_listing_id UUID NOT NULL REFERENCES public.crop_listings(id) ON DELETE CASCADE,
  quantity_kg NUMERIC NOT NULL,
  offered_price NUMERIC NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  request_type TEXT NOT NULL DEFAULT 'single' CHECK (request_type IN ('single', 'bulk', 'contract')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Supply Contracts table
CREATE TABLE IF NOT EXISTS public.supply_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  quantity_kg_per_delivery NUMERIC NOT NULL,
  delivery_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (delivery_frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Enable RLS on new tables
ALTER TABLE public.equipment_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_contracts ENABLE ROW LEVEL SECURITY;

-- 7. Public SELECT policies
CREATE POLICY "Anyone can view equipment bookings" ON public.equipment_bookings FOR SELECT USING (true);
CREATE POLICY "Anyone can view purchase requests" ON public.purchase_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can view supply contracts" ON public.supply_contracts FOR SELECT USING (true);

-- 8. Insert/Update/Delete policies (allow all for now — Clerk verifies auth in app layer)
CREATE POLICY "Allow insert equipment bookings" ON public.equipment_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update equipment bookings" ON public.equipment_bookings FOR UPDATE USING (true);
CREATE POLICY "Allow delete equipment bookings" ON public.equipment_bookings FOR DELETE USING (true);

CREATE POLICY "Allow insert purchase requests" ON public.purchase_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update purchase requests" ON public.purchase_requests FOR UPDATE USING (true);
CREATE POLICY "Allow delete purchase requests" ON public.purchase_requests FOR DELETE USING (true);

CREATE POLICY "Allow insert supply contracts" ON public.supply_contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update supply contracts" ON public.supply_contracts FOR UPDATE USING (true);
CREATE POLICY "Allow delete supply contracts" ON public.supply_contracts FOR DELETE USING (true);

-- Also add write policies for existing tables that were missing them
CREATE POLICY "Allow insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update profiles" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Allow insert user_roles" ON public.user_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update user_roles" ON public.user_roles FOR UPDATE USING (true);

CREATE POLICY "Allow insert crop_listings" ON public.crop_listings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update crop_listings" ON public.crop_listings FOR UPDATE USING (true);
CREATE POLICY "Allow delete crop_listings" ON public.crop_listings FOR DELETE USING (true);

CREATE POLICY "Allow insert equipment_listings" ON public.equipment_listings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update equipment_listings" ON public.equipment_listings FOR UPDATE USING (true);
CREATE POLICY "Allow delete equipment_listings" ON public.equipment_listings FOR DELETE USING (true);

CREATE POLICY "Allow insert buyer_connections" ON public.buyer_connections FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update buyer_connections" ON public.buyer_connections FOR UPDATE USING (true);
CREATE POLICY "Allow delete buyer_connections" ON public.buyer_connections FOR DELETE USING (true);

CREATE POLICY "Allow insert farmer_groups" ON public.farmer_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update farmer_groups" ON public.farmer_groups FOR UPDATE USING (true);
CREATE POLICY "Allow delete farmer_groups" ON public.farmer_groups FOR DELETE USING (true);

CREATE POLICY "Allow insert farmer_group_members" ON public.farmer_group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update farmer_group_members" ON public.farmer_group_members FOR UPDATE USING (true);
CREATE POLICY "Allow delete farmer_group_members" ON public.farmer_group_members FOR DELETE USING (true);

CREATE POLICY "Allow insert crop_recommendations" ON public.crop_recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update crop_recommendations" ON public.crop_recommendations FOR UPDATE USING (true);
CREATE POLICY "Allow delete crop_recommendations" ON public.crop_recommendations FOR DELETE USING (true);

CREATE POLICY "Allow insert weather_alerts" ON public.weather_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update weather_alerts" ON public.weather_alerts FOR UPDATE USING (true);
CREATE POLICY "Allow delete weather_alerts" ON public.weather_alerts FOR DELETE USING (true);

-- 9. Triggers for updated_at on new tables
CREATE TRIGGER update_equipment_bookings_updated_at BEFORE UPDATE ON public.equipment_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_requests_updated_at BEFORE UPDATE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_supply_contracts_updated_at BEFORE UPDATE ON public.supply_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
