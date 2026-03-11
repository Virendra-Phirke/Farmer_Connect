-- Add chain_connector to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'chain_connector';

-- Add latitude and longitude to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create rental_requests table for Machine Rental System & Chain Connections
CREATE TABLE IF NOT EXISTS public.rental_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment_listings(id) ON DELETE CASCADE,
  chain_connector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'forwarded', 'accepted', 'rejected', 'completed')),
  request_details TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for rental_requests
ALTER TABLE public.rental_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rental requests" ON public.rental_requests FOR SELECT USING (true);
CREATE POLICY "Allow insert rental requests" ON public.rental_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update rental requests" ON public.rental_requests FOR UPDATE USING (true);
CREATE POLICY "Allow delete rental requests" ON public.rental_requests FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_rental_requests_updated_at BEFORE UPDATE ON public.rental_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
