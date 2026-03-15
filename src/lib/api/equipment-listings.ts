import { supabase } from "@/integrations/supabase/client";

export type EquipmentListing = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  category: string;
  price_per_day: number;
  location: string;
  quantity: number;
  is_available: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type EquipmentListingInsert = Omit<EquipmentListing, "id" | "created_at" | "updated_at" | "is_available">;

export async function getEquipmentListings(filters?: {
  is_available?: boolean;
  owner_id?: string;
  category?: string;
  location?: string;
}) {
  let query = supabase
    .from("equipment_listings")
    .select(`
      *,
      owner:profiles!equipment_listings_owner_id_fkey(
        id,
        full_name,
        location,
        phone,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false });

  if (filters?.is_available !== undefined) {
    query = query.eq("is_available", filters.is_available);
  }

  if (filters?.owner_id) {
    query = query.eq("owner_id", filters.owner_id);
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.location) {
    query = query.ilike("location", `%${filters.location}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching equipment listings:", error);
    throw error;
  }

  return data;
}

export async function getEquipmentListingById(id: string) {
  const { data, error } = await supabase
    .from("equipment_listings")
    .select(`
      *,
      owner:profiles!equipment_listings_owner_id_fkey(
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
    console.error("Error fetching equipment listing:", error);
    throw error;
  }

  return data;
}

export async function createEquipmentListing(listing: EquipmentListingInsert) {
  const { data, error } = await supabase
    .from("equipment_listings")
    .insert(listing)
    .select()
    .single();

  if (error) {
    console.error("Error creating equipment listing:", error);
    throw error;
  }

  return data;
}

export async function updateEquipmentListing(id: string, updates: Partial<EquipmentListingInsert>) {
  const { data, error } = await supabase
    .from("equipment_listings")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating equipment listing:", error);
    throw error;
  }

  return data;
}

export async function deleteEquipmentListing(id: string) {
  const { error } = await supabase
    .from("equipment_listings")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting equipment listing:", error);
    throw error;
  }
}
