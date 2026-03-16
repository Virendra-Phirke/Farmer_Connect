import { supabase } from "@/integrations/supabase/client";

export type EquipmentBooking = {
    id: string;
    equipment_id: string;
    renter_id: string;
    start_date: string;
    end_date: string;
    status: "pending" | "confirmed" | "completed" | "cancelled";
    payment_status?: "unpaid" | "paid";
    billing_id?: string | null;
    total_price: number;
    notes: string | null;
    quantity: number;
    created_at: string;
    updated_at: string;
};

export type EquipmentBookingInsert = Omit<EquipmentBooking, "id" | "created_at" | "updated_at">;

const PAYMENT_CONFIRMED_MARKER = "[payment_confirmed_by_seller]";

export function getEquipmentPaymentStatus(booking: any): "paid" | "unpaid" {
    const explicitStatus = String(booking?.payment_status || "").toLowerCase();
    if (explicitStatus === "paid") return "paid";

    const notes = String(booking?.notes || "").toLowerCase();
    if (notes.includes(PAYMENT_CONFIRMED_MARKER)) return "paid";

    return "unpaid";
}

function isMissingPaymentStatusColumnError(error: any): boolean {
    return error?.code === "PGRST204" && String(error?.message || "").includes("payment_status");
}

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
          email,
          phone,
          location,
          state,
          district,
          taluka,
          village_city,
          avatar_url
        )
      ),
      renter:profiles!equipment_bookings_renter_id_fkey(
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
          email,
          phone,
          location,
          state,
          district,
          taluka,
          village_city,
          avatar_url
        )
      ),
      renter:profiles!equipment_bookings_renter_id_fkey(
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

    // If error is about missing quantity column, retry without it
    if (error && error?.code === "PGRST204" && String(error?.message || "").includes("quantity")) {
        console.warn("Quantity column not found, retrying without it", error);
        const bookingWithoutQty = { ...booking };
        delete (bookingWithoutQty as any).quantity;
        
        const { data: data2, error: error2 } = await supabase
            .from("equipment_bookings")
            .insert(bookingWithoutQty)
            .select()
            .single();
        
        if (error2) {
            console.error("Error creating equipment booking (retry):", error2);
            throw error2;
        }

        // Reduce equipment quantity
        await reduceEquipmentQuantity(booking.equipment_id, booking.quantity || 1);

        return data2;
    }

    if (error) {
        console.error("Error creating equipment booking:", error);
        throw error;
    }

    // Reduce equipment quantity
    await reduceEquipmentQuantity(booking.equipment_id, booking.quantity || 1);

    return data;
}

export async function reduceEquipmentQuantity(equipmentId: string, quantityToReduce: number) {
    // Get current equipment
    const { data: equipment, error: fetchError } = await supabase
        .from("equipment_listings")
        .select("quantity")
        .eq("id", equipmentId)
        .single();

    if (fetchError) {
        console.error("Error fetching equipment for quantity update:", fetchError);
        return;
    }

    const currentQuantity = equipment?.quantity || 0;
    const newQuantity = Math.max(0, currentQuantity - quantityToReduce);
    const isAvailable = newQuantity > 0;

    // Update quantity and availability
    const { error: updateError } = await supabase
        .from("equipment_listings")
        .update({ 
            quantity: newQuantity,
            is_available: isAvailable,
            updated_at: new Date().toISOString() 
        })
        .eq("id", equipmentId);

    if (updateError) {
        console.error("Error reducing equipment quantity:", updateError);
    }
}

export async function updateEquipmentBooking(
    id: string,
    updates: Partial<EquipmentBookingInsert>
) {
    const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from("equipment_bookings")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

    if (!error) return data;

    // Compatibility fallback for older schemas missing equipment_bookings.payment_status
    if ("payment_status" in payload && payload.payment_status === "paid" && isMissingPaymentStatusColumnError(error)) {
        const existing = await getEquipmentBookingById(id);
        const existingNotes = String(existing?.notes || "");
        const nextNotes = existingNotes.includes(PAYMENT_CONFIRMED_MARKER)
            ? existingNotes
            : `${existingNotes}${existingNotes ? "\n" : ""}${PAYMENT_CONFIRMED_MARKER} Payment confirmed by seller on ${new Date().toISOString()}`;

        const { data: fallbackData, error: fallbackError } = await supabase
            .from("equipment_bookings")
            .update({
                status: "completed",
                notes: nextNotes,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

        if (fallbackError) {
            console.error("Error updating equipment booking (fallback path):", fallbackError);
            throw fallbackError;
        }

        return fallbackData;
    }

    console.error("Error updating equipment booking:", error);
    throw error;
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
                owner_id,
                owner:profiles!equipment_listings_owner_id_fkey(
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
      ),
      renter:profiles!equipment_bookings_renter_id_fkey(
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
        .eq("equipment.owner_id", ownerId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching owner bookings:", error);
        throw error;
    }

    return data;
}
