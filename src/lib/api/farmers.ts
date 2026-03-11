import { supabase } from "@/integrations/supabase/client";
import { UserProfile } from "../supabase-auth";



/**
 * Searches for farmers based on specific location and land details.
 */
export async function searchFarmersByLocationAndGat(filters: {
    district?: string;
    taluka?: string;
    villageCity?: string;
    surveyNumber?: string;
    gatNumber?: string;
}): Promise<UserProfile[]> {
    let query = (supabase as any)
        .from("farmer_profiles")
        .select(`
            land_size_acres, soil_type, farming_type, available_equipment, state, district, taluka, village_city, survey_number, gat_number,
            profiles (
                id, clerk_user_id, full_name, email, phone, location, avatar_url, created_at, updated_at
            )
        `);

    if (filters.district) {
        query = query.ilike("district", `%${filters.district}%`);
    }
    if (filters.taluka) {
        query = query.ilike("taluka", `%${filters.taluka}%`);
    }
    if (filters.villageCity) {
        query = query.ilike("village_city", `%${filters.villageCity}%`);
    }
    if (filters.surveyNumber) {
        query = query.ilike("survey_number", `%${filters.surveyNumber}%`);
    }
    if (filters.gatNumber) {
        query = query.ilike("gat_number", `%${filters.gatNumber}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error searching farmers:", error);
        throw error;
    }

    return data.map((row: any) => ({
        ...row.profiles,
        land_size_acres: row.land_size_acres,
        soil_type: row.soil_type,
        farming_type: row.farming_type,
        available_equipment: row.available_equipment,
        state: row.state,
        district: row.district,
        taluka: row.taluka,
        village_city: row.village_city,
        survey_number: row.survey_number,
        gat_number: row.gat_number,
    }));
}

export async function getFarmerProfile(profileId: string) {
    const { data, error } = await (supabase as any)
        .from("farmer_profiles")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching farmer profile:", error);
        throw error;
    }

    return data;
}
