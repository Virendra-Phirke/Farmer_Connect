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
          state,
          district,
          taluka,
          village_city,
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
          state,
          district,
          taluka,
          village_city,
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

    // Enrich with latest profile data to ensure fresh phone numbers
    if (data && data.length > 0) {
        try {
            const enrichedData = await Promise.all(
                data.map(async (request: any) => {
                    const enrichedRequest = { ...request };

                    // Refresh buyer profile phone - check all sources
                    if (request.buyer_id) {
                        const { data: freshBuyer } = await (supabase as any)
                            .from("profiles")
                            .select(`
                              phone,
                              buyer_profiles(mobile_number),
                              equipment_owner_profiles(mobile_number)
                            `)
                            .eq("id", request.buyer_id)
                            .maybeSingle();
                        if (freshBuyer && enrichedRequest.buyer) {
                            const buyerRoleData = Array.isArray(freshBuyer.buyer_profiles) ? freshBuyer.buyer_profiles[0] : freshBuyer.buyer_profiles;
                            const equipmentRoleData = Array.isArray(freshBuyer.equipment_owner_profiles) ? freshBuyer.equipment_owner_profiles[0] : freshBuyer.equipment_owner_profiles;
                            enrichedRequest.buyer.phone = freshBuyer.phone || buyerRoleData?.mobile_number || equipmentRoleData?.mobile_number;
                        }
                    }

                    // Refresh farmer profile phone - check all sources
                    if (request.crop_listing?.farmer?.id) {
                        const { data: freshFarmer } = await (supabase as any)
                            .from("profiles")
                            .select(`
                              phone,
                              farmer_profiles(mobile_number),
                              buyer_profiles(mobile_number),
                              equipment_owner_profiles(mobile_number)
                            `)
                            .eq("id", request.crop_listing.farmer.id)
                            .maybeSingle();
                        if (freshFarmer && enrichedRequest.crop_listing?.farmer) {
                            const farmerRoleData = Array.isArray(freshFarmer.farmer_profiles) ? freshFarmer.farmer_profiles[0] : freshFarmer.farmer_profiles;
                            const buyerRoleData = Array.isArray(freshFarmer.buyer_profiles) ? freshFarmer.buyer_profiles[0] : freshFarmer.buyer_profiles;
                            const equipmentRoleData = Array.isArray(freshFarmer.equipment_owner_profiles) ? freshFarmer.equipment_owner_profiles[0] : freshFarmer.equipment_owner_profiles;
                            enrichedRequest.crop_listing.farmer.phone = freshFarmer.phone || farmerRoleData?.mobile_number || buyerRoleData?.mobile_number || equipmentRoleData?.mobile_number;
                        }
                    }

                    return enrichedRequest;
                })
            );
            return enrichedData;
        } catch (enrichError) {
            console.warn("Error enriching purchase requests with fresh data:", enrichError);
            return data; // Return original data if enrichment fails
        }
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
          state,
          district,
          taluka,
          village_city,
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
          state,
          district,
          taluka,
          village_city,
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
    const baseUpdates = { ...updates } as Record<string, unknown>;

    const isMissingColumnError = (err: any, column: string) => {
        const msg = String(err?.message || "").toLowerCase();
        const details = String(err?.details || "").toLowerCase();
        const hint = String(err?.hint || "").toLowerCase();
        const target = column.toLowerCase();
        return (
            msg.includes(target) ||
            details.includes(target) ||
            hint.includes(target)
        );
    };

    const tryUpdate = async (payload: Record<string, unknown>, attempt: number) => {
        console.log(`[Purchase Request Update - Attempt ${attempt}] ID: ${id}`, {
            payload,
            timestamp: new Date().toISOString(),
        });
        const result = await supabase
            .from("purchase_requests")
            .update(payload)
            .eq("id", id)
            .select()
            .single();
        
        if (result.error) {
            console.error(`[Purchase Request Update - Attempt ${attempt} FAILED]`, {
                id,
                code: result.error.code,
                status: result.error.status,
                message: result.error.message,
                details: result.error.details,
                hint: result.error.hint,
            });
        }
        return result;
    };

    const firstPayload = {
        ...baseUpdates,
        updated_at: new Date().toISOString(),
    };

    let result = await tryUpdate(firstPayload, 1);

    if (!result.error) {
        console.log("[Purchase Request Update - SUCCESS] Updated successfully on attempt 1");
        return result.data;
    }

    // Retry strategy for older/partial schemas:
    // 1) remove payment/billing columns if missing
    // 2) remove updated_at if column missing
    let fallbackPayload = { ...firstPayload } as Record<string, unknown>;

    if (isMissingColumnError(result.error, "payment_status")) {
        console.warn("[Purchase Request Update] Removing payment_status from payload (column appears missing)");
        delete fallbackPayload.payment_status;
    }
    if (isMissingColumnError(result.error, "billing_id")) {
        console.warn("[Purchase Request Update] Removing billing_id from payload (column appears missing)");
        delete fallbackPayload.billing_id;
    }
    if (isMissingColumnError(result.error, "updated_at")) {
        console.warn("[Purchase Request Update] Removing updated_at from payload (column appears missing)");
        delete fallbackPayload.updated_at;
    }

    // If nothing changed and still failed, proactively try safest payload
    const shouldTrySafePayload =
        Object.keys(fallbackPayload).length !== Object.keys(firstPayload).length ||
        result.error.code === "PGRST204" ||
        result.error.status === 400;

    if (shouldTrySafePayload) {
        const { payment_status, billing_id, updated_at, ...safeCore } = baseUpdates as any;
        const minimalPayload = {
            ...safeCore,
            ...(isMissingColumnError(result.error, "updated_at") ? {} : { updated_at: new Date().toISOString() }),
        };

        result = await tryUpdate(
            Object.keys(fallbackPayload).length ? fallbackPayload : minimalPayload,
            2
        );

        if (!result.error) {
            console.log("[Purchase Request Update - SUCCESS] Updated successfully on fallback attempt");
            return result.data;
        }
    }

    // Final attempt: try with just status field if that's what was being updated
    if (baseUpdates.status && !result.error) {
        console.log("[Purchase Request Update] Attempting minimal update with only status field");
        result = await tryUpdate({ status: baseUpdates.status }, 3);
        if (!result.error) {
            console.log("[Purchase Request Update - SUCCESS] Updated successfully with minimal payload");
            return result.data;
        }
    }

    console.error("Error updating purchase request - ALL ATTEMPTS FAILED:", {
        id,
        attemptedUpdates: updates,
        code: result.error?.code,
        status: result.error?.status,
        message: result.error?.message,
        details: result.error?.details,
        hint: result.error?.hint,
    });
    throw result.error;
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
        state,
        district,
        taluka,
        village_city,
        avatar_url
      ),
      crop_listing:crop_listings!inner(
        id,
        crop_name,
        quantity_kg,
        price_per_kg,
        farmer_id,
        farmer:profiles!crop_listings_farmer_id_fkey(
          id,
          full_name,
          email,
          phone,
          location,
          state,
          district,
          taluka,
          village_city,
          avatar_url
        )
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
