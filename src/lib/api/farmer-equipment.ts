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

// Temporary storage for equipment items (until database migration)
const equipmentStorage = new Map<string, FarmerEquipment[]>();

export async function getFarmerEquipment(profileId: string) {
  try {
    // Temporarily return empty array - awaiting database table creation
    return equipmentStorage.get(profileId) || [];
  } catch (error) {
    console.error("Error fetching farmer equipment:", error);
    return [];
  }
}

export async function createFarmerEquipment(profileId: string, equipment: Omit<FarmerEquipmentInsert, "profile_id">) {
  try {
    const id = `eq-${Date.now()}`;
    const now = new Date().toISOString();
    
    const newEquipment: FarmerEquipment = {
      id,
      profile_id: profileId,
      equipment_name: equipment.equipment_name,
      equipment_type: equipment.equipment_type,
      quantity: equipment.quantity,
      condition: equipment.condition,
      purchase_year: equipment.purchase_year,
      description: equipment.description,
      created_at: now,
      updated_at: now,
    };

    const existing = equipmentStorage.get(profileId) || [];
    equipmentStorage.set(profileId, [...existing, newEquipment]);

    return newEquipment;
  } catch (error) {
    console.error("Error creating farmer equipment:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create equipment");
  }
}

export async function updateFarmerEquipment(equipmentId: string, updates: Partial<FarmerEquipmentInsert>) {
  try {
    // Temporarily disabled - awaiting database table creation
    throw new Error("Edit functionality coming soon after database migration");
  } catch (error) {
    console.error("Error updating farmer equipment:", error);
    throw error;
  }
}

export async function deleteFarmerEquipment(equipmentId: string) {
  try {
    // Temporarily disabled - awaiting database table creation
    throw new Error("Delete functionality coming soon after database migration");
  } catch (error) {
    console.error("Error deleting farmer equipment:", error);
    throw error;
  }
}
