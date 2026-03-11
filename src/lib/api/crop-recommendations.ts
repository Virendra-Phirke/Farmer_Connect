import { supabase } from "@/integrations/supabase/client";

export type CropRecommendation = {
  id: string;
  soil_type: string;
  season: string;
  location: string | null;
  crop_name: string;
  seed_variety: string | null;
  fertilizer_info: string | null;
  expected_yield: string | null;
  notes: string | null;
  created_at: string;
};

export type CropRecommendationInsert = Omit<CropRecommendation, "id" | "created_at">;

export async function getCropRecommendations(filters?: {
  soil_type?: string;
  season?: string;
  location?: string;
}) {
  let query = supabase
    .from("crop_recommendations")
    .select("*")
    .order("crop_name", { ascending: true });

  if (filters?.soil_type) {
    query = query.eq("soil_type", filters.soil_type);
  }

  if (filters?.season) {
    query = query.eq("season", filters.season);
  }

  if (filters?.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching crop recommendations:", error);
    throw error;
  }

  return data;
}

export async function getCropRecommendationById(id: string) {
  const { data, error } = await supabase
    .from("crop_recommendations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching crop recommendation:", error);
    throw error;
  }

  return data;
}

export async function createCropRecommendation(recommendation: CropRecommendationInsert) {
  const { data, error } = await supabase
    .from("crop_recommendations")
    .insert(recommendation)
    .select()
    .single();

  if (error) {
    console.error("Error creating crop recommendation:", error);
    throw error;
  }

  return data;
}

export async function updateCropRecommendation(id: string, updates: Partial<CropRecommendationInsert>) {
  const { data, error } = await supabase
    .from("crop_recommendations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating crop recommendation:", error);
    throw error;
  }

  return data;
}

export async function deleteCropRecommendation(id: string) {
  const { error } = await supabase
    .from("crop_recommendations")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting crop recommendation:", error);
    throw error;
  }
}

/**
 * Crop Recommendation Engine — matches farmer profile to suitable crops.
 * Input: soil type, location, season
 * Output: Recommended crops with seed, fertilizer, and yield info
 */
export async function getRecommendationsForFarmer(
  soilType: string,
  season: string,
  location?: string
): Promise<CropRecommendation[]> {
  let query = supabase
    .from("crop_recommendations")
    .select("*")
    .eq("soil_type", soilType.toLowerCase())
    .eq("season", season.toLowerCase())
    .order("crop_name", { ascending: true });

  // If location is provided, try to match
  // Fall back to non-location-specific results if no location match
  const { data, error } = await query;

  if (error) {
    console.error("Error fetching recommendations for farmer:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // If location is provided, prioritize location-matched results
  if (location) {
    const locationLower = location.toLowerCase();
    const locationMatched = data.filter(
      (r) => r.location && r.location.toLowerCase().includes(locationLower)
    );

    if (locationMatched.length > 0) {
      return locationMatched;
    }
  }

  // Return all results for the soil/season combo (including those without location)
  return data;
}

/**
 * Get all unique soil types from recommendations (for dropdown options)
 */
export async function getAvailableSoilTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from("crop_recommendations")
    .select("soil_type")
    .order("soil_type", { ascending: true });

  if (error) {
    console.error("Error fetching soil types:", error);
    return [];
  }

  return [...new Set((data || []).map((r) => r.soil_type))];
}

/**
 * Get all unique seasons from recommendations (for dropdown options)
 */
export async function getAvailableSeasons(): Promise<string[]> {
  const { data, error } = await supabase
    .from("crop_recommendations")
    .select("season")
    .order("season", { ascending: true });

  if (error) {
    console.error("Error fetching seasons:", error);
    return [];
  }

  return [...new Set((data || []).map((r) => r.season))];
}
