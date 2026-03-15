import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getPurchaseRequests,
    getPurchaseRequestById,
    createPurchaseRequest,
    updatePurchaseRequest,
    acceptPurchaseRequest,
    rejectPurchaseRequest,
    completePurchaseRequest,
    deletePurchaseRequest,
    getFarmerPurchaseRequests,
    PurchaseRequestInsert,
} from "@/lib/api";

export function usePurchaseRequests(filters?: {
    buyer_id?: string;
    crop_listing_id?: string;
    status?: string;
    request_type?: string;
}, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ["purchase-requests", filters],
        queryFn: () => getPurchaseRequests(filters),
        enabled: options?.enabled !== undefined ? options.enabled : true,
    });
}

export function usePurchaseRequest(id: string) {
    return useQuery({
        queryKey: ["purchase-request", id],
        queryFn: () => getPurchaseRequestById(id),
        enabled: !!id,
    });
}

export function useFarmerPurchaseRequests(farmerId: string) {
    return useQuery({
        queryKey: ["farmer-purchase-requests", farmerId],
        queryFn: () => getFarmerPurchaseRequests(farmerId),
        enabled: !!farmerId,
    });
}

export function useCreatePurchaseRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: PurchaseRequestInsert) => createPurchaseRequest(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
            queryClient.invalidateQueries({ queryKey: ["farmer-purchase-requests"] });
        },
    });
}

export function useUpdatePurchaseRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<PurchaseRequestInsert> }) =>
            updatePurchaseRequest(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
            queryClient.invalidateQueries({ queryKey: ["purchase-request"] });
            queryClient.invalidateQueries({ queryKey: ["farmer-purchase-requests"] });
        },
    });
}

export function useAcceptPurchaseRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => acceptPurchaseRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
            queryClient.invalidateQueries({ queryKey: ["farmer-purchase-requests"] });
        },
    });
}

export function useRejectPurchaseRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => rejectPurchaseRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
            queryClient.invalidateQueries({ queryKey: ["farmer-purchase-requests"] });
        },
    });
}

export function useCompletePurchaseRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => completePurchaseRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
            queryClient.invalidateQueries({ queryKey: ["crop-listings"] });
            queryClient.invalidateQueries({ queryKey: ["farmer-purchase-requests"] });
        },
    });
}

export function useDeletePurchaseRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deletePurchaseRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
            queryClient.invalidateQueries({ queryKey: ["farmer-purchase-requests"] });
        },
    });
}
