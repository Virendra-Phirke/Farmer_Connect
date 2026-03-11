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
    created_at: string;
    updated_at: string;
};

export type SupplyContractInsert = Omit<SupplyContract, "id" | "created_at" | "updated_at">;

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
        avatar_url
      ),
      farmer:profiles!supply_contracts_farmer_id_fkey(
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

    if (filters?.crop_name) {
        query = query.ilike("crop_name", `%${filters.crop_name}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching supply contracts:", error);
        throw error;
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
        avatar_url
      ),
      farmer:profiles!supply_contracts_farmer_id_fkey(
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
        console.error("Error fetching supply contract:", error);
        throw error;
    }

    return data;
}

export async function createSupplyContract(contract: SupplyContractInsert) {
    const { data, error } = await supabase
        .from("supply_contracts")
        .insert(contract)
        .select()
        .single();

    if (error) {
        console.error("Error creating supply contract:", error);
        throw error;
    }

    return data;
}

export async function updateSupplyContract(
    id: string,
    updates: Partial<SupplyContractInsert>
) {
    const { data, error } = await supabase
        .from("supply_contracts")
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

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
