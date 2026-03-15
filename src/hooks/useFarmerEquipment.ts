import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFarmerEquipment, createFarmerEquipment, updateFarmerEquipment, deleteFarmerEquipment, FarmerEquipment, FarmerEquipmentInsert } from "@/lib/api/farmer-equipment";

export function useFarmerEquipment(profileId: string | null) {
  return useQuery({
    queryKey: ["farmer-equipment", profileId],
    queryFn: () => (profileId ? getFarmerEquipment(profileId) : Promise.resolve([])),
    enabled: !!profileId,
  });
}

export function useCreateFarmerEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, equipment }: { profileId: string; equipment: Omit<FarmerEquipmentInsert, "profile_id"> }) => {
      return createFarmerEquipment(profileId, equipment);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["farmer-equipment", data.profile_id] });
    },
  });
}

export function useUpdateFarmerEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ equipmentId, updates, profileId }: { equipmentId: string; updates: Partial<FarmerEquipmentInsert>; profileId: string }) => {
      return updateFarmerEquipment(equipmentId, updates);
    },
    onSuccess: (_, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: ["farmer-equipment", profileId] });
    },
  });
}

export function useDeleteFarmerEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipmentId: string) => {
      return deleteFarmerEquipment(equipmentId);
    },
    onSuccess: () => {
      // Invalidate all farmer equipment queries
      queryClient.invalidateQueries({ queryKey: ["farmer-equipment"] });
    },
  });
}
