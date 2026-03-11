import { supabase } from "@/integrations/supabase/client";

export type HotelCropRequirement = {
    id: string;
    hotel_id: string; // References profiles.id linked via buyer_profiles
    crop_name: string;
    quantity_kg: number;
    required_by_date: string | null;
    status: "open" | "fulfilled" | "cancelled";
    created_at: string;
    updated_at: string;
};

export type HotelCropRequirementWithHotel = HotelCropRequirement & {
    hotel: {
        id: string;
        full_name: string | null;
        location: string | null;
        phone: string | null;
    };
};

/**
 * Fetch open requirements to display to farmers.
 */
export async function getOpenCropRequirements(): Promise<HotelCropRequirementWithHotel[]> {
    const { data, error } = await (supabase as any)
        .from("hotel_crop_requirements")
        .select(`
            *,
            buyer_profiles (
                profiles (
                    id,
                    full_name,
                    location,
                    phone
                )
            )
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching hotel crop requirements:", error);
        throw error;
    }

    // Map nested profiles data to the 'hotel' property expected by the UI
    return (data || []).map((item: any) => {
        const profile = item.buyer_profiles?.profiles;
        return {
            ...item,
            hotel: profile ? profile : { id: item.hotel_id, full_name: "Unknown Hotel", location: "Unknown" }
        };
    });
}

/**
 * Fetch requirements created by a specific hotel manager.
 */
export async function getMyCropRequirements(profileId: string): Promise<HotelCropRequirement[]> {
    const { data, error } = await (supabase as any)
        .from("hotel_crop_requirements")
        .select("*")
        .eq("hotel_id", profileId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching my crop requirements:", error);
        throw error;
    }

    return data || [];
}

export type CreateRequirementInput = {
    hotel_id: string;
    crop_name: string;
    quantity_kg: number;
    required_by_date?: string;
};

/**
 * Create a new crop requirement for a hotel manager.
 */
export async function createCropRequirement(input: CreateRequirementInput): Promise<HotelCropRequirement> {
    // SELF HEALING: If the user never went through the Select Role screen, their ID might 
    // not exist in buyer_profiles yet. A missing Foreign Key causes Supabase to return an 
    // RLS error for anon requests. This ensures the key exists.
    try {
        await (supabase as any).from("buyer_profiles").upsert({ profile_id: input.hotel_id }, { onConflict: "profile_id" });
    } catch (e) {
        console.warn("Could not self-heal buyer_profiles:", e);
    }

    const { data, error } = await (supabase as any)
        .from("hotel_crop_requirements")
        .insert([input])
        .select()
        .single();

    if (error) {
        console.error("Error creating crop requirement:", error);
        throw error;
    }

    return data;
}

/**
 * Update the status of a crop requirement (e.g. mark as fulfilled).
 */
export async function updateCropRequirementStatus(id: string, status: HotelCropRequirement["status"]): Promise<void> {
    const { error } = await (supabase as any)
        .from("hotel_crop_requirements")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) {
        console.error("Error updating crop requirement status:", error);
        throw error;
    }
}

/**
 * Delete a crop requirement.
 */
export async function deleteCropRequirement(id: string): Promise<void> {
    const { error } = await (supabase as any)
        .from("hotel_crop_requirements")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting crop requirement:", error);
        throw error;
    }
}
