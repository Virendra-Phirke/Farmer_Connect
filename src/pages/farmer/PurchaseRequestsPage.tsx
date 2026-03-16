import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useFarmerPurchaseRequests, useUpdatePurchaseRequest } from "@/hooks/usePurchaseRequests";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, Check, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BillReceiptDialog from "@/components/BillReceiptDialog";

const PurchaseRequestsPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [selectedBill, setSelectedBill] = useState<any>(null);
    const [isBillOpen, setIsBillOpen] = useState(false);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    // Farmer sees requests where their crop_listing was targeted
    const { data: requests, isLoading } = useFarmerPurchaseRequests(profileId || "");
    const updateMutation = useUpdatePurchaseRequest();

    const pendingRequests = requests?.filter((req: any) => req.status === "pending") || [];
    const historyRequests = requests?.filter((req: any) => req.status !== "pending") || [];

    const handleAccept = (req: any) => {
        updateMutation.mutate({ id: req.id, updates: { status: "accepted", payment_status: "unpaid" } }, {        
            onSuccess: (updatedData: any) => {
                toast.success("Request accepted! Bill generated.");
                showBill(req, "unpaid", updatedData?.billing_id || req.billing_id);
            },
            onError: () => toast.error("Failed to update"),
        });
    };

    const handleReject = (id: string) => {
        updateMutation.mutate({ id, updates: { status: "rejected" } }, {        
            onSuccess: () => toast.success("Request rejected"),
            onError: () => toast.error("Failed to update"),
        });
    };

    const handleMarkPaid = async () => {
        const isActualSeller = selectedBill?.originalRecord?.crop_listing?.farmer_id === profileId;
        if (selectedBill?.originalRecord?.id && selectedBill?.originalRecord?.payment_status !== "paid" && isActualSeller) {
            try {
                await updateMutation.mutateAsync({
                    id: selectedBill.originalRecord.id,
                    updates: { payment_status: "paid" }
                });
                setIsBillOpen(false);
                toast.success("Payment marked as complete.");
            } catch {
                toast.error("Failed to mark payment as complete.");
            }
        }
    };

    const showBill = (req: any, paymentStatusOverride?: string, billingIdOverride?: string) => {
        const buyerName = req.buyer?.full_name || "Buyer";
        const buyerLocation = req.buyer?.location || "N/A";
        const buyerState = req.buyer?.state || undefined;
        const buyerDistrict = req.buyer?.district || undefined;
        const buyerTaluka = req.buyer?.taluka || undefined;
        const buyerVillageCity = req.buyer?.village_city || undefined;
        const cropName = req.crop_listing?.crop_name || "Crop";
        const computedAmount = req.total_amount || (req.quantity_kg * req.offered_price);
        const quantity = Number(req.quantity_kg || 0);
        const unitPrice = Number(req.offered_price || 0);
        const billId = billingIdOverride || req.billing_id || `INV-PR-${req.id.slice(0, 8).toUpperCase()}`;

        // Get seller data - prefer crop_listing.farmer, fallback to current user
        const farmer = req.crop_listing?.farmer;
        const sellerName = farmer?.full_name || user?.fullName || "Seller";
        const sellerEmail = farmer?.email || user?.primaryEmailAddress?.emailAddress;
        // For phone and location, prefer farmer data but fallback to current user (since farmer might not have filled profile yet)
        const sellerPhone = farmer?.phone || user?.phoneNumbers?.[0]?.phoneNumber;
        const sellerLocation = farmer?.location;
        const sellerState = farmer?.state;
        const sellerDistrict = farmer?.district;
        const sellerTaluka = farmer?.taluka;
        const sellerVillageCity = farmer?.village_city;

        setSelectedBill({
            title: `${cropName} - Purchase Request`,
            receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
            billId,
            billingId: billId,
            transactionId: req.id,
            date: new Date(req.created_at || new Date()).toLocaleDateString(),
            paymentConfirmedAt: req.payment_status === "paid" ? new Date(req.updated_at || req.created_at).toLocaleString() : undefined,
            amount: computedAmount,
            paymentStatus: paymentStatusOverride || req.payment_status || "unpaid",
            status: req.status || "accepted",
            transactionType: "Produce Sale",
            buyerName,
            buyer: {
                id: req.buyer?.id,
                name: buyerName,
                phone: req.buyer?.phone,
                email: req.buyer?.email,
                address: buyerLocation,
                state: buyerState,
                district: buyerDistrict,
                taluka: buyerTaluka,
                village_city: buyerVillageCity,
            },
            seller: {
                id: farmer?.id || profileId,
                name: sellerName,
                phone: sellerPhone,
                email: sellerEmail,
                address: sellerLocation,
                state: sellerState,
                district: sellerDistrict,
                taluka: sellerTaluka,
                village_city: sellerVillageCity,
            },
            lineItems: [
                {
                    description: `${cropName} (${quantity} kg)`,
                    quantity,
                    unitPrice,
                    amount: computedAmount,
                }
            ],
            subtotal: computedAmount,
            taxRate: 0,
            taxAmount: 0,
            total: computedAmount,
            notes: req.message || undefined,
            cropDetails: `${req.quantity_kg}kg of ${cropName} @ ₹${req.offered_price}/kg`,
            originalRecord: req
        });
        setIsBillOpen(true);
    };

    return (
        <DashboardLayout subtitle="View and manage incoming purchase requests.">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> Purchase Requests</h2>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <Tabs defaultValue="pending" className="w-full">
                        <TabsList className="mb-6 grid w-full grid-cols-2 md:w-[400px]">
                            <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
                            <TabsTrigger value="history">History ({historyRequests.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending">
                            {!pendingRequests.length ? (
                                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No pending purchase requests.</div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingRequests.map((req: any) => (
                                        <div key={req.id} className="bg-card rounded-xl border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <p className="font-semibold">Item: {req.crop_listing?.crop_name || "Crop"}</p>
                                                <p className="text-sm">Qty: {req.quantity_kg} kg @ ₹{req.offered_price}/kg</p>
                                                <p className="text-sm text-muted-foreground">Type: {req.request_type}</p>
                                                <p className="text-xs text-muted-foreground mt-1">Buyer: {req.buyer?.full_name || "Buyer"} • {req.buyer?.phone || "N/A"} • {req.buyer?.location || "N/A"}</p>
                                                {req.message && <p className="text-sm mt-1">{req.message}</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleAccept(req)} disabled={updateMutation.isPending}><Check className="mr-1 h-4 w-4" /> Accept</Button>
                                                <Button size="sm" variant="outline" onClick={() => handleReject(req.id)} disabled={updateMutation.isPending}><X className="mr-1 h-4 w-4" /> Reject</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="history">
                            {!historyRequests.length ? (
                                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No purchase history found.</div>
                            ) : (
                                <div className="space-y-4">
                                    {historyRequests.map((req: any) => (
                                        <div key={req.id} className="bg-card border border-border p-6 flex flex-col sm:flex-row justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold">{req.crop_listing?.crop_name || "Crop"} • {req.quantity_kg} kg @ ₹{req.offered_price}/kg</p>
                                                    {req.status === "accepted" && <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-md text-xs font-medium">Accepted</span>}
                                                    {req.status !== "rejected" && (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${
                                                            req.payment_status === 'paid' ? 
                                                            'bg-green-100 text-green-700 border-green-200' : 
                                                            'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                        }`}>
                                                            {req.payment_status?.toUpperCase() || "UNPAID"}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-foreground/80 mb-2">Total Amount: <span className="font-semibold">₹{req.total_amount || (req.quantity_kg * req.offered_price)}</span></p>
                                                <div className="text-xs text-muted-foreground flex flex-col gap-1">
                                                    <p>Buyer: {req.buyer?.full_name || 'Individual Buyer'}</p>
                                                    <p>Phone: {req.buyer?.phone || 'N/A'}</p>
                                                    <p>Location: {req.buyer?.location || 'N/A'}</p>
                                                    <p>Date: {new Date(req.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {req.status !== "rejected" && (
                                                    <Button size="sm" variant="outline" onClick={() => showBill(req)} className="flex items-center gap-1">
                                                        <FileText className="h-4 w-4" /> View Bill
                                                    </Button>
                                                )}
                                                {req.status === "rejected" && <span className="text-sm text-red-500 font-medium bg-red-50 px-2 py-1 rounded">Rejected</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </div>

            <BillReceiptDialog
                isOpen={isBillOpen}
                onClose={() => setIsBillOpen(false)}
                billData={selectedBill}
                canMarkPaid={selectedBill?.originalRecord?.crop_listing?.farmer_id === profileId}
                onMarkPaid={handleMarkPaid}
                isLoading={updateMutation.isPending}
            />
        </DashboardLayout>
    );
};

export default PurchaseRequestsPage;
