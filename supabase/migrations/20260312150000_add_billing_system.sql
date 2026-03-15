
-- Add payment tracking fields to transactions

ALTER TABLE public.equipment_bookings 
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
ADD COLUMN IF NOT EXISTS billing_id UUID DEFAULT gen_random_uuid();

ALTER TABLE public.purchase_requests
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
ADD COLUMN IF NOT EXISTS billing_id UUID DEFAULT gen_random_uuid();

ALTER TABLE public.supply_contracts
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
ADD COLUMN IF NOT EXISTS billing_id UUID DEFAULT gen_random_uuid();

