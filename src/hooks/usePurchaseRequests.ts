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
}, options?: { enabled?: boolean; refetchInterval?: number | false }) {
    return useQuery({
        queryKey: ["purchase-requests", filters],
        queryFn: () => getPurchaseRequests(filters),
        enabled: options?.enabled !== undefined ? options.enabled : true,
        refetchInterval: options?.refetchInterval,
    });
}

export function usePurchaseRequest(id: string) {
    return useQuery({
        queryKey: ["purchase-request", id],
        queryFn: () => getPurchaseRequestById(id),
        enabled: !!id,
    });
}

export function useFarmerPurchaseRequests(farmerId: string, options?: { enabled?: boolean; refetchInterval?: number | false }) {
    return useQuery({
        queryKey: ["farmer-purchase-requests", farmerId],
        queryFn: () => getFarmerPurchaseRequests(farmerId),
        enabled: options?.enabled !== undefined ? options.enabled : !!farmerId,
        refetchInterval: options?.refetchInterval,
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
            console.log("[Accept Purchase Request] Success");
            queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
            queryClient.invalidateQueries({ queryKey: ["farmer-purchase-requests"] });
        },
        onError: (error: any) => {
            console.error("[Accept Purchase Request] Error:", {
                message: error?.message,
                code: error?.code,
                status: error?.status,
                details: error?.details,
                hint: error?.hint,
            });
        },
    });
}

export function useRejectPurchaseRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => rejectPurchaseRequest(id),
        onSuccess: () => {
            console.log("[Reject Purchase Request] Success");
            queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
            queryClient.invalidateQueries({ queryKey: ["farmer-purchase-requests"] });
        },
        onError: (error: any) => {
            console.error("[Reject Purchase Request] Error:", {
                message: error?.message,
                code: error?.code,
                status: error?.status,
                details: error?.details,
                hint: error?.hint,
            });
        },
    });
}

export function useCompletePurchaseRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => completePurchaseRequest(id),
        onSuccess: () => {
            console.log("[Complete Purchase Request] Success");
            queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
            queryClient.invalidateQueries({ queryKey: ["crop-listings"] });
            queryClient.invalidateQueries({ queryKey: ["farmer-purchase-requests"] });
        },
        onError: (error: any) => {
            console.error("[Complete Purchase Request] Error:", {
                message: error?.message,
                code: error?.code,
                status: error?.status,
                details: error?.details,
                hint: error?.hint,
            });
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
