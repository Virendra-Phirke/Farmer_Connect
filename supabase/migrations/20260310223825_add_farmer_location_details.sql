-- Add detailed location fields to farmer_profiles
ALTER TABLE farmer_profiles
ADD COLUMN state VARCHAR DEFAULT 'Maharashtra',
ADD COLUMN district VARCHAR,
ADD COLUMN taluka VARCHAR,
ADD COLUMN village_city VARCHAR,
ADD COLUMN survey_number VARCHAR,
ADD COLUMN gat_number VARCHAR;
