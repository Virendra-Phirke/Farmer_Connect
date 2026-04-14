import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, ShoppingCart, Check, X, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";
import { PageSkeleton } from "@/components/PageSkeleton";

const PurchaseHistoryPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [isBillOpen, setIsBillOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const showBill = (req: any) => {
        const cropName = req.crop_listing?.crop_name || "Crop";
        const quantity = Number(req.quantity_kg || 0);
        const unitPrice = Number(req.offered_price || 0);
        const computedAmount = Number(req.total_amount ?? (quantity * unitPrice));
        const billId = req.billing_id || `INV-${req.id.slice(0, 8).toUpperCase()}`;

        setSelectedRequest({
            title: `${cropName} - Purchase Request`,
            receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
            billId,
            billingId: billId,
            transactionId: req.id,
            transactionType: "Produce Purchase",
            date: new Date(req.created_at || new Date()).toLocaleDateString(),
            amount: computedAmount,
            paymentStatus: req.payment_status || "unpaid",
            paymentConfirmedAt: req.payment_status === "paid" ? new Date(req.updated_at || req.created_at).toLocaleString() : undefined,
            status: req.status || "accepted",
            buyer: {
                id: req.buyer?.id || profileId || undefined,
                name: req.buyer?.full_name || user?.fullName || "Buyer",
                phone: req.buyer?.phone,
                email: req.buyer?.email || user?.primaryEmailAddress?.emailAddress || undefined,
                address: req.buyer?.location,
                state: req.buyer?.state,
                district: req.buyer?.district,
                taluka: req.buyer?.taluka,
                village_city: req.buyer?.village_city,
            },
            seller: {
                id: req.crop_listing?.farmer?.id,
                name: req.crop_listing?.farmer?.full_name || "Farmer",
                phone: req.crop_listing?.farmer?.phone,
                email: req.crop_listing?.farmer?.email,
                address: req.crop_listing?.farmer?.location || req.crop_listing?.location,
                state: req.crop_listing?.farmer?.state,
                district: req.crop_listing?.farmer?.district,
                taluka: req.crop_listing?.farmer?.taluka,
                village_city: req.crop_listing?.farmer?.village_city,
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
            originalRecord: req
        });
        setIsBillOpen(true);
    };

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: requests, isLoading } = usePurchaseRequests(
        profileId ? { buyer_id: profileId } : undefined,
        { enabled: !!profileId }
    );

    // Filter by search query
    const filteredRequests = requests?.filter((req: any) =>
        req.crop_listing?.crop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.crop_listing?.farmer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "accepted": return <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Accepted</span>;
            case "rejected": return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-sm font-medium"><X className="h-4 w-4" /> Rejected</span>;
            case "completed": return <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Completed</span>;
            case "pending": return <span className="inline-flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md text-sm font-medium"><Clock className="h-4 w-4" /> Pending</span>;
            default: return <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded-md text-sm font-medium">{status}</span>;
        }
    }

    return (
        <DashboardLayout subtitle="">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> Purchase History</h2>

                <SearchBar 
                    placeholder="Search by crop name or farmer..." 
                    onSearch={setSearchQuery} 
                />

                {(!profileId || isLoading) ? (
                    <PageSkeleton type="list" />
                ) : !requests?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">You haven't requested to buy any produce yet.</div>
                ) : !filteredRequests?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No purchases match your search.</div>
                ) : (
                    <div className="space-y-4">
                        {filteredRequests.map((req: any) => (
                            <div key={req.id} className="bg-card rounded-xl border border-border p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-semibold text-lg">{req.crop_listing?.crop_name || "Crop"} <span className="text-muted-foreground font-normal text-sm">from {req.crop_listing?.farmer?.full_name || "Unknown Farmer"}</span></p>
                                        {req.status === "accepted" && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${
                                                req.payment_status === 'paid' ? 
                                                'bg-green-100 text-green-700 border-green-200' : 
                                                'bg-yellow-100 text-yellow-700 border-yellow-200'
                                            }`}>
                                                {req.payment_status?.toUpperCase() || "UNPAID"}
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-medium mt-1">Requested Qty: {req.quantity_kg} kg @ ₹{req.offered_price}/kg</p>
                                    <p className="text-sm mt-1">Total Amount: <span className="font-semibold text-foreground">₹{Number(req.total_amount ?? (Number(req.quantity_kg || 0) * Number(req.offered_price || 0)))}</span></p>
                                    {req.message && <p className="text-sm mt-1 text-muted-foreground">Note: {req.message}</p>}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(req.status)}
                                    </div>
                                    {req.status === "accepted" && (
                                        <Button size="sm" variant="outline" onClick={() => showBill(req)} className="flex items-center gap-1 mt-2">
                                            <FileText className="h-4 w-4" /> View Bill
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <BillReceiptDialog 
                isOpen={isBillOpen} 
                onClose={() => setIsBillOpen(false)}
                billDetails={selectedRequest}
                canMarkPaid={false} // Buyer can't mark it paid, seller marks paid
            />
        </DashboardLayout>
    );
};

export default PurchaseHistoryPage;
