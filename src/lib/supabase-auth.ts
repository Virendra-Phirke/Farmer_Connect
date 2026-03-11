import { supabase } from "@/integrations/supabase/client";

export type UserProfile = {
  id: string;
  clerk_user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  // Role-specific fields joined via underlying tables:
  land_size_acres: number | null;
  soil_type: string | null;
  farming_type: string | null;
  available_equipment: string | null;
  state: string | null;
  district: string | null;
  taluka: string | null;
  village_city: string | null;
  survey_number: string | null;
  gat_number: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRole = "farmer" | "equipment_owner" | "hotel_restaurant_manager";

/**
 * Test if Supabase is reachable. Returns true if connected, false otherwise.
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const { error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .abortSignal(controller.signal);

    clearTimeout(timeout);
    return !error;
  } catch {
    return false;
  }
}

export async function syncClerkUserToSupabase(clerkUserId: string, userData: {
  full_name?: string;
  email?: string;
  avatar_url?: string;
}) {
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error checking existing profile:", fetchError);
    throw new Error(
      `Cannot connect to database. Please check your Supabase URL and API key in the .env file. Details: ${fetchError.message}`
    );
  }

  if (existing) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: userData.full_name || null,
        email: userData.email || null,
        avatar_url: userData.avatar_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_user_id", clerkUserId)
      .select()
      .maybeSingle();

    if (error) throw new Error(`Failed to update profile: ${error.message}`);
    return data;
  } else {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        clerk_user_id: clerkUserId,
        full_name: userData.full_name || null,
        email: userData.email || null,
        avatar_url: userData.avatar_url || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create profile: ${error.message}`);
    return data;
  }
}

export async function setUserRole(clerkUserId: string, role: UserRole) {
  const { data: existing } = await supabase
    .from("user_roles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  const currentProfileId = await getProfileId(clerkUserId);

  if (existing) {
    const { data, error } = await supabase
      .from("user_roles")
      .update({ role: role as any })
      .eq("clerk_user_id", clerkUserId)
      .select()
      .maybeSingle();

    if (error) throw new Error(`Failed to update role: ${error.message}`);

    // Auto-create the relevant role profile linked table mapping
    if (currentProfileId) {
      if (role === 'farmer') {
        await (supabase as any).from("farmer_profiles").upsert({ profile_id: currentProfileId }, { onConflict: "profile_id" });
      } else if (role === 'equipment_owner') {
        await (supabase as any).from("equipment_owner_profiles").upsert({ profile_id: currentProfileId }, { onConflict: "profile_id" });
      } else if (role === 'hotel_restaurant_manager') {
        await (supabase as any).from("buyer_profiles").upsert({ profile_id: currentProfileId }, { onConflict: "profile_id" });
      }
    }

    return data;
  } else {
    const { data, error } = await supabase
      .from("user_roles")
      .insert({ clerk_user_id: clerkUserId, role: role as any })
      .select()
      .single();

    if (error) throw new Error(`Failed to set role: ${error.message}`);

    // Auto-create the relevant role profile linked table mapping
    if (currentProfileId) {
      if (role === 'farmer') {
        await (supabase as any).from("farmer_profiles").upsert({ profile_id: currentProfileId }, { onConflict: "profile_id" });
      } else if (role === 'equipment_owner') {
        await (supabase as any).from("equipment_owner_profiles").upsert({ profile_id: currentProfileId }, { onConflict: "profile_id" });
      } else if (role === 'hotel_restaurant_manager') {
        await (supabase as any).from("buyer_profiles").upsert({ profile_id: currentProfileId }, { onConflict: "profile_id" });
      }
    }

    return data;
  }
}

export async function getUserRole(clerkUserId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) return null;
  return data?.role as UserRole | null;
}

export async function getUserProfile(clerkUserId: string): Promise<UserProfile | null> {
  // We perform a left join to fetch the base profile + potential role profiles
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select(`
      *,
      farmer_profiles(land_size_acres, soil_type, farming_type, available_equipment, state, district, taluka, village_city, survey_number, gat_number),
      equipment_owner_profiles(available_equipment)
    `)
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error || !data) {
    console.error("Error getting user profile:", error);
    return null;
  }

  // Flatten the joined data into the single flat UserProfile interface expected by exactly the frontend
  const farmerData = data.farmer_profiles && Array.isArray(data.farmer_profiles) ? data.farmer_profiles[0] : (data.farmer_profiles || {});
  const equipmentOwnerData = data.equipment_owner_profiles && Array.isArray(data.equipment_owner_profiles) ? data.equipment_owner_profiles[0] : (data.equipment_owner_profiles || {});

  return {
    id: data.id,
    clerk_user_id: data.clerk_user_id,
    full_name: data.full_name,
    email: data.email,
    avatar_url: data.avatar_url,
    phone: data.phone,
    location: data.location,
    created_at: data.created_at,
    updated_at: data.updated_at,
    // Inherited role fields
    land_size_acres: farmerData?.land_size_acres || null,
    soil_type: farmerData?.soil_type || null,
    farming_type: farmerData?.farming_type || null,
    available_equipment: farmerData?.available_equipment || equipmentOwnerData?.available_equipment || null,
    state: farmerData?.state || null,
    district: farmerData?.district || null,
    taluka: farmerData?.taluka || null,
    village_city: farmerData?.village_city || null,
    survey_number: farmerData?.survey_number || null,
    gat_number: farmerData?.gat_number || null,
  };
}

export async function getProfileId(clerkUserId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) return null;
  return data?.id || null;
}

export async function updateUserProfile(
  clerkUserId: string,
  updates: Partial<UserProfile>
) {
  // 1. Update the base 'profiles' table
  const baseUpdates = {
    full_name: updates.full_name,
    phone: updates.phone,
    location: updates.location,
    updated_at: new Date().toISOString(),
  };

  const { data: baseData, error: baseError } = await supabase
    .from("profiles")
    .update(baseUpdates)
    .eq("clerk_user_id", clerkUserId)
    .select()
    .maybeSingle();

  if (baseError || !baseData) {
    throw baseError || new Error("Profile not found");
  }

  const profileId = baseData.id;
  const role = await getUserRole(clerkUserId);

  // 2. Upsert to the correct role-based table based on the fields sent
  if (role === "farmer") {
    const farmerUpdates: any = {
      profile_id: profileId,
      land_size_acres: updates.land_size_acres !== undefined ? updates.land_size_acres : null,
      soil_type: updates.soil_type !== undefined ? updates.soil_type : null,
      farming_type: updates.farming_type !== undefined ? updates.farming_type : null,
      available_equipment: updates.available_equipment !== undefined ? updates.available_equipment : null,
      state: updates.state !== undefined ? updates.state : 'Maharashtra',
      district: updates.district !== undefined ? updates.district : null,
      taluka: updates.taluka !== undefined ? updates.taluka : null,
      village_city: updates.village_city !== undefined ? updates.village_city : null,
      survey_number: updates.survey_number !== undefined ? updates.survey_number : null,
      gat_number: updates.gat_number !== undefined ? updates.gat_number : null,
      updated_at: new Date().toISOString(),
    };
    await (supabase as any).from("farmer_profiles").upsert(farmerUpdates, { onConflict: "profile_id" });
  } else if (role === "equipment_owner") {
    const equipmentOwnerUpdates: any = {
      profile_id: profileId,
      available_equipment: updates.available_equipment !== undefined ? updates.available_equipment : null,
      updated_at: new Date().toISOString(),
    };
    await (supabase as any).from("equipment_owner_profiles").upsert(equipmentOwnerUpdates, { onConflict: "profile_id" });
  }

  // Frontend relies on the returned flat data representing the complete updated state.
  return await getUserProfile(clerkUserId);
}
