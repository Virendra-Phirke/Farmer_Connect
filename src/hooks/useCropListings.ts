import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCropListings,
  getCropListingById,
  createCropListing,
  updateCropListing,
  deleteCropListing,
  CropListingInsert,
} from "@/lib/api";

export function useCropListings(filters?: {
  status?: string;
  farmer_id?: string;
}) {
  return useQuery({
    queryKey: ["crop-listings", filters],
    queryFn: () => getCropListings(filters),
  });
}

export function useCropListing(id: string) {
  return useQuery({
    queryKey: ["crop-listing", id],
    queryFn: () => getCropListingById(id),
    enabled: !!id,
  });
}

export function useCreateCropListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listing: CropListingInsert) => createCropListing(listing),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crop-listings"] });
    },
  });
}

export function useUpdateCropListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CropListingInsert> }) =>
      updateCropListing(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crop-listings"] });
      queryClient.invalidateQueries({ queryKey: ["crop-listing"] });
    },
  });
}

export function useDeleteCropListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCropListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crop-listings"] });
    },
  });
}
