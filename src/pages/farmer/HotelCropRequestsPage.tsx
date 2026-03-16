import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useOpenCropRequirements } from "@/hooks/useCropRequirements";
import { useCreateSupplyContract } from "@/hooks/useSupplyContracts";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { getProfileId } from "@/lib/supabase-auth";
import { Loader2, ArrowRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { SearchBar } from "@/components/SearchBar";

export default function HotelCropRequestsPage() {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [selectedReq, setSelectedReq] = useState<any>(null);
    const [proposedPrice, setProposedPrice] = useState("");
    const [confirmedProposal, setConfirmedProposal] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then(setProfileId);
        }
    }, [user?.id]);

    const { data: requirements, isLoading } = useOpenCropRequirements();
    const createContract = useCreateSupplyContract();

    // Filter by search query
    const filteredRequirements = requirements?.filter((req: any) =>
        req.crop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.hotel?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.hotel?.location?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleFulfill = () => {
        if (!profileId || !selectedReq || !proposedPrice) {
            toast.error("Please enter a price for your proposal");
            return;
        }

        const price = parseFloat(proposedPrice);
        if (isNaN(price) || price <= 0) {
            toast.error("Please enter a valid price");
            return;
        }

        createContract.mutate({
            farmer_id: profileId,
            buyer_id: selectedReq.hotel_id,
            crop_name: selectedReq.crop_name,
            quantity_kg_per_delivery: selectedReq.quantity_kg,
            delivery_frequency: "weekly",
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            price_per_kg: price,
            payment_status: "unpaid",
            status: "pending"
        }, {
            onSuccess: (data) => {
                // Show notification
                toast.success(`Supply proposal sent to ${selectedReq.hotel?.full_name || 'Hotel'} for ${selectedReq.crop_name}`);
                
                // Show confirmation bill
                setConfirmedProposal({
                    proposalId: data.id,
                    cropName: selectedReq.crop_name,
                    hotelName: selectedReq.hotel?.full_name || "Hotel",
                    quantity: selectedReq.quantity_kg,
                    pricePerKg: price,
                    totalPerDelivery: price * selectedReq.quantity_kg,
                    frequency: "weekly",
                    startDate: new Date().toLocaleDateString(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                });
                setSelectedReq(null);
                setProposedPrice("");
            },
            onError: (error: any) => {
                toast.error(error?.message || "Failed to send supply proposal. Please try again.");
            }
        });
    };

    return (
        <DashboardLayout subtitle="Fulfill crop demands directly from local hotels and restaurants">
            <div className="space-y-6">
                <SearchBar 
                    placeholder="Search by crop name or hotel..." 
                    onSearch={setSearchQuery} 
                />
                
                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : requirements?.length === 0 ? (
                    <div className="text-center p-12 bg-card rounded-xl border border-border text-muted-foreground">
                        There are currently no open crop requirements from hotels. Check back later!
                    </div>
                ) : !filteredRequirements?.length ? (
                    <div className="text-center p-12 bg-card rounded-xl border border-border text-muted-foreground">
                        No crop requirements match your search. Try adjusting your filters.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRequirements?.map(req => (
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
                                onClick={() => setSelectedReq(req)}
                                disabled={createContract.isPending}
                            >
                                {createContract.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                                Propose Supply Contract
                            </Button>
                        </div>
                    ))}
                </div>
            )}
            </div>

            {/* Price Proposal Dialog */}
            <Dialog open={!!selectedReq} onOpenChange={(open) => !open && (setSelectedReq(null), setProposedPrice(""))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Propose Supply Contract</DialogTitle>
                        <DialogDescription>
                            Set your price for {selectedReq?.crop_name} to be delivered to {selectedReq?.hotel?.full_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Crop & Quantity</label>
                            <div className="mt-1 p-3 bg-muted rounded-lg">
                                <p className="font-semibold">{selectedReq?.crop_name}</p>
                                <p className="text-sm text-muted-foreground">{selectedReq?.quantity_kg} kg / week</p>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Your Price per kg (₹) *</label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g. 45.50"
                                value={proposedPrice}
                                onChange={(e) => setProposedPrice(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {proposedPrice && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-muted-foreground">Total per delivery</p>
                                <p className="text-lg font-semibold text-blue-600">
                                    ₹{(parseFloat(proposedPrice) * (selectedReq?.quantity_kg || 0)).toFixed(2)}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="outline" onClick={() => (setSelectedReq(null), setProposedPrice(""))}>
                            Cancel
                        </Button>
                        <Button onClick={handleFulfill} disabled={createContract.isPending || !proposedPrice}>
                            {createContract.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Proposal
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirmation Bill Dialog - Shows after proposal sent */}
            <Dialog open={!!confirmedProposal} onOpenChange={(open) => !open && setConfirmedProposal(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                            <DialogTitle>Proposal Sent Successfully!</DialogTitle>
                        </div>
                        <DialogDescription>
                            Your supply contract proposal has been sent to {confirmedProposal?.hotelName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Proposal Summary */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Crop</span>
                                <span className="font-semibold">{confirmedProposal?.cropName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Buyer</span>
                                <span className="font-semibold">{confirmedProposal?.hotelName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Quantity/Delivery</span>
                                <span className="font-semibold">{confirmedProposal?.quantity} kg</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Price/kg</span>
                                <span className="font-semibold">₹{confirmedProposal?.pricePerKg}</span>
                            </div>
                            <div className="border-t border-green-200 pt-3 flex justify-between">
                                <span className="text-sm font-medium">Total per Delivery</span>
                                <span className="text-lg font-bold text-green-600">₹{confirmedProposal?.totalPerDelivery.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Contract Details */}
                        <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Frequency:</span> <span className="font-medium capitalize">{confirmedProposal?.frequency}</span></p>
                            <p><span className="text-muted-foreground">Start Date:</span> <span className="font-medium">{confirmedProposal?.startDate}</span></p>
                            <p><span className="text-muted-foreground">End Date:</span> <span className="font-medium">{confirmedProposal?.endDate}</span></p>
                            <p><span className="text-muted-foreground">Status:</span> <span className="font-medium text-yellow-600">Pending Acceptance</span></p>
                        </div>

                        {/* Info Message */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                                ℹ️ <strong>Next Steps:</strong> The hotel will review your proposal and accept or reject it. You'll receive a notification once they respond.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setConfirmedProposal(null)} className="w-full">
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
