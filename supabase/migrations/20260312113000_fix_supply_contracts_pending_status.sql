-- Fix supply_contracts status constraint to include 'pending'
-- The original constraint was missing 'pending' which caused all farmer proposals to silently fail

ALTER TABLE public.supply_contracts 
  DROP CONSTRAINT IF EXISTS supply_contracts_status_check;

ALTER TABLE public.supply_contracts 
  ADD CONSTRAINT supply_contracts_status_check 
  CHECK (status IN ('pending', 'active', 'paused', 'completed', 'cancelled'));
