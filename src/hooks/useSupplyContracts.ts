import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getSupplyContracts,
    getSupplyContractById,
    createSupplyContract,
    updateSupplyContract,
    pauseSupplyContract,
    resumeSupplyContract,
    cancelSupplyContract,
    completeSupplyContract,
    getFarmerActiveContractsCount,
    SupplyContractInsert,
} from "@/lib/api";

export function useSupplyContracts(filters?: {
    buyer_id?: string;
    farmer_id?: string;
    status?: string;
    crop_name?: string;
}, options?: { enabled?: boolean }) {
    const idFilter = filters?.farmer_id ?? filters?.buyer_id;
    const hasIdFilter = "farmer_id" in (filters ?? {}) || "buyer_id" in (filters ?? {});

    return useQuery({
        queryKey: ["supply-contracts", filters],
        queryFn: () => getSupplyContracts(filters),
        enabled: options?.enabled !== undefined ? options.enabled : (!hasIdFilter || !!idFilter),
    });
}

export function useSupplyContract(id: string) {
    return useQuery({
        queryKey: ["supply-contract", id],
        queryFn: () => getSupplyContractById(id),
        enabled: !!id,
    });
}

export function useFarmerActiveContractsCount(farmerId: string) {
    return useQuery({
        queryKey: ["farmer-active-contracts-count", farmerId],
        queryFn: () => getFarmerActiveContractsCount(farmerId),
        enabled: !!farmerId,
    });
}

export function useCreateSupplyContract() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (contract: SupplyContractInsert) => createSupplyContract(contract),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["supply-contracts"] });
            queryClient.invalidateQueries({ queryKey: ["farmer-active-contracts-count"] });
        },
    });
}

export function useUpdateSupplyContract() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<SupplyContractInsert> }) =>
            updateSupplyContract(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["supply-contracts"] });
            queryClient.invalidateQueries({ queryKey: ["supply-contract"] });
        },
    });
}

export function usePauseSupplyContract() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => pauseSupplyContract(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["supply-contracts"] });
        },
    });
}

export function useResumeSupplyContract() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => resumeSupplyContract(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["supply-contracts"] });
        },
    });
}

export function useCancelSupplyContract() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => cancelSupplyContract(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["supply-contracts"] });
            queryClient.invalidateQueries({ queryKey: ["farmer-active-contracts-count"] });
        },
    });
}

export function useCompleteSupplyContract() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => completeSupplyContract(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["supply-contracts"] });
            queryClient.invalidateQueries({ queryKey: ["farmer-active-contracts-count"] });
        },
    });
}
