-- Add quantity column to equipment_listings table
-- This migration adds support for equipment owners to manage inventory levels
-- When quantity is 0, the equipment is automatically marked as unavailable

ALTER TABLE public.equipment_listings 
ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;

-- Add constraint to ensure quantity is non-negative
ALTER TABLE public.equipment_listings 
ADD CONSTRAINT equipment_quantity_non_negative CHECK (quantity >= 0);

-- Create index on quantity for filtering available equipment
CREATE INDEX IF NOT EXISTS idx_equipment_listings_quantity ON public.equipment_listings(quantity);

-- Add comment for documentation
COMMENT ON COLUMN public.equipment_listings.quantity IS 'Number of units available for rent. When set to 0, equipment becomes unavailable.';
