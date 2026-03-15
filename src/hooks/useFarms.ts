import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFarmsByProfileId, createFarm, updateFarm, deleteFarm, Farm } from "@/lib/api/farms";

export const useFarms = (profileId: string | null) => {
    return useQuery({
        queryKey: ["farms", profileId],
        queryFn: () => (profileId ? getFarmsByProfileId(profileId) : Promise.resolve([])),
        enabled: !!profileId,
        staleTime: 5 * 60 * 1000,
    });
};

export const useCreateFarm = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ profileId, farm }: { profileId: string; farm: Omit<Farm, "id"> }) =>
            createFarm(profileId, farm),
        onSuccess: (_, { profileId }) => {
            queryClient.invalidateQueries({ queryKey: ["farms", profileId] });
        },
    });
};

export const useUpdateFarm = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ farmId, updates }: { farmId: string; updates: Partial<Farm> }) =>
            updateFarm(farmId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["farms"] });
        },
    });
};

export const useDeleteFarm = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (farmId: string) => deleteFarm(farmId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["farms"] });
        },
    });
};
