import { supabase } from "@/integrations/supabase/client";

export type CropListing = {
  id: string;
  farmer_id: string;
  crop_name: string;
  quantity_kg: number;
  price_per_kg: number;
  description: string | null;
  expected_harvest_date: string | null;
  location: string | null;
  status: "available" | "reserved" | "sold";
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CropListingInsert = Omit<CropListing, "id" | "created_at" | "updated_at">;

export async function getCropListings(filters?: {
  status?: string;
  farmer_id?: string;
  location?: string;
  crop_name?: string;
}) {
  let query = supabase
    .from("crop_listings")
    .select(`
      *,
      farmer:profiles!crop_listings_farmer_id_fkey(
        id,
        full_name,
        location,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.farmer_id) {
    query = query.eq("farmer_id", filters.farmer_id);
  }

  if (filters?.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }

  if (filters?.crop_name) {
    query = query.ilike("crop_name", `%${filters.crop_name}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching crop listings:", error);
    throw error;
  }

  return data;
}

export async function getCropListingById(id: string) {
  const { data, error } = await supabase
    .from("crop_listings")
    .select(`
      *,
      farmer:profiles!crop_listings_farmer_id_fkey(
        id,
        full_name,
        location,
        phone,
        email,
        avatar_url
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching crop listing:", error);
    throw error;
  }

  return data;
}

export async function createCropListing(listing: CropListingInsert) {
  const { data, error } = await supabase
    .from("crop_listings")
    .insert(listing)
    .select()
    .single();

  if (error) {
    console.error("Error creating crop listing:", error);
    throw error;
  }

  return data;
}

export async function updateCropListing(id: string, updates: Partial<CropListingInsert>) {
  const { data, error } = await supabase
    .from("crop_listings")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating crop listing:", error);
    throw error;
  }

  return data;
}

export async function deleteCropListing(id: string) {
  const { error } = await supabase
    .from("crop_listings")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting crop listing:", error);
    throw error;
  }
}

/**
 * Browse available crops — used by Sellers and Hotel/Restaurant Managers
 * Supports filtering by location, crop type, quantity, and freshness (harvest date)
 */
export async function browseAvailableCrops(filters?: {
  location?: string;
  crop_name?: string;
  min_quantity_kg?: number;
  max_price_per_kg?: number;
  harvest_before?: string;
}) {
  let query = supabase
    .from("crop_listings")
    .select(`
      *,
      farmer:profiles!crop_listings_farmer_id_fkey(
        id,
        full_name,
        location,
        phone,
        avatar_url
      )
    `)
    .eq("status", "available")
    .order("created_at", { ascending: false });

  if (filters?.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }

  if (filters?.crop_name) {
    query = query.ilike("crop_name", `%${filters.crop_name}%`);
  }

  if (filters?.min_quantity_kg) {
    query = query.gte("quantity_kg", filters.min_quantity_kg);
  }

  if (filters?.max_price_per_kg) {
    query = query.lte("price_per_kg", filters.max_price_per_kg);
  }

  if (filters?.harvest_before) {
    query = query.lte("expected_harvest_date", filters.harvest_before);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error browsing available crops:", error);
    throw error;
  }

  return data;
}
