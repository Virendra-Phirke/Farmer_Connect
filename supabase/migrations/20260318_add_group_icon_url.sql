-- Add icon_url column to farmer_groups table for group custom icons
ALTER TABLE farmer_groups ADD COLUMN IF NOT EXISTS icon_url TEXT NULL;

-- Create storage bucket for group icons if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'group-icons',
  'group-icons',
  true,
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Recreate policies safely (migration can be re-run)
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Icon" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Icon" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Icon" ON storage.objects;

CREATE POLICY "Public Read Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'group-icons');

CREATE POLICY "Admin Upload Icon" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'group-icons'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Admin Update Icon" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'group-icons'
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    bucket_id = 'group-icons'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Admin Delete Icon" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'group-icons'
    AND auth.uid() IS NOT NULL
  );
