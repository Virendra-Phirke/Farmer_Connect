import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getEquipmentBookings,
    getEquipmentBookingById,
    createEquipmentBooking,
    updateEquipmentBooking,
    cancelEquipmentBooking,
    completeEquipmentBooking,
    getOwnerBookings,
    EquipmentBookingInsert,
} from "@/lib/api";

export function useEquipmentBookings(filters?: {
    equipment_id?: string;
    renter_id?: string;
    status?: string;
}, options?: { enabled?: boolean; refetchInterval?: number | false }) {
    const idFilter = filters?.renter_id ?? filters?.equipment_id;
    const hasIdFilter = "renter_id" in (filters ?? {}) || "equipment_id" in (filters ?? {});
    return useQuery({
        queryKey: ["equipment-bookings", filters],
        queryFn: () => getEquipmentBookings(filters),
        enabled: options?.enabled !== undefined ? options.enabled : (!hasIdFilter || !!idFilter),
        refetchInterval: options?.refetchInterval,
    });
}

export function useEquipmentBooking(id: string) {
    return useQuery({
        queryKey: ["equipment-booking", id],
        queryFn: () => getEquipmentBookingById(id),
        enabled: !!id,
    });
}

export function useOwnerBookings(ownerId: string, options?: { enabled?: boolean; refetchInterval?: number | false }) {
    return useQuery({
        queryKey: ["owner-bookings", ownerId],
        queryFn: () => getOwnerBookings(ownerId),
        enabled: options?.enabled !== undefined ? options.enabled : !!ownerId,
        refetchInterval: options?.refetchInterval,
    });
}

export function useCreateEquipmentBooking() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (booking: EquipmentBookingInsert) => createEquipmentBooking(booking),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipment-bookings"] });
            queryClient.invalidateQueries({ queryKey: ["equipment-listings"] });
            queryClient.invalidateQueries({ queryKey: ["owner-bookings"] });
        },
    });
}

export function useUpdateEquipmentBooking() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<EquipmentBookingInsert> }) =>
            updateEquipmentBooking(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipment-bookings"] });
            queryClient.invalidateQueries({ queryKey: ["equipment-booking"] });
            queryClient.invalidateQueries({ queryKey: ["owner-bookings"] });
        },
    });
}

export function useCancelEquipmentBooking() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => cancelEquipmentBooking(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipment-bookings"] });
            queryClient.invalidateQueries({ queryKey: ["equipment-listings"] });
            queryClient.invalidateQueries({ queryKey: ["owner-bookings"] });
        },
    });
}

export function useCompleteEquipmentBooking() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => completeEquipmentBooking(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipment-bookings"] });
            queryClient.invalidateQueries({ queryKey: ["equipment-listings"] });
            queryClient.invalidateQueries({ queryKey: ["owner-bookings"] });
        },
    });
}
