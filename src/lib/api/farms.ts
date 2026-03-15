import { supabase } from "@/integrations/supabase/client";

export interface Farm {
    id: string;
    farm_name: string;
    state: string;
    district: string;
    taluka?: string;
    village_city?: string;
    survey_number?: string;
    gat_number?: string;
    land_size_acres?: number;
    soil_type?: string;
    farming_type?: string;
}

export const getFarmsByProfileId = async (profileId: string): Promise<Farm[]> => {
    const { data, error } = await (supabase as any)
        .from("farms")
        .select("*")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching farms:", error);
        throw error;
    }

    return data || [];
};

export const createFarm = async (profileId: string, farm: Omit<Farm, "id">): Promise<Farm> => {
    const { data, error } = await (supabase as any)
        .from("farms")
        .insert([{ ...farm, profile_id: profileId, updated_at: new Date().toISOString() }])
        .select()
        .single();

    if (error) {
        console.error("Error creating farm:", error);
        throw error;
    }

    return data;
};

export const updateFarm = async (farmId: string, updates: Partial<Farm>): Promise<Farm> => {
    const { data, error } = await (supabase as any)
        .from("farms")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", farmId)
        .select()
        .single();

    if (error) {
        console.error("Error updating farm:", error);
        throw error;
    }

    return data;
};

export const deleteFarm = async (farmId: string): Promise<void> => {
    const { error } = await (supabase as any)
        .from("farms")
        .delete()
        .eq("id", farmId);

    if (error) {
        console.error("Error deleting farm:", error);
        throw error;
    }
};

