import { supabase } from "@/integrations/supabase/client";

export type EquipmentBooking = {
    id: string;
    equipment_id: string;
    renter_id: string;
    start_date: string;
    end_date: string;
    status: "pending" | "confirmed" | "completed" | "cancelled";
    total_price: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
};

export type EquipmentBookingInsert = Omit<EquipmentBooking, "id" | "created_at" | "updated_at">;

export async function getEquipmentBookings(filters?: {
    equipment_id?: string;
    renter_id?: string;
    status?: string;
}) {
    let query = supabase
        .from("equipment_bookings")
        .select(`
      *,
      equipment:equipment_listings(
        id,
        name,
        category,
        price_per_day,
        location,
        image_url,
        owner:profiles!equipment_listings_owner_id_fkey(
          id,
          full_name,
          phone,
          avatar_url
        )
      ),
      renter:profiles!equipment_bookings_renter_id_fkey(
        id,
        full_name,
        phone,
        location,
        avatar_url
      )
    `)
        .order("created_at", { ascending: false });

    if (filters?.equipment_id) {
        query = query.eq("equipment_id", filters.equipment_id);
    }

    if (filters?.renter_id) {
        query = query.eq("renter_id", filters.renter_id);
    }

    if (filters?.status) {
        query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching equipment bookings:", error);
        throw error;
    }

    return data;
}

export async function getEquipmentBookingById(id: string) {
    const { data, error } = await supabase
        .from("equipment_bookings")
        .select(`
      *,
      equipment:equipment_listings(
        id,
        name,
        category,
        price_per_day,
        location,
        image_url,
        owner:profiles!equipment_listings_owner_id_fkey(
          id,
          full_name,
          phone,
          email,
          avatar_url
        )
      ),
      renter:profiles!equipment_bookings_renter_id_fkey(
        id,
        full_name,
        phone,
        email,
        location,
        avatar_url
      )
    `)
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("Error fetching equipment booking:", error);
        throw error;
    }

    return data;
}

export async function createEquipmentBooking(booking: EquipmentBookingInsert) {
    // Create the booking
    const { data, error } = await supabase
        .from("equipment_bookings")
        .insert(booking)
        .select()
        .single();

    if (error) {
        console.error("Error creating equipment booking:", error);
        throw error;
    }

    // Mark equipment as unavailable
    await supabase
        .from("equipment_listings")
        .update({ is_available: false, updated_at: new Date().toISOString() })
        .eq("id", booking.equipment_id);

    return data;
}

export async function updateEquipmentBooking(
    id: string,
    updates: Partial<EquipmentBookingInsert>
) {
    const { data, error } = await supabase
        .from("equipment_bookings")
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating equipment booking:", error);
        throw error;
    }

    return data;
}

export async function cancelEquipmentBooking(id: string) {
    // Get the booking to find the equipment_id
    const booking = await getEquipmentBookingById(id);

    const { data, error } = await supabase
        .from("equipment_bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error cancelling equipment booking:", error);
        throw error;
    }

    // Mark equipment as available again
    if (booking?.equipment) {
        await supabase
            .from("equipment_listings")
            .update({ is_available: true, updated_at: new Date().toISOString() })
            .eq("id", (booking.equipment as any).id);
    }

    return data;
}

export async function completeEquipmentBooking(id: string) {
    const booking = await getEquipmentBookingById(id);

    const { data, error } = await supabase
        .from("equipment_bookings")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error completing equipment booking:", error);
        throw error;
    }

    // Mark equipment as available again
    if (booking?.equipment) {
        await supabase
            .from("equipment_listings")
            .update({ is_available: true, updated_at: new Date().toISOString() })
            .eq("id", (booking.equipment as any).id);
    }

    return data;
}

/**
 * Get bookings for a specific equipment owner (across all their equipment)
 */
export async function getOwnerBookings(ownerId: string) {
    const { data, error } = await supabase
        .from("equipment_bookings")
        .select(`
      *,
      equipment:equipment_listings!inner(
        id,
        name,
        category,
        price_per_day,
        location,
        owner_id
      ),
      renter:profiles!equipment_bookings_renter_id_fkey(
        id,
        full_name,
        phone,
        location,
        avatar_url
      )
    `)
        .eq("equipment.owner_id", ownerId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching owner bookings:", error);
        throw error;
    }

    return data;
}
