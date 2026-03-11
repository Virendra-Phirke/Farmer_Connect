import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getOpenCropRequirements,
    getMyCropRequirements,
    createCropRequirement,
    updateCropRequirementStatus,
    deleteCropRequirement,
    CreateRequirementInput,
    HotelCropRequirement
} from "../lib/api/hotel-crop-requirements";
import { toast } from "sonner";

export const useOpenCropRequirements = () => {
    return useQuery({
        queryKey: ["openCropRequirements"],
        queryFn: getOpenCropRequirements,
    });
};

export const useMyCropRequirements = (profileId: string | undefined) => {
    return useQuery({
        queryKey: ["myCropRequirements", profileId],
        queryFn: () => getMyCropRequirements(profileId!),
        enabled: !!profileId,
    });
};

export const useCreateCropRequirement = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateRequirementInput) => createCropRequirement(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["myCropRequirements"] });
            queryClient.invalidateQueries({ queryKey: ["openCropRequirements"] });
            toast.success("Crop requirement posted successfully");
        },
        onError: (error) => {
            toast.error("Failed to post crop requirement");
            console.error(error);
        },
    });
};

export const useUpdateCropRequirementStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: HotelCropRequirement["status"] }) =>
            updateCropRequirementStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["myCropRequirements"] });
            queryClient.invalidateQueries({ queryKey: ["openCropRequirements"] });
            toast.success("Crop requirement status updated");
        },
        onError: (error) => {
            toast.error("Failed to update status");
            console.error(error);
        },
    });
};

export const useDeleteCropRequirement = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteCropRequirement(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["myCropRequirements"] });
            queryClient.invalidateQueries({ queryKey: ["openCropRequirements"] });
            toast.success("Crop requirement deleted");
        },
        onError: (error) => {
            toast.error("Failed to delete crop requirement");
            console.error(error);
        },
    });
};
