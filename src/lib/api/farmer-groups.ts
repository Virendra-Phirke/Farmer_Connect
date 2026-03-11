import { supabase } from "@/integrations/supabase/client";

export type FarmerGroup = {
  id: string;
  name: string;
  description: string | null;
  region: string;
  state: string | null;
  district: string | null;
  taluka: string | null;
  village: string | null;
  soil_type: string | null;
  crop_type: string | null;
  created_by: string | null;
  created_at: string;
};

export type FarmerGroupInsert = Omit<FarmerGroup, "id" | "created_at"> & {
  state?: string | null;
  taluka?: string | null;
  village?: string | null;
};

export type FarmerGroupRequest = {
  id: string;
  group_id: string;
  profile_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    location: string | null;
    avatar_url: string | null;
  };
};

export async function getFarmerGroups(filters?: {
  region?: string;
  soil_type?: string;
  crop_type?: string;
}) {
  let query = supabase
    .from("farmer_groups")
    .select(`
      *,
      creator:profiles!farmer_groups_created_by_fkey(
        id,
        full_name,
        avatar_url
      ),
      farmer_group_members(profile_id),
      requests:farmer_group_requests(profile_id, status)
    `)
    .order("created_at", { ascending: false });

  if (filters?.region) {
    query = query.eq("region", filters.region);
  }

  if (filters?.soil_type) {
    query = query.eq("soil_type", filters.soil_type);
  }

  if (filters?.crop_type) {
    query = query.eq("crop_type", filters.crop_type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching farmer groups:", error);
    throw error;
  }

  return data;
}

export async function getFarmerGroupById(id: string) {
  const { data, error } = await supabase
    .from("farmer_groups")
    .select(`
      *,
      creator:profiles!farmer_groups_created_by_fkey(
        id,
        full_name,
        avatar_url
      ),
      members:farmer_group_members(
        id,
        joined_at,
        profile:profiles(
          id,
          full_name,
          location,
          avatar_url
        )
      ),
      requests:farmer_group_requests(profile_id, status)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching farmer group:", error);
    throw error;
  }

  return data;
}

export async function createFarmerGroup(group: Partial<FarmerGroup>) {
  const { data, error } = await supabase
    .from("farmer_groups")
    .insert([group as any])
    .select()
    .single();

  if (error) {
    console.error("Error creating farmer group:", error);
    throw error;
  }

  // Auto join the creator
  if (data?.id && group.created_by) {
    await joinFarmerGroup(data.id, group.created_by);
  }

  return data;
}

export async function updateFarmerGroup(id: string, updates: Partial<FarmerGroupInsert>) {
  const { data, error } = await supabase
    .from("farmer_groups")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating farmer group:", error);
    throw error;
  }

  return data;
}

export async function deleteFarmerGroup(id: string) {
  const { error } = await supabase
    .from("farmer_groups")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting farmer group:", error);
    throw error;
  }
}

export async function getFarmerGroup(id: string) {
  const { data, error } = await supabase
    .from("farmer_groups")
    .select(
      `
      id, name, description, region, state, district, taluka, village, soil_type, crop_type, created_by, created_at,
      farmer_group_members (
        profiles (
          id, full_name, avatar_url, location
        )
      )
      `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching user groups:", error);
    throw error;
  }

  return data;
}

export async function joinFarmerGroup(groupId: string, profileId: string) {
  const { data, error } = await supabase
    .from("farmer_group_members")
    .insert({
      group_id: groupId,
      profile_id: profileId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error joining farmer group:", error);
    throw error;
  }

  return data;
}

export async function requestToJoinFarmerGroup(groupId: string, profileId: string) {
  const { data, error } = await supabase
    .from("farmer_group_requests")
    .insert({
      group_id: groupId,
      profile_id: profileId,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique violation
      console.error("Already requested to join this group.");
      throw new Error("You have already requested to join this group.");
    }
    console.error("Error requesting to join farmer group:", error);
    throw error;
  }

  return data;
}

export async function getFarmerGroupRequests(groupId: string) {
  const { data, error } = await supabase
    .from("farmer_group_requests")
    .select(`
      *,
      profile:profiles!farmer_group_requests_profile_id_fkey(
        id,
        full_name,
        location,
        avatar_url
      )
    `)
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching farmer group requests:", error);
    throw error;
  }

  return data as FarmerGroupRequest[];
}

export async function updateFarmerGroupRequest(requestId: string, status: 'accepted' | 'rejected', groupId?: string, profileId?: string) {
  const { data, error } = await supabase
    .from("farmer_group_requests")
    .update({ status })
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    console.error("Error updating farmer group request:", error);
    throw error;
  }

  // If accepted, also add them to the group members
  if (status === 'accepted' && groupId && profileId) {
    await joinFarmerGroup(groupId, profileId);
  }

  return data;
}

export async function leaveFarmerGroup(groupId: string, profileId: string) {
  const { error } = await supabase
    .from("farmer_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("profile_id", profileId);

  if (error) {
    console.error("Error leaving farmer group:", error);
    throw error;
  }
}

export async function removeGroupMember(groupId: string, profileId: string) {
  return leaveFarmerGroup(groupId, profileId); // Same operation, just mapping name
}

export async function getUserGroups(profileId: string) {
  const { data, error } = await supabase
    .from("farmer_group_members")
    .select(`
      *,
      group:farmer_groups(
        *,
        creator:profiles!farmer_groups_created_by_fkey(
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .eq("profile_id", profileId);

  if (error) {
    console.error("Error fetching user groups:", error);
    throw error;
  }

  return data;
}

/**
 * Auto-group farmers based on shared criteria.
 * Queries profiles to find farmers with matching area/soil/crop and
 * creates or updates groups accordingly.
 */
export async function autoGroupFarmers(): Promise<{
  byRegion: Record<string, number>;
  bySoilType: Record<string, number>;
  byCropType: Record<string, number>;
}> {
  // Get all farmer profiles
  const { data: farmers, error } = await supabase
    .from("profiles")
    .select("id, location, soil_type")
    .not("location", "is", null);

  if (error) {
    console.error("Error fetching farmer profiles for grouping:", error);
    throw error;
  }

  // Group by region (location)
  const byRegion: Record<string, number> = {};
  (farmers || []).forEach((f) => {
    if (f.location) {
      byRegion[f.location] = (byRegion[f.location] || 0) + 1;
    }
  });

  // Group by soil type
  const bySoilType: Record<string, number> = {};
  (farmers || []).forEach((f) => {
    if (f.soil_type) {
      bySoilType[f.soil_type] = (bySoilType[f.soil_type] || 0) + 1;
    }
  });

  // Group by crop type — get farmers who have active crop listings
  const { data: cropListings } = await supabase
    .from("crop_listings")
    .select("farmer_id, crop_name")
    .eq("status", "available");

  const byCropType: Record<string, number> = {};
  (cropListings || []).forEach((cl) => {
    byCropType[cl.crop_name] = (byCropType[cl.crop_name] || 0) + 1;
  });

  return { byRegion, bySoilType, byCropType };
}

/**
 * Get suggested groups for a farmer based on their profile
 */
export async function getSuggestedGroups(profileId: string) {
  // Get the farmer's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("location, soil_type")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return [];

  // Find groups that match the farmer's region or soil type
  let query = supabase
    .from("farmer_groups")
    .select(`
      *,
      creator:profiles!farmer_groups_created_by_fkey(
        id,
        full_name,
        avatar_url
      ),
      members:farmer_group_members(count)
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  // Build OR filter for matching criteria
  const orFilters: string[] = [];
  if (profile.location) {
    orFilters.push(`region.ilike.%${profile.location}%`);
  }
  if (profile.soil_type) {
    orFilters.push(`soil_type.eq.${profile.soil_type}`);
  }

  if (orFilters.length > 0) {
    query = query.or(orFilters.join(","));
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching suggested groups:", error);
    return [];
  }

  return data || [];
}
