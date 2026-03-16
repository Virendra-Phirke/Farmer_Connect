import { supabase } from "@/integrations/supabase/client";

export type SupplyContract = {
    id: string;
    buyer_id: string;
    farmer_id: string;
    crop_name: string;
    quantity_kg_per_delivery: number;
    delivery_frequency: "daily" | "weekly" | "biweekly" | "monthly";
    start_date: string;
    end_date: string;
    price_per_kg: number;
    status: "pending" | "active" | "paused" | "completed" | "cancelled";
    payment_status: "unpaid" | "paid";
    billing_id: string | null;
    created_at: string;
    updated_at: string;
};

export type SupplyContractInsert = Omit<SupplyContract, "id" | "created_at" | "updated_at" | "status" | "payment_status" | "billing_id"> & {
    status?: SupplyContract["status"];
    payment_status?: SupplyContract["payment_status"];
    billing_id?: SupplyContract["billing_id"];
    total_amount?: number;
};

export async function getSupplyContracts(filters?: {
    buyer_id?: string;
    farmer_id?: string;
    status?: string;
    crop_name?: string;
}) {
    let query = supabase
        .from("supply_contracts")
        .select(`
      *,
      buyer:profiles!supply_contracts_buyer_id_fkey(
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
      farmer:profiles!supply_contracts_farmer_id_fkey(
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

    if (filters?.crop_name) {
        query = query.ilike("crop_name", `%${filters.crop_name}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching supply contracts:", error);
        throw error;
    }

    // Enrich with latest profile data to ensure fresh phone numbers
    if (data && data.length > 0) {
        try {
            const enrichedData = await Promise.all(
                data.map(async (contract: any) => {
                    const enrichedContract = { ...contract };

                    // Refresh buyer profile phone - check all sources
                    if (contract.buyer_id) {
                        const { data: freshBuyer } = await (supabase as any)
                            .from("profiles")
                            .select(`
                              phone,
                              buyer_profiles(mobile_number),
                              equipment_owner_profiles(mobile_number)
                            `)
                            .eq("id", contract.buyer_id)
                            .maybeSingle();
                        if (freshBuyer && enrichedContract.buyer) {
                            const buyerRoleData = Array.isArray(freshBuyer.buyer_profiles) ? freshBuyer.buyer_profiles[0] : freshBuyer.buyer_profiles;
                            const equipmentRoleData = Array.isArray(freshBuyer.equipment_owner_profiles) ? freshBuyer.equipment_owner_profiles[0] : freshBuyer.equipment_owner_profiles;
                            enrichedContract.buyer.phone = freshBuyer.phone || buyerRoleData?.mobile_number || equipmentRoleData?.mobile_number;
                        }
                    }

                    // Refresh farmer profile phone - check all sources
                    if (contract.farmer_id) {
                        const { data: freshFarmer } = await (supabase as any)
                            .from("profiles")
                            .select(`
                              phone,
                              farmer_profiles(mobile_number),
                              buyer_profiles(mobile_number),
                              equipment_owner_profiles(mobile_number)
                            `)
                            .eq("id", contract.farmer_id)
                            .maybeSingle();
                        if (freshFarmer && enrichedContract.farmer) {
                            const farmerRoleData = Array.isArray(freshFarmer.farmer_profiles) ? freshFarmer.farmer_profiles[0] : freshFarmer.farmer_profiles;
                            const buyerRoleData = Array.isArray(freshFarmer.buyer_profiles) ? freshFarmer.buyer_profiles[0] : freshFarmer.buyer_profiles;
                            const equipmentRoleData = Array.isArray(freshFarmer.equipment_owner_profiles) ? freshFarmer.equipment_owner_profiles[0] : freshFarmer.equipment_owner_profiles;
                            enrichedContract.farmer.phone = freshFarmer.phone || farmerRoleData?.mobile_number || buyerRoleData?.mobile_number || equipmentRoleData?.mobile_number;
                        }
                    }

                    return enrichedContract;
                })
            );
            return enrichedData;
        } catch (enrichError) {
            console.warn("Error enriching supply contracts with fresh data:", enrichError);
            return data; // Return original data if enrichment fails
        }
    }

    return data;
}

export async function getSupplyContractById(id: string) {
    const { data, error } = await supabase
        .from("supply_contracts")
        .select(`
      *,
      buyer:profiles!supply_contracts_buyer_id_fkey(
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
      farmer:profiles!supply_contracts_farmer_id_fkey(
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
    `)
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("Error fetching supply contract:", error);
        throw error;
    }

    return data;
}

export async function createSupplyContract(contract: SupplyContractInsert) {
    // SELF HEALING: Ensure farmer_profiles row exists so FK constraint passes
    try {
        await supabase.from("farmer_profiles" as any).upsert({ profile_id: contract.farmer_id }, { onConflict: "profile_id" });
    } catch (e) {
        console.warn("Could not self-heal farmer_profiles:", e);
    }
    // SELF HEALING: Ensure buyer_profiles row exists
    try {
        await supabase.from("buyer_profiles" as any).upsert({ profile_id: contract.buyer_id }, { onConflict: "profile_id" });
    } catch (e) {
        console.warn("Could not self-heal buyer_profiles:", e);
    }

    const basePayload: Record<string, any> = {
        ...contract,
        quantity_kg_per_delivery: Number(contract.quantity_kg_per_delivery),
        price_per_kg: Number(contract.price_per_kg),
        status: contract.status ?? "pending",
    };

    if (basePayload.billing_id == null) {
        delete basePayload.billing_id;
    }
    if (basePayload.payment_status == null) {
        delete basePayload.payment_status;
    }

    // Try modern schema first
    let { data, error } = await supabase
        .from("supply_contracts")
        .insert(basePayload)
        .select()
        .single();

    // Fallback: older schema without payment_status / billing_id columns
    if (error && error.code === "PGRST204") {
        const legacyPayload = { ...basePayload };
        delete legacyPayload.payment_status;
        delete legacyPayload.billing_id;

        const retry = await supabase
            .from("supply_contracts")
            .insert(legacyPayload)
            .select()
            .single();

        data = retry.data;
        error = retry.error;
    }

    if (error) {
        console.error("Error creating supply contract:", error);
        throw new Error(error.message || "Failed to create supply contract");
    }

    return data;
}

export async function updateSupplyContract(
    id: string,
    updates: Partial<SupplyContractInsert>
) {
    // Try with all fields first
    let { data, error } = await supabase
        .from("supply_contracts")
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    // If the error is about payment_status column not existing, retry without it
    if (error && error.code === "PGRST204" && error.message?.includes("payment_status")) {
        console.warn("payment_status column not found in schema, updating without it:", error);
        
        // Remove payment_status and billing_id from updates
        const { payment_status, billing_id, ...safeUpdates } = updates;
        
        const result = await supabase
            .from("supply_contracts")
            .update({
                ...safeUpdates,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();
        
        if (result.error) {
            console.error("Error updating supply contract (fallback):", result.error);
            throw result.error;
        }
        
        return result.data;
    }

    if (error) {
        console.error("Error updating supply contract:", error);
        throw error;
    }

    return data;
}

export async function pauseSupplyContract(id: string) {
    return updateSupplyContract(id, { status: "paused" } as any);
}

export async function resumeSupplyContract(id: string) {
    return updateSupplyContract(id, { status: "active" } as any);
}

export async function cancelSupplyContract(id: string) {
    return updateSupplyContract(id, { status: "cancelled" } as any);
}

export async function completeSupplyContract(id: string) {
    return updateSupplyContract(id, { status: "completed" } as any);
}

/**
 * Get active contracts count for a farmer
 */
export async function getFarmerActiveContractsCount(farmerId: string): Promise<number> {
    const { count, error } = await supabase
        .from("supply_contracts")
        .select("*", { count: "exact", head: true })
        .eq("farmer_id", farmerId)
        .eq("status", "active");

    if (error) {
        console.error("Error counting active contracts:", error);
        return 0;
    }

    return count || 0;
}
