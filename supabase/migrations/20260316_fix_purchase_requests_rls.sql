-- Fix RLS policy for purchase_requests UPDATE
-- The previous UPDATE policy was missing WITH CHECK clause
-- This caused 400 Bad Request errors when updating

-- Drop the incomplete UPDATE policy
DROP POLICY IF EXISTS "Allow update purchase requests" ON public.purchase_requests;

-- Create proper UPDATE policy with both USING and WITH CHECK
CREATE POLICY "Allow update purchase requests" ON public.purchase_requests 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Add payment_status column if it doesn't exist
ALTER TABLE public.purchase_requests
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid'));

-- Add billing_id column if it doesn't exist
ALTER TABLE public.purchase_requests
ADD COLUMN IF NOT EXISTS billing_id UUID DEFAULT gen_random_uuid();

-- Create index for payment_status if it doesn't exist
CREATE INDEX IF NOT EXISTS purchase_requests_payment_status_idx ON public.purchase_requests(payment_status);
