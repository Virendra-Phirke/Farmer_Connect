-- DB alignment migration for billing + notifications reliability
-- Safe/idempotent: can be executed multiple times

-- 1) Profiles: structured location fields required by billing UI
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state VARCHAR;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district VARCHAR;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS taluka VARCHAR;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS village_city VARCHAR;

-- 2) Equipment listings and bookings quantity fields
ALTER TABLE public.equipment_listings ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.equipment_bookings ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'equipment_quantity_non_negative'
      AND conrelid = 'public.equipment_listings'::regclass
  ) THEN
    ALTER TABLE public.equipment_listings
      ADD CONSTRAINT equipment_quantity_non_negative CHECK (quantity >= 0);
  END IF;
END $$;

-- 3) Billing columns on transaction tables
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS billing_id UUID;

ALTER TABLE public.equipment_bookings ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.equipment_bookings ADD COLUMN IF NOT EXISTS billing_id UUID;

ALTER TABLE public.supply_contracts ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.supply_contracts ADD COLUMN IF NOT EXISTS billing_id UUID;

-- Ensure defaults/backfill for payment_status
UPDATE public.purchase_requests SET payment_status = 'unpaid' WHERE payment_status IS NULL;
UPDATE public.equipment_bookings SET payment_status = 'unpaid' WHERE payment_status IS NULL;
UPDATE public.supply_contracts SET payment_status = 'unpaid' WHERE payment_status IS NULL;

ALTER TABLE public.purchase_requests ALTER COLUMN payment_status SET DEFAULT 'unpaid';
ALTER TABLE public.equipment_bookings ALTER COLUMN payment_status SET DEFAULT 'unpaid';
ALTER TABLE public.supply_contracts ALTER COLUMN payment_status SET DEFAULT 'unpaid';

ALTER TABLE public.purchase_requests ALTER COLUMN payment_status SET NOT NULL;
ALTER TABLE public.equipment_bookings ALTER COLUMN payment_status SET NOT NULL;
ALTER TABLE public.supply_contracts ALTER COLUMN payment_status SET NOT NULL;

-- Ensure billing_id defaults are present
ALTER TABLE public.purchase_requests ALTER COLUMN billing_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.equipment_bookings ALTER COLUMN billing_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.supply_contracts ALTER COLUMN billing_id SET DEFAULT gen_random_uuid();

-- Ensure check constraints for payment_status exist
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

-- 4) Indexes used by dashboard notifications and billing filters
CREATE INDEX IF NOT EXISTS purchase_requests_payment_status_idx ON public.purchase_requests(payment_status);
CREATE INDEX IF NOT EXISTS purchase_requests_status_idx ON public.purchase_requests(status);
CREATE INDEX IF NOT EXISTS purchase_requests_buyer_id_idx ON public.purchase_requests(buyer_id);
CREATE INDEX IF NOT EXISTS purchase_requests_crop_listing_id_idx ON public.purchase_requests(crop_listing_id);

CREATE INDEX IF NOT EXISTS equipment_bookings_payment_status_idx ON public.equipment_bookings(payment_status);
CREATE INDEX IF NOT EXISTS equipment_bookings_status_idx ON public.equipment_bookings(status);
CREATE INDEX IF NOT EXISTS equipment_bookings_renter_id_idx ON public.equipment_bookings(renter_id);
CREATE INDEX IF NOT EXISTS equipment_bookings_equipment_id_idx ON public.equipment_bookings(equipment_id);
CREATE INDEX IF NOT EXISTS equipment_bookings_quantity_idx ON public.equipment_bookings(quantity);

CREATE INDEX IF NOT EXISTS supply_contracts_payment_status_idx ON public.supply_contracts(payment_status);
CREATE INDEX IF NOT EXISTS supply_contracts_status_idx ON public.supply_contracts(status);
CREATE INDEX IF NOT EXISTS supply_contracts_buyer_id_idx ON public.supply_contracts(buyer_id);
CREATE INDEX IF NOT EXISTS supply_contracts_farmer_id_idx ON public.supply_contracts(farmer_id);

CREATE INDEX IF NOT EXISTS profiles_clerk_user_id_idx ON public.profiles(clerk_user_id);
CREATE INDEX IF NOT EXISTS profiles_state_district_taluka_idx ON public.profiles(state, district, taluka);

-- 5) RLS update policy hardening for purchase_requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'purchase_requests'
      AND policyname = 'Allow update purchase requests'
  ) THEN
    DROP POLICY "Allow update purchase requests" ON public.purchase_requests;
  END IF;
END $$;

CREATE POLICY "Allow update purchase requests" ON public.purchase_requests
FOR UPDATE
USING (true)
WITH CHECK (true);
