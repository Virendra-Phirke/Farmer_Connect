import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useSupplyContracts, useUpdateSupplyContract } from "@/hooks/useSupplyContracts";
import DashboardLayout from "@/components/DashboardLayout";
import { FileText, Check, X, Clock, Receipt } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SearchBar } from "@/components/SearchBar";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";
import { PageSkeleton } from "@/components/PageSkeleton";

const SupplyContractsPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [isBillOpen, setIsBillOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: contracts, isLoading } = useSupplyContracts(
        profileId ? { buyer_id: profileId } : undefined,
        { enabled: !!profileId, refetchInterval: 10000 }
    );
    const updateMutation = useUpdateSupplyContract();

    const pendingContracts = useMemo(
        () => contracts?.filter((c: any) => c.status === "pending") || [],
        [contracts]
    );
    const historyContracts = useMemo(
        () => contracts?.filter((c: any) => c.status !== "pending") || [],
        [contracts]
    );

    // Filter by search query
    const filteredPendingContracts = useMemo(
        () => pendingContracts.filter((c: any) =>
            c.crop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.farmer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [pendingContracts, searchQuery]
    );

    const filteredHistoryContracts = useMemo(
        () => historyContracts.filter((c: any) =>
            c.crop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.farmer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [historyContracts, searchQuery]
    );

    const showBill = (contract: any) => {
        const quantityPerDelivery = contract.quantity_kg_per_delivery ?? contract.quantity_per_delivery ?? 0;
        const computedAmount = Number(contract.total_amount ?? (Number(contract.price_per_kg || 0) * Number(quantityPerDelivery || 0)));
        const billId = contract.billing_id || `CONT-${contract.id.slice(0, 8).toUpperCase()}`;

        setSelectedContract({
            title: `${contract.crop_name} - Supply Contract`,
            receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
            billId,
            billingId: billId,
            transactionId: contract.id,
            transactionType: "Supply Contract Delivery",
            date: new Date(contract.start_date || contract.created_at).toLocaleDateString(),
            amount: computedAmount,
            paymentStatus: contract.payment_status || "unpaid",
            paymentQrUrl: contract.payment_qr_url || contract.farmer?.payment_qr_url,
            paymentReceiptUrl: contract.payment_receipt_url,
            paymentConfirmedAt: contract.payment_status === "paid" ? new Date(contract.updated_at || contract.created_at).toLocaleString() : undefined,
            status: contract.status || "pending",
            buyer: {
                id: contract.buyer?.id || profileId || undefined,
                name: contract.buyer?.full_name || user?.fullName || "Buyer",
                phone: contract.buyer?.phone,
                email: contract.buyer?.email || user?.primaryEmailAddress?.emailAddress || undefined,
                address: contract.buyer?.location,
                state: contract.buyer?.state,
                district: contract.buyer?.district,
                taluka: contract.buyer?.taluka,
                village_city: contract.buyer?.village_city,
            },
            seller: {
                id: contract.farmer?.id,
                name: contract.farmer?.full_name || "Farmer",
                phone: contract.farmer?.phone,
                email: contract.farmer?.email,
                address: contract.farmer?.location,
                state: contract.farmer?.state,
                district: contract.farmer?.district,
                taluka: contract.farmer?.taluka,
                village_city: contract.farmer?.village_city,
            },
            lineItems: [
                {
                    description: `${contract.crop_name} - ${contract.delivery_frequency} delivery (${quantityPerDelivery} kg)` ,
                    quantity: Number(quantityPerDelivery || 0),
                    unitPrice: Number(contract.price_per_kg || 0),
                    amount: computedAmount,
                }
            ],
            subtotal: computedAmount,
            taxRate: 0,
            taxAmount: 0,
            total: computedAmount,
            originalRecord: contract
        });
        setIsBillOpen(true);
    };

    const handleAccept = (contract: any) => {
        updateMutation.mutate({ id: contract.id, updates: { status: "active" } }, {
            onSuccess: () => {
                toast.success("Supply contract accepted and activated!");
                // Auto-open bill after accepting
                setTimeout(() => showBill(contract), 500);
            }
        });
    };

    const handleReject = (id: string) => {
        updateMutation.mutate({ id, updates: { status: "cancelled" } }, {
            onSuccess: () => toast.success("Supply contract proposal rejected.")
        });
    };

    const handleUploadPaymentReceipt = async (paymentReceiptDataUrl: string) => {
        if (!selectedContract?.originalRecord?.id) return;
        try {
            const updated = await updateMutation.mutateAsync({
                id: selectedContract.originalRecord.id,
                updates: { payment_receipt_url: paymentReceiptDataUrl } as any,
            });

            setSelectedContract((prev: any) => prev ? {
                ...prev,
                paymentReceiptUrl: paymentReceiptDataUrl,
                originalRecord: { ...prev.originalRecord, ...(updated || {}), payment_receipt_url: paymentReceiptDataUrl },
            } : prev);

            toast.success("Payment receipt uploaded. Seller has been notified to verify and confirm payment.");
        } catch {
            toast.error("Failed to upload payment receipt.");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "active": return <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Active</span>;
            case "cancelled": return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-sm font-medium"><X className="h-4 w-4" /> Cancelled</span>;
            case "completed": return <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Completed</span>;
            case "paused": return <span className="inline-flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md text-sm font-medium"><Clock className="h-4 w-4" /> Paused</span>;
            default: return <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded-md text-sm font-medium">{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
        }
    }

    return (
        <DashboardLayout subtitle="">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Supply Contracts</h2>

                <SearchBar 
                    placeholder="Search by crop name or farmer..." 
                    onSearch={setSearchQuery} 
                />

                {(!profileId || isLoading) ? (
                    <PageSkeleton type="list" />
                ) : (
                    <Tabs defaultValue="pending" className="w-full">
                        <TabsList className="mb-6 grid w-full grid-cols-2 md:w-[400px]">
                            <TabsTrigger value="pending">Pending Proposals ({pendingContracts.length})</TabsTrigger>
                            <TabsTrigger value="history">History ({historyContracts.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending">
                            {!pendingContracts.length ? (
                                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No pending supply contract proposals.</div>
                            ) : !filteredPendingContracts.length ? (
                                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No pending contracts match your search.</div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredPendingContracts.map((contract: any) => (
                                        <div key={contract.id} className="bg-card rounded-xl border border-border p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                                            <div>
                                                <p className="font-semibold text-lg">{contract.crop_name} <span className="text-muted-foreground font-normal text-sm">from {contract.farmer?.full_name || "Unknown Farmer"}</span></p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mt-2 text-sm">
                                                    <p><span className="text-muted-foreground">Quantity:</span> {contract.quantity_kg_per_delivery}kg / {contract.delivery_frequency}</p>
                                                    <p><span className="text-muted-foreground">Duration:</span> {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}</p>
                                                    <p><span className="text-muted-foreground">Price:</span> ₹{Number(contract.price_per_kg || 0)}/kg</p>
                                                    <p><span className="text-muted-foreground">Total/Delivery:</span> ₹{Number(contract.total_amount ?? (Number(contract.price_per_kg || 0) * Number(contract.quantity_kg_per_delivery || 0)))}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <Button size="sm" onClick={() => handleAccept(contract)} disabled={updateMutation.isPending}><Check className="mr-1 h-4 w-4" /> Accept & Bill</Button>
                                                <Button size="sm" variant="outline" onClick={() => handleReject(contract.id)} disabled={updateMutation.isPending}><X className="mr-1 h-4 w-4" /> Reject</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="history">
                            {!historyContracts.length ? (
                                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No supply contract history found.</div>
                            ) : !filteredHistoryContracts.length ? (
                                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No history contracts match your search.</div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredHistoryContracts.map((contract: any) => (
                                        <div key={contract.id} className="bg-card border border-border p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 opacity-80">
                                            <div>
                                                <p className="font-semibold text-lg">{contract.crop_name} <span className="text-muted-foreground font-normal text-sm">from {contract.farmer?.full_name || "Unknown Farmer"}</span></p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mt-2 text-sm">
                                                    <p><span className="text-muted-foreground">Quantity:</span> {contract.quantity_kg_per_delivery}kg / {contract.delivery_frequency}</p>
                                                    <p><span className="text-muted-foreground">Duration:</span> {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}</p>
                                                    <p><span className="text-muted-foreground">Price:</span> ₹{Number(contract.price_per_kg || 0)}/kg</p>
                                                    <p><span className="text-muted-foreground">Total/Delivery:</span> ₹{Number(contract.total_amount ?? (Number(contract.price_per_kg || 0) * Number(contract.quantity_kg_per_delivery || 0)))}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(contract.status)}
                                                </div>
                                                {contract.status === "active" && (
                                                    <Button size="sm" variant="outline" onClick={() => showBill(contract)} className="flex items-center gap-1 mt-2">
                                                        <Receipt className="h-4 w-4" /> View Delivery Bill
                                                    </Button>
                                                )}
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
                billDetails={selectedContract}
                canMarkPaid={false}
                canUploadPaymentReceipt={true}
                onUploadPaymentReceipt={handleUploadPaymentReceipt}
                isUploadingPaymentReceipt={updateMutation.isPending}
            />
        </DashboardLayout>
    );
};

export default SupplyContractsPage;
