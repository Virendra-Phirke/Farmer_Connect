import { supabase } from "@/integrations/supabase/client";

export type BuyerConnection = {
  id: string;
  buyer_id: string;
  farmer_id: string;
  status: "pending" | "accepted" | "rejected";
  message: string | null;
  created_at: string;
};

export type BuyerConnectionInsert = Omit<BuyerConnection, "id" | "created_at">;

export async function getBuyerConnections(filters?: {
  buyer_id?: string;
  farmer_id?: string;
  status?: string;
}) {
  let query = supabase
    .from("buyer_connections")
    .select(`
      *,
      buyer:profiles!buyer_connections_buyer_id_fkey(
        id,
        full_name,
        email,
        phone,
        location,
        avatar_url
      ),
      farmer:profiles!buyer_connections_farmer_id_fkey(
        id,
        full_name,
        email,
        phone,
        location,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false });

  if (filters?.buyer_id) {
    query = query.eq("buyer_id", filters.buyer_id);
  }

  if (filters?.farmer_id) {
    query = query.eq("farmer_id", filters.farmer_id);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching buyer connections:", error);
    throw error;
  }

  return data;
}

export async function getBuyerConnectionById(id: string) {
  const { data, error } = await supabase
    .from("buyer_connections")
    .select(`
      *,
      buyer:profiles!buyer_connections_buyer_id_fkey(
        id,
        full_name,
        email,
        phone,
        location,
        avatar_url
      ),
      farmer:profiles!buyer_connections_farmer_id_fkey(
        id,
        full_name,
        email,
        phone,
        location,
        avatar_url
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching buyer connection:", error);
    throw error;
  }

  return data;
}

export async function createBuyerConnection(connection: BuyerConnectionInsert) {
  const { data, error } = await supabase
    .from("buyer_connections")
    .insert(connection)
    .select()
    .single();

  if (error) {
    console.error("Error creating buyer connection:", error);
    throw error;
  }

  return data;
}

export async function updateBuyerConnection(id: string, updates: Partial<BuyerConnectionInsert>) {
  const { data, error } = await supabase
    .from("buyer_connections")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating buyer connection:", error);
    throw error;
  }

  return data;
}

export async function deleteBuyerConnection(id: string) {
  const { error } = await supabase
    .from("buyer_connections")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting buyer connection:", error);
    throw error;
  }
}
