import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useOpenCropRequirements } from "@/hooks/useCropRequirements";
import { useCreateSupplyContract } from "@/hooks/useSupplyContracts";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { getProfileId } from "@/lib/supabase-auth";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function HotelCropRequestsPage() {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then(setProfileId);
        }
    }, [user?.id]);

    const { data: requirements, isLoading } = useOpenCropRequirements();
    const createContract = useCreateSupplyContract();

    const handleFulfill = (reqId: string, hotelId: string, cropName: string, quantity: number) => {
        if (!profileId) return;

        createContract.mutate({
            farmer_id: profileId,
            buyer_id: hotelId,
            crop_name: cropName,
            quantity_kg_per_delivery: quantity,
            delivery_frequency: "weekly",
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price_per_kg: 0, // Negotiation starts here or fixed later
            status: "pending"
        }, {
            onSuccess: () => {
                toast.success(`Sent supply proposal to hotel for ${quantity}kg of ${cropName}!`);
            }
        });
    };

    return (
        <DashboardLayout subtitle="Fulfill crop demands directly from local hotels and restaurants">
            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : requirements?.length === 0 ? (
                <div className="text-center p-12 bg-card rounded-xl border border-border text-muted-foreground">
                    There are currently no open crop requirements from hotels. Check back later!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requirements?.map(req => (
                        <div key={req.id} className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold">{req.crop_name}</h3>
                                    <span className="bg-blue-500/10 text-blue-500 px-2 py-1 text-xs font-semibold rounded-full">
                                        Wanted
                                    </span>
                                </div>
                                <p className="text-3xl font-light text-primary mb-4">{req.quantity_kg} <span className="text-sm text-muted-foreground">kg</span></p>

                                <div className="space-y-2 mb-6">
                                    <p className="text-sm">
                                        <span className="text-muted-foreground">Buyer:</span> {req.hotel?.full_name || "Unknown Hotel"}
                                    </p>
                                    <p className="text-sm">
                                        <span className="text-muted-foreground">Required By:</span> {req.required_by_date ? new Date(req.required_by_date).toLocaleDateString() : 'ASAP'}
                                    </p>
                                    <p className="text-sm">
                                        <span className="text-muted-foreground">Location:</span> {req.hotel?.location || "Unknown"}
                                    </p>
                                </div>
                            </div>

                            <Button
                                className="w-full"
                                onClick={() => handleFulfill(req.id, req.hotel_id, req.crop_name, req.quantity_kg)}
                                disabled={createContract.isPending}
                            >
                                {createContract.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                                Propose Supply Contract
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
