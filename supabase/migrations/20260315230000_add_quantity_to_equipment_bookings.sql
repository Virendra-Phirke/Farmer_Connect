-- Add quantity column to equipment_bookings table
ALTER TABLE public.equipment_bookings
ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS equipment_bookings_quantity_idx ON public.equipment_bookings(quantity);
