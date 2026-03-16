-- Ensure role-based mobile numbers are stored for billing/contact requirements
ALTER TABLE public.equipment_owner_profiles
  ADD COLUMN IF NOT EXISTS mobile_number VARCHAR;

ALTER TABLE public.buyer_profiles
  ADD COLUMN IF NOT EXISTS mobile_number VARCHAR;

-- Backfill role profile mobile numbers from base profiles table
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

-- Keep role profile mobile numbers in sync with profile phone
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

-- Persistent farmer equipment table (used in profile management)
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

CREATE INDEX IF NOT EXISTS farmer_equipment_profile_id_idx ON public.farmer_equipment(profile_id);
CREATE INDEX IF NOT EXISTS farmer_equipment_type_idx ON public.farmer_equipment(equipment_type);

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
