-- ============================================================================
-- DATABASE MIGRATION: EQUIPMENT QUANTITY MANAGEMENT
-- File: supabase/migrations/20260315210000_add_equipment_quantity.sql
-- ============================================================================

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

-- ============================================================================
-- USEFUL QUERIES AFTER MIGRATION
-- ============================================================================

-- View table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'equipment_listings';

-- Get all equipment with quantity breakdown
-- SELECT name, category, price_per_day, quantity, 
--        CASE WHEN quantity = 0 THEN 'Unavailable' ELSE 'Available' END as status
-- FROM equipment_listings
-- ORDER BY owner_id, name;

-- Count equipment by availability
-- SELECT 
--   SUM(CASE WHEN quantity > 0 THEN 1 ELSE 0 END) as available_count,
--   SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as unavailable_count,
--   COUNT(*) as total_count
-- FROM equipment_listings;

-- Get equipment with low inventory (qty < 5)
-- SELECT owner_id, name, quantity 
-- FROM equipment_listings 
-- WHERE quantity > 0 AND quantity < 5
-- ORDER BY quantity ASC;

-- Get total inventory value
-- SELECT 
--   SUM(quantity) as total_units,
--   SUM(quantity * price_per_day * 365) as annual_rental_value
-- FROM equipment_listings
-- WHERE quantity > 0;

-- Find equipment never rented (for analytics)
-- SELECT e.*, COUNT(eb.id) as booking_count
-- FROM equipment_listings e
-- LEFT JOIN equipment_bookings eb ON e.id = eb.equipment_id
-- GROUP BY e.id
-- HAVING COUNT(eb.id) = 0
-- ORDER BY e.created_at DESC;

-- ============================================================================
-- ROLLBACK (IF NEEDED)
-- ============================================================================

-- DROP INDEX IF EXISTS idx_equipment_listings_quantity;
-- ALTER TABLE public.equipment_listings 
-- DROP CONSTRAINT IF EXISTS equipment_quantity_non_negative;
-- ALTER TABLE public.equipment_listings 
-- DROP COLUMN IF EXISTS quantity;
