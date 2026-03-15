-- Ensure billing/payment fields exist for equipment bookings in environments
-- where older migrations were not applied.
ALTER TABLE public.equipment_bookings
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
ADD COLUMN IF NOT EXISTS billing_id TEXT;