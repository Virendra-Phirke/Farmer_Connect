-- Final schema alignment for profile persistence, billing consistency, and role mobile storage
-- Idempotent migration: safe to run multiple times

-- 1) Ensure profile address columns exist (used by profile page)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state VARCHAR;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district VARCHAR;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS taluka VARCHAR;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS village_city VARCHAR;

-- 2) Ensure role profile tables can persist mobile numbers
ALTER TABLE public.equipment_owner_profiles ADD COLUMN IF NOT EXISTS mobile_number VARCHAR;
ALTER TABLE public.buyer_profiles ADD COLUMN IF NOT EXISTS mobile_number VARCHAR;

-- Backfill role mobile numbers from base profile phone
UPDATE public.equipment_owner_profiles eop
SET mobile_number = p.phone,
    updated_at = timezone('utc'::text, now())
FROM public.profiles p
WHERE eop.profile_id = p.id
  AND p.phone IS NOT NULL
  AND (eop.mobile_number IS NULL OR eop.mobile_number = '');

UPDATE public.buyer_profiles bp
SET mobile_number = p.phone,
    updated_at = timezone('utc'::text, now())
FROM public.profiles p
WHERE bp.profile_id = p.id
  AND p.phone IS NOT NULL
  AND (bp.mobile_number IS NULL OR bp.mobile_number = '');

-- Sync role mobile from profiles on insert/update of profiles.phone
CREATE OR REPLACE FUNCTION public.sync_role_profile_mobile_from_profiles()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.phone IS DISTINCT FROM OLD.phone THEN
    UPDATE public.equipment_owner_profiles
    SET mobile_number = NEW.phone,
        updated_at = timezone('utc'::text, now())
    WHERE profile_id = NEW.id;

    UPDATE public.buyer_profiles
    SET mobile_number = NEW.phone,
        updated_at = timezone('utc'::text, now())
    WHERE profile_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_role_profile_mobile_from_profiles_trigger ON public.profiles;
CREATE TRIGGER sync_role_profile_mobile_from_profiles_trigger
AFTER INSERT OR UPDATE OF phone ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_role_profile_mobile_from_profiles();

-- 3) Billing schema consistency
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS billing_id UUID;
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS total_amount NUMERIC;

ALTER TABLE public.equipment_bookings ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.equipment_bookings ADD COLUMN IF NOT EXISTS billing_id TEXT;
ALTER TABLE public.equipment_bookings ADD COLUMN IF NOT EXISTS total_amount NUMERIC;
ALTER TABLE public.equipment_bookings ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.supply_contracts ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.supply_contracts ADD COLUMN IF NOT EXISTS billing_id UUID;
ALTER TABLE public.supply_contracts ADD COLUMN IF NOT EXISTS total_amount NUMERIC;

-- Backfill payment status defaults
UPDATE public.purchase_requests SET payment_status = 'unpaid' WHERE payment_status IS NULL;
UPDATE public.equipment_bookings SET payment_status = 'unpaid' WHERE payment_status IS NULL;
UPDATE public.supply_contracts SET payment_status = 'unpaid' WHERE payment_status IS NULL;

ALTER TABLE public.purchase_requests ALTER COLUMN payment_status SET DEFAULT 'unpaid';
ALTER TABLE public.equipment_bookings ALTER COLUMN payment_status SET DEFAULT 'unpaid';
ALTER TABLE public.supply_contracts ALTER COLUMN payment_status SET DEFAULT 'unpaid';

-- Billing id defaults where appropriate
ALTER TABLE public.purchase_requests ALTER COLUMN billing_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.supply_contracts ALTER COLUMN billing_id SET DEFAULT gen_random_uuid();

-- Ensure checks exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'purchase_requests_payment_status_check'
      AND conrelid = 'public.purchase_requests'::regclass
  ) THEN
    ALTER TABLE public.purchase_requests
      ADD CONSTRAINT purchase_requests_payment_status_check
      CHECK (payment_status IN ('unpaid', 'paid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'equipment_bookings_payment_status_check'
      AND conrelid = 'public.equipment_bookings'::regclass
  ) THEN
    ALTER TABLE public.equipment_bookings
      ADD CONSTRAINT equipment_bookings_payment_status_check
      CHECK (payment_status IN ('unpaid', 'paid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'supply_contracts_payment_status_check'
      AND conrelid = 'public.supply_contracts'::regclass
  ) THEN
    ALTER TABLE public.supply_contracts
      ADD CONSTRAINT supply_contracts_payment_status_check
      CHECK (payment_status IN ('unpaid', 'paid'));
  END IF;
END $$;

-- 4) Persistent farmer equipment table (replace temporary/in-memory usage)
CREATE TABLE IF NOT EXISTS public.farmer_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  condition TEXT NOT NULL,
  purchase_year INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.farmer_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read farmer_equipment" ON public.farmer_equipment;
DROP POLICY IF EXISTS "Allow all farmer_equipment" ON public.farmer_equipment;

CREATE POLICY "Allow read farmer_equipment"
ON public.farmer_equipment
FOR SELECT
USING (true);

CREATE POLICY "Allow all farmer_equipment"
ON public.farmer_equipment
FOR ALL
USING (true)
WITH CHECK (true);

DROP TRIGGER IF EXISTS update_farmer_equipment_updated_at ON public.farmer_equipment;
CREATE TRIGGER update_farmer_equipment_updated_at
BEFORE UPDATE ON public.farmer_equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Performance indexes
CREATE INDEX IF NOT EXISTS profiles_clerk_user_id_idx ON public.profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS profiles_phone_idx ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS profiles_location_idx ON public.profiles(state, district, taluka, village_city);

CREATE INDEX IF NOT EXISTS purchase_requests_buyer_status_idx ON public.purchase_requests(buyer_id, status);
CREATE INDEX IF NOT EXISTS purchase_requests_payment_status_idx ON public.purchase_requests(payment_status);

CREATE INDEX IF NOT EXISTS equipment_bookings_renter_status_idx ON public.equipment_bookings(renter_id, status);
CREATE INDEX IF NOT EXISTS equipment_bookings_payment_status_idx ON public.equipment_bookings(payment_status);

CREATE INDEX IF NOT EXISTS supply_contracts_buyer_status_idx ON public.supply_contracts(buyer_id, status);
CREATE INDEX IF NOT EXISTS supply_contracts_farmer_status_idx ON public.supply_contracts(farmer_id, status);
CREATE INDEX IF NOT EXISTS supply_contracts_payment_status_idx ON public.supply_contracts(payment_status);

CREATE INDEX IF NOT EXISTS farmer_equipment_profile_id_idx ON public.farmer_equipment(profile_id);
CREATE INDEX IF NOT EXISTS farmer_equipment_type_idx ON public.farmer_equipment(equipment_type);
