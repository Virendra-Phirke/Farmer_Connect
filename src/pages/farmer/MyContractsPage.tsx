import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useSupplyContracts, useUpdateSupplyContract } from "@/hooks/useSupplyContracts";
import { useEquipmentBookings } from "@/hooks/useEquipmentBookings";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";
import { toast } from "sonner";

const MyContractsPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);

    const [isBillOpen, setIsBillOpen] = useState(false);
    const [selectedBill, setSelectedBill] = useState<any>(null);
    const updateContract = useUpdateSupplyContract();

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: contracts, isLoading } = useSupplyContracts(
        { farmer_id: profileId ?? "" },
        { enabled: !!profileId }
    );
    const { data: rentalBookings } = useEquipmentBookings(
        profileId ? { renter_id: profileId } : undefined,
        { enabled: !!profileId }
    );
    const billingReadyRentals = rentalBookings?.filter((booking: any) => booking.status === "confirmed" || booking.status === "completed") || [];

    const openBill = (contract: any) => {
        const amount = Number(contract.price_per_kg * contract.quantity_kg_per_delivery || 0);
        setSelectedBill({
            source: "supply",
            billId: contract.billing_id || `INV-SC-${contract.id.slice(0, 8).toUpperCase()}`,
            billingId: contract.billing_id || `INV-SC-${contract.id.slice(0, 8).toUpperCase()}`,
            transactionId: contract.id,
            transactionType: "Supply Contract Delivery",
            date: new Date(contract.created_at || new Date()).toLocaleDateString(),
            amount,
            paymentStatus: contract.payment_status || "unpaid",
            status: contract.status || "active",
            buyerName: contract.buyer?.full_name || "Buyer",
            buyer: {
                id: contract.buyer?.id,
                name: contract.buyer?.full_name || "Buyer",
                phone: contract.buyer?.phone,
                email: contract.buyer?.email,
                address: contract.buyer?.location,
            },
            seller: {
                id: profileId || undefined,
                name: user?.fullName || "Farmer",
                email: user?.primaryEmailAddress?.emailAddress || undefined,
            },
            lineItems: [
                {
                    description: `${contract.crop_name} (${contract.quantity_kg_per_delivery} kg/delivery)` ,
                    quantity: Number(contract.quantity_kg_per_delivery || 0),
                    unitPrice: Number(contract.price_per_kg || 0),
                    amount,
                }
            ],
            subtotal: amount,
            taxRate: 0,
            taxAmount: 0,
            total: amount,
            cropDetails: `${contract.crop_name} (${contract.quantity_kg_per_delivery} kg/delivery @ ₹${contract.price_per_kg}/kg)`,
            originalRecord: contract
        });
        setIsBillOpen(true);
    };

    const openRentalBill = (booking: any) => {
        const amount = Number(booking.total_price || 0);
        setSelectedBill({
            source: "rental",
            billId: booking.billing_id || `INV-RENT-${booking.id.slice(0, 8).toUpperCase()}`,
            billingId: booking.billing_id || `INV-RENT-${booking.id.slice(0, 8).toUpperCase()}`,
            transactionId: booking.id,
            transactionType: "Equipment Rental",
            date: new Date(booking.created_at || new Date()).toLocaleDateString(),
            amount,
            paymentStatus: getEquipmentPaymentStatus(booking),
            status: booking.status || "confirmed",
            buyerName: user?.fullName || "Renter",
            buyer: {
                id: profileId || undefined,
                name: user?.fullName || "Renter",
                email: user?.primaryEmailAddress?.emailAddress || undefined,
            },
            seller: {
                id: booking.equipment?.owner?.id,
                name: booking.equipment?.owner?.full_name || "Equipment Owner",
                phone: booking.equipment?.owner?.phone,
                address: booking.equipment?.owner?.location,
            },
            lineItems: [
                {
                    description: `${booking.equipment?.name || "Equipment"} (${booking.start_date} → ${booking.end_date})`,
                    quantity: 1,
                    unitPrice: amount,
                    amount,
                }
            ],
            subtotal: amount,
            taxRate: 0,
            taxAmount: 0,
            total: amount,
            cropDetails: `${booking.equipment?.name || "Equipment"} (${booking.start_date} → ${booking.end_date})`,
            originalRecord: booking
        });
        setIsBillOpen(true);
    };

    const handleMarkPaid = async () => {
        const isActualSeller = selectedBill?.source === "supply" && selectedBill?.originalRecord?.farmer_id === profileId;
        if (selectedBill && selectedBill.source === "supply" && isActualSeller && selectedBill?.originalRecord?.payment_status !== "paid") {
            try {
                await updateContract.mutateAsync({
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

    return (
        <DashboardLayout subtitle="Track your long-term supply contracts with buyers.">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> My Supply Contracts</h2>

                {!profileId || isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !contracts?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No supply contracts active. When buyers create contracts with you, they'll appear here.</div>
                ) : (
                    <div className="space-y-4">
                        {contracts.map((c: any) => (
                            <div key={c.id} className="bg-card rounded-xl border border-border p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-lg">{c.crop_name}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-full ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    <div><span className="text-muted-foreground">Qty/delivery:</span> {c.quantity_kg_per_delivery} kg</div>
                                    <div><span className="text-muted-foreground">Frequency:</span> {c.delivery_frequency}</div>
                                    <div><span className="text-muted-foreground">Price:</span> ₹{c.price_per_kg}/kg</div>
                                    <div><span className="text-muted-foreground">Period:</span> {c.start_date} → {c.end_date}</div>
                                </div>
                                {c.status === "active" && (
                                    <div className="mt-4 flex gap-2 justify-end">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openBill(c)}
                                        >
                                            <Receipt className="h-4 w-4 mr-2" />
                                            View Bill
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="pt-4 space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" /> Rental Equipment Billing</h2>
                    {!billingReadyRentals.length ? (
                        <div className="bg-card rounded-xl border border-border p-6 text-muted-foreground">
                            No rental equipment bills available yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {billingReadyRentals.map((booking: any) => (
                                <div key={booking.id} className="bg-card rounded-xl border border-border p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <p className="font-medium">{booking.equipment?.name || "Equipment"}</p>
                                        <p className="text-sm text-muted-foreground">{booking.start_date} → {booking.end_date}</p>
                                        <p className="text-sm">Amount: ₹{booking.total_price}</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => openRentalBill(booking)}>
                                        <Receipt className="h-4 w-4 mr-2" />
                                        View Rental Bill
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {selectedBill && (
                <BillReceiptDialog
                    isOpen={isBillOpen}
                    onClose={() => setIsBillOpen(false)}
                    billData={selectedBill}
                    canMarkPaid={selectedBill?.source === "supply" && selectedBill?.originalRecord?.farmer_id === profileId}
                    onMarkPaid={handleMarkPaid}
                    isLoading={updateContract.isPending}
                />
            )}
        </DashboardLayout>
    );
};

export default MyContractsPage;
