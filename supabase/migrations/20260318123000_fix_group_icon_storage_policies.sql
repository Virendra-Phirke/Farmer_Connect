-- Fix storage policies for group icon uploads when using anon/Clerk client sessions
-- This migration is safe to run after 20260318_add_group_icon_url.sql

DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Icon" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Icon" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Icon" ON storage.objects;

CREATE POLICY "Group Icons Public Read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'group-icons');

CREATE POLICY "Group Icons Public Insert" ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'group-icons');

CREATE POLICY "Group Icons Public Update" ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'group-icons')
  WITH CHECK (bucket_id = 'group-icons');

CREATE POLICY "Group Icons Public Delete" ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'group-icons');
