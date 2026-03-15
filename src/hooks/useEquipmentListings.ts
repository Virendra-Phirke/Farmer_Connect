import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEquipmentListings,
  getEquipmentListingById,
  createEquipmentListing,
  updateEquipmentListing,
  deleteEquipmentListing,
  EquipmentListingInsert,
} from '@/lib/api';

export function useEquipmentListings(filters?: {
  is_available?: boolean;
  owner_id?: string;
  category?: string;
  location?: string;
}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['equipment-listings', filters],
    queryFn: () => getEquipmentListings(filters),
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
}

export function useEquipmentListing(id: string) {
  return useQuery({
    queryKey: ['equipment-listing', id],
    queryFn: () => getEquipmentListingById(id),
    enabled: !!id,
  });
}

export function useCreateEquipmentListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listing: EquipmentListingInsert) => createEquipmentListing(listing),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-listings'] });
    },
  });
}

export function useUpdateEquipmentListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EquipmentListingInsert> }) =>
      updateEquipmentListing(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-listings'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-listing'] });
    },
  });
}

export function useDeleteEquipmentListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEquipmentListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-listings'] });
    },
  });
}
