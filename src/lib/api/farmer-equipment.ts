import { supabase } from "@/integrations/supabase/client";

export type FarmerEquipment = {
  id: string;
  profile_id: string;
  equipment_name: string;
  equipment_type: string;
  quantity: number;
  condition: string;
  purchase_year?: number;
  description?: string;
  created_at: string;
  updated_at: string;
};

export type FarmerEquipmentInsert = Omit<FarmerEquipment, "id" | "created_at" | "updated_at">;

export async function getFarmerEquipment(profileId: string) {
  try {
    const { data, error } = await (supabase as any)
      .from("farmer_equipment")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as FarmerEquipment[];
  } catch (error) {
    console.error("Error fetching farmer equipment:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to fetch equipment");
  }
}

export async function createFarmerEquipment(profileId: string, equipment: Omit<FarmerEquipmentInsert, "profile_id">) {
  try {
    const { data, error } = await (supabase as any)
      .from("farmer_equipment")
      .insert([
        {
          profile_id: profileId,
          equipment_name: equipment.equipment_name,
          equipment_type: equipment.equipment_type,
          quantity: equipment.quantity,
          condition: equipment.condition,
          purchase_year: equipment.purchase_year ?? null,
          description: equipment.description ?? null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as FarmerEquipment;
  } catch (error) {
    console.error("Error creating farmer equipment:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create equipment");
  }
}

export async function updateFarmerEquipment(equipmentId: string, updates: Partial<FarmerEquipmentInsert>) {
  try {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.equipment_name !== undefined) payload.equipment_name = updates.equipment_name;
    if (updates.equipment_type !== undefined) payload.equipment_type = updates.equipment_type;
    if (updates.quantity !== undefined) payload.quantity = updates.quantity;
    if (updates.condition !== undefined) payload.condition = updates.condition;
    if (updates.purchase_year !== undefined) payload.purchase_year = updates.purchase_year;
    if (updates.description !== undefined) payload.description = updates.description;

    const { data, error } = await (supabase as any)
      .from("farmer_equipment")
      .update(payload)
      .eq("id", equipmentId)
      .select()
      .single();

    if (error) throw error;
    return data as FarmerEquipment;
  } catch (error) {
    console.error("Error updating farmer equipment:", error);
    throw error;
  }
}

export async function deleteFarmerEquipment(equipmentId: string) {
  try {
    const { error } = await (supabase as any)
      .from("farmer_equipment")
      .delete()
      .eq("id", equipmentId);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting farmer equipment:", error);
    throw error;
  }
}
