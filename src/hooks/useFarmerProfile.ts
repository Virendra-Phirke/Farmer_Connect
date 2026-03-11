import { useQuery } from "@tanstack/react-query";
import { getFarmerProfile } from "@/lib/api/farmers";

export function useFarmerProfile(profileId: string | null) {
    return useQuery({
        queryKey: ["farmer-profile", profileId],
        queryFn: () => getFarmerProfile(profileId!),
        enabled: !!profileId,
    });
}
