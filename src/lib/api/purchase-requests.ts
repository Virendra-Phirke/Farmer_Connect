import { supabase } from "@/integrations/supabase/client";

export type PurchaseRequest = {
    id: string;
    buyer_id: string;
    crop_listing_id: string;
    quantity_kg: number;
    offered_price: number;
    message: string | null;
    status: "pending" | "accepted" | "rejected" | "completed";
    payment_status: "unpaid" | "paid";
    billing_id: string | null;
    request_type: "single" | "bulk" | "contract";
    created_at: string;
    updated_at: string;
};

export type PurchaseRequestInsert = Omit<PurchaseRequest, "id" | "created_at" | "updated_at">;

export async function getPurchaseRequests(filters?: {
    buyer_id?: string;
    crop_listing_id?: string;
    status?: string;
    request_type?: string;
}) {
    let query = supabase
        .from("purchase_requests")
        .select(`
      *,
      buyer:profiles!purchase_requests_buyer_id_fkey(
        id,
        full_name,
        email,
        phone,
        location,
        avatar_url
      ),
      crop_listing:crop_listings!purchase_requests_crop_listing_id_fkey(
        id,
        crop_name,
        quantity_kg,
        price_per_kg,
        status,
        location,
        farmer:profiles!crop_listings_farmer_id_fkey(
          id,
          full_name,
          phone,
          location,
          avatar_url
        )
      )
    `)
        .order("created_at", { ascending: false });

    if (filters?.buyer_id) {
        query = query.eq("buyer_id", filters.buyer_id);
    }

    if (filters?.crop_listing_id) {
        query = query.eq("crop_listing_id", filters.crop_listing_id);
    }

    if (filters?.status) {
        query = query.eq("status", filters.status);
    }

    if (filters?.request_type) {
        query = query.eq("request_type", filters.request_type);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching purchase requests:", error);
        throw error;
    }

    return data;
}

export async function getPurchaseRequestById(id: string) {
    const { data, error } = await supabase
        .from("purchase_requests")
        .select(`
      *,
      buyer:profiles!purchase_requests_buyer_id_fkey(
        id,
        full_name,
        email,
        phone,
        location,
        avatar_url
      ),
      crop_listing:crop_listings!purchase_requests_crop_listing_id_fkey(
        id,
        crop_name,
        quantity_kg,
        price_per_kg,
        status,
        location,
        farmer:profiles!crop_listings_farmer_id_fkey(
          id,
          full_name,
          phone,
          email,
          location,
          avatar_url
        )
      )
    `)
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("Error fetching purchase request:", error);
        throw error;
    }

    return data;
}

export async function createPurchaseRequest(request: PurchaseRequestInsert) {
    const { data, error } = await supabase
        .from("purchase_requests")
        .insert(request)
        .select()
        .single();

    if (error) {
        console.error("Error creating purchase request:", error);
        throw error;
    }

    return data;
}

export async function updatePurchaseRequest(
    id: string,
    updates: Partial<PurchaseRequestInsert>
) {
    // Filter out payment_status and billing_id if they might not exist in the schema yet
    const filteredUpdates = { ...updates };
    
    // Try with all fields first
    let { data, error } = await supabase
        .from("purchase_requests")
        .update({
            ...filteredUpdates,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    // If the error is about payment_status column not existing, retry without it
    if (error && error.code === "PGRST204" && error.message?.includes("payment_status")) {
        console.warn("payment_status column not found in schema, updating without it:", error);
        
        // Remove payment_status and billing_id from updates
        const { payment_status, billing_id, ...safeUpdates } = filteredUpdates;
        
        const result = await supabase
            .from("purchase_requests")
            .update({
                ...safeUpdates,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();
        
        if (result.error) {
            console.error("Error updating purchase request (fallback):", result.error);
            throw result.error;
        }
        
        return result.data;
    }

    if (error) {
        console.error("Error updating purchase request:", error);
        throw error;
    }

    return data;
}

export async function acceptPurchaseRequest(id: string) {
    return updatePurchaseRequest(id, { status: "accepted" } as any);
}

export async function rejectPurchaseRequest(id: string) {
    return updatePurchaseRequest(id, { status: "rejected" } as any);
}

export async function completePurchaseRequest(id: string) {
    const request = await getPurchaseRequestById(id);

    const { data, error } = await supabase
        .from("purchase_requests")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error completing purchase request:", error);
        throw error;
    }

    // Mark the crop listing as sold if the full quantity was purchased
    if (request?.crop_listing) {
        const listing = request.crop_listing as any;
        if (request.quantity_kg >= listing.quantity_kg) {
            await supabase
                .from("crop_listings")
                .update({ status: "sold", updated_at: new Date().toISOString() })
                .eq("id", request.crop_listing_id);
        }
    }

    return data;
}

export async function deletePurchaseRequest(id: string) {
    const { error } = await supabase
        .from("purchase_requests")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting purchase request:", error);
        throw error;
    }
}

/**
 * Get all purchase requests received by a farmer (across all their crop listings)
 */
export async function getFarmerPurchaseRequests(farmerId: string) {
    const { data, error } = await supabase
        .from("purchase_requests")
        .select(`
      *,
      buyer:profiles!purchase_requests_buyer_id_fkey(
        id,
        full_name,
        email,
        phone,
        location,
        avatar_url
      ),
      crop_listing:crop_listings!inner(
        id,
        crop_name,
        quantity_kg,
        price_per_kg,
        farmer_id
      )
    `)
        .eq("crop_listing.farmer_id", farmerId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching farmer purchase requests:", error);
        throw error;
    }

    return data;
}
