-- Add billing columns to purchase_requests table if they don't exist
-- This migration adds payment_status and billing_id columns for billing system

ALTER TABLE public.purchase_requests
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid'));

ALTER TABLE public.purchase_requests
ADD COLUMN IF NOT EXISTS billing_id UUID DEFAULT gen_random_uuid();

-- Add index for faster payment_status queries
CREATE INDEX IF NOT EXISTS purchase_requests_payment_status_idx ON public.purchase_requests(payment_status);

-- Create billing tracking for purchase requests
CREATE TABLE IF NOT EXISTS public.purchase_request_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_request_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  billing_id UUID DEFAULT gen_random_uuid(),
  amount NUMERIC NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable RLS on billing table
ALTER TABLE public.purchase_request_billing ENABLE ROW LEVEL SECURITY;

-- RLS policies for billing
CREATE POLICY "purchase_request_billing_select" ON public.purchase_request_billing
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_requests pr
    WHERE pr.id = purchase_request_id
    AND (
      -- Farmer can see if they created the listing
      pr.crop_listing_id IN (
        SELECT id FROM public.crop_listings 
        WHERE farmer_id = auth.uid()
      )
      OR
      -- Hotel can see if they made the request
      pr.hotel_id = auth.uid()
    )
  )
);

CREATE POLICY "purchase_request_billing_insert" ON public.purchase_request_billing
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_requests pr
    WHERE pr.id = purchase_request_id
    AND pr.crop_listing_id IN (
      SELECT id FROM public.crop_listings 
      WHERE farmer_id = auth.uid()
    )
  )
);

CREATE POLICY "purchase_request_billing_update" ON public.purchase_request_billing
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_requests pr
    WHERE pr.id = purchase_request_id
    AND pr.crop_listing_id IN (
      SELECT id FROM public.crop_listings 
      WHERE farmer_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.purchase_requests pr
    WHERE pr.id = purchase_request_id
    AND pr.crop_listing_id IN (
      SELECT id FROM public.crop_listings 
      WHERE farmer_id = auth.uid()
    )
  )
);
