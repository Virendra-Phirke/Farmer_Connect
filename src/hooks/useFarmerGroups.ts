import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFarmerGroups,
  getFarmerGroupById,
  createFarmerGroup,
  updateFarmerGroup,
  deleteFarmerGroup,
  joinFarmerGroup,
  leaveFarmerGroup,
  getUserGroups,
  FarmerGroupInsert,
} from "@/lib/api";

export function useFarmerGroups(filters?: {
  region?: string;
  soil_type?: string;
}) {
  return useQuery({
    queryKey: ["farmer-groups", filters],
    queryFn: () => getFarmerGroups(filters),
  });
}

export function useFarmerGroup(id: string) {
  return useQuery({
    queryKey: ["farmer-group", id],
    queryFn: () => getFarmerGroupById(id),
    enabled: !!id,
  });
}

export function useUserGroups(profileId: string) {
  return useQuery({
    queryKey: ["user-groups", profileId],
    queryFn: () => getUserGroups(profileId),
    enabled: !!profileId,
  });
}

export function useCreateFarmerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (group: FarmerGroupInsert) => createFarmerGroup(group),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-groups"] });
    },
  });
}

export function useUpdateFarmerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<FarmerGroupInsert> }) =>
      updateFarmerGroup(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-groups"] });
      queryClient.invalidateQueries({ queryKey: ["farmer-group"] });
    },
  });
}

export function useDeleteFarmerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFarmerGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-groups"] });
    },
  });
}

export function useJoinFarmerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, profileId }: { groupId: string; profileId: string }) =>
      joinFarmerGroup(groupId, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-groups"] });
      queryClient.invalidateQueries({ queryKey: ["farmer-group"] });
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    },
  });
}

export function useLeaveFarmerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, profileId }: { groupId: string; profileId: string }) =>
      leaveFarmerGroup(groupId, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-groups"] });
      queryClient.invalidateQueries({ queryKey: ["farmer-group"] });
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    },
  });
}
