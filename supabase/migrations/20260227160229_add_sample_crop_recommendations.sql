/*
  # Add Sample Crop Recommendations

  1. New Data
    - Sample crop recommendations for different soil types and seasons
    - Provides guidance for farmers on crop selection

  2. Notes
    - Data includes information on seed varieties, fertilizers, and expected yields
    - Covers major soil types: loamy, clay, sandy, black
    - Covers major seasons: kharif, rabi, zaid
*/

-- Insert sample crop recommendations
INSERT INTO crop_recommendations (soil_type, season, crop_name, seed_variety, fertilizer_info, expected_yield, notes)
VALUES
  -- Loamy Soil - Kharif Season
  ('loamy', 'kharif', 'Rice', 'IR64, Swarna', 'NPK 120:60:40 kg/ha', '4-5 tons/ha', 'Best suited for well-drained loamy soil with good water retention'),
  ('loamy', 'kharif', 'Maize', 'DKC 9144, Pioneer 3396', 'NPK 120:60:60 kg/ha', '6-8 tons/ha', 'Requires moderate rainfall and good drainage'),
  ('loamy', 'kharif', 'Cotton', 'Bt Cotton Varieties', 'NPK 80:40:40 kg/ha', '15-20 quintals/ha', 'Needs warm weather and moderate rainfall'),
  
  -- Loamy Soil - Rabi Season
  ('loamy', 'rabi', 'Wheat', 'HD 2967, PBW 343', 'NPK 120:60:40 kg/ha', '4-5 tons/ha', 'Requires cool climate and irrigation facility'),
  ('loamy', 'rabi', 'Mustard', 'Pusa Bold, RH-30', 'NPK 80:40:20 kg/ha', '1.5-2 tons/ha', 'Good for oil extraction and rotation crop'),
  ('loamy', 'rabi', 'Potato', 'Kufri Jyoti, Kufri Pukhraj', 'NPK 150:75:100 kg/ha', '20-25 tons/ha', 'Needs well-drained soil and cool climate'),
  
  -- Clay Soil - Kharif Season
  ('clay', 'kharif', 'Rice', 'Swarna, MTU 1010', 'NPK 100:50:50 kg/ha', '3.5-4.5 tons/ha', 'Clay soil retains water well, suitable for paddy'),
  ('clay', 'kharif', 'Soybean', 'JS 335, JS 97-52', 'NPK 30:60:40 kg/ha + Rhizobium', '2-3 tons/ha', 'Legume crop, enriches soil nitrogen'),
  ('clay', 'kharif', 'Groundnut', 'TMV 2, JL 24', 'NPK 20:40:50 kg/ha + Gypsum', '2-2.5 tons/ha', 'Requires good drainage despite clay soil'),
  
  -- Clay Soil - Rabi Season
  ('clay', 'rabi', 'Chickpea', 'JG 11, JG 130', 'NPK 20:40:20 kg/ha', '1.5-2 tons/ha', 'Drought resistant, good for clay soil'),
  ('clay', 'rabi', 'Wheat', 'GW 322, Lok 1', 'NPK 100:50:30 kg/ha', '3.5-4 tons/ha', 'Suitable for heavy clay soil with proper drainage'),
  ('clay', 'rabi', 'Barley', 'RD 2503, RD 2660', 'NPK 60:30:30 kg/ha', '2.5-3 tons/ha', 'More drought tolerant than wheat'),
  
  -- Sandy Soil - Kharif Season
  ('sandy', 'kharif', 'Pearl Millet', 'HHB 67, RHB 121', 'NPK 80:40:20 kg/ha', '2-3 tons/ha', 'Highly drought resistant, suitable for sandy soil'),
  ('sandy', 'kharif', 'Green Gram', 'Pusa Vishal, PDM 11', 'NPK 20:40:20 kg/ha', '0.8-1 ton/ha', 'Short duration crop, improves soil fertility'),
  ('sandy', 'kharif', 'Cowpea', 'Pusa Komal, Kashi Kanchan', 'NPK 20:40:20 kg/ha', '1-1.5 tons/ha', 'Good for sandy loam, nitrogen fixing'),
  
  -- Sandy Soil - Rabi Season
  ('sandy', 'rabi', 'Peas', 'Arkel, Bonneville', 'NPK 20:50:50 kg/ha', '2-3 tons/ha', 'Requires well-drained sandy loam soil'),
  ('sandy', 'rabi', 'Carrot', 'Nantes, Pusa Kesar', 'NPK 50:50:100 kg/ha', '15-20 tons/ha', 'Deep sandy soil preferred for root development'),
  ('sandy', 'rabi', 'Watermelon', 'Sugar Baby, Arka Manik', 'NPK 100:50:50 kg/ha', '25-30 tons/ha', 'Requires sandy loam with good drainage'),
  
  -- Black Soil - Kharif Season
  ('black', 'kharif', 'Cotton', 'Bt Cotton Bunny, RCH 2', 'NPK 100:50:50 kg/ha', '18-22 quintals/ha', 'Black soil ideal for cotton cultivation'),
  ('black', 'kharif', 'Sorghum', 'CSH 16, CSH 23', 'NPK 80:40:40 kg/ha', '3-4 tons/ha', 'Drought resistant, suitable for black soil'),
  ('black', 'kharif', 'Pigeon Pea', 'Asha, Maruti', 'NPK 25:50:25 kg/ha', '1.5-2 tons/ha', 'Long duration crop, good for intercropping'),
  
  -- Black Soil - Rabi Season
  ('black', 'rabi', 'Wheat', 'HD 2967, MP 3288', 'NPK 100:50:50 kg/ha', '3.5-4.5 tons/ha', 'Suitable for medium black soil'),
  ('black', 'rabi', 'Chickpea', 'JG 11, Digvijay', 'NPK 20:40:20 kg/ha', '1.8-2.2 tons/ha', 'Well adapted to black soil'),
  ('black', 'rabi', 'Safflower', 'Bhima, NARI 6', 'NPK 60:30:15 kg/ha', '1-1.5 tons/ha', 'Drought resistant oil seed crop')
ON CONFLICT DO NOTHING;
