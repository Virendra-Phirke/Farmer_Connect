ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS payment_qr_url TEXT;
