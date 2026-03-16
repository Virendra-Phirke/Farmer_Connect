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
        { enabled: !!profileId, refetchInterval: 10000 }
    );
    const { data: rentalBookings } = useEquipmentBookings(
        profileId ? { renter_id: profileId } : undefined,
        { enabled: !!profileId }
    );
    const billingReadyRentals = rentalBookings?.filter((booking: any) => booking.status === "confirmed" || booking.status === "completed") || [];

    const openBill = (contract: any) => {
        const amount = Number(contract.total_amount ?? (Number(contract.price_per_kg || 0) * Number(contract.quantity_kg_per_delivery || 0)));
        const billId = contract.billing_id || `INV-SC-${contract.id.slice(0, 8).toUpperCase()}`;
        
        setSelectedBill({
            title: `${contract.crop_name} - Supply Contract`,
            receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
            source: "supply",
            billId,
            billingId: billId,
            transactionId: contract.id,
            transactionType: "Supply Contract Delivery",
            date: new Date(contract.created_at || new Date()).toLocaleDateString(),
            amount,
            paymentStatus: contract.payment_status || "unpaid",
            paymentConfirmedAt: contract.payment_status === "paid" ? new Date(contract.updated_at || contract.created_at).toLocaleString() : undefined,
            status: contract.status || "active",
            buyerName: contract.buyer?.full_name || "Buyer",
            buyer: {
                id: contract.buyer?.id,
                name: contract.buyer?.full_name || "Buyer",
                phone: contract.buyer?.phone,
                email: contract.buyer?.email,
                address: contract.buyer?.location,
                state: contract.buyer?.state,
                district: contract.buyer?.district,
                taluka: contract.buyer?.taluka,
                village_city: contract.buyer?.village_city,
            },
            seller: {
                id: contract.farmer?.id || profileId || undefined,
                name: contract.farmer?.full_name || user?.fullName || "Farmer",
                phone: contract.farmer?.phone || user?.phoneNumbers?.[0]?.phoneNumber,
                email: contract.farmer?.email || user?.primaryEmailAddress?.emailAddress || undefined,
                address: contract.farmer?.location,
                state: contract.farmer?.state,
                district: contract.farmer?.district,
                taluka: contract.farmer?.taluka,
                village_city: contract.farmer?.village_city,
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
        const billId = booking.billing_id || `INV-RENT-${booking.id.slice(0, 8).toUpperCase()}`;
        
        setSelectedBill({
            title: `${booking.equipment?.name || "Equipment"} - Equipment Rental`,
            receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
            source: "rental",
            billId,
            billingId: billId,
            transactionId: booking.id,
            transactionType: "Equipment Rental",
            date: new Date(booking.created_at || new Date()).toLocaleDateString(),
            amount,
            paymentStatus: getEquipmentPaymentStatus(booking),
            status: booking.status || "confirmed",
            buyerName: user?.fullName || "Renter",
            buyer: {
                id: booking.renter?.id || profileId || undefined,
                name: booking.renter?.full_name || user?.fullName || "Renter",
                phone: booking.renter?.phone,
                email: booking.renter?.email || user?.primaryEmailAddress?.emailAddress || undefined,
                address: booking.renter?.location,
                state: booking.renter?.state,
                district: booking.renter?.district,
                taluka: booking.renter?.taluka,
                village_city: booking.renter?.village_city,
            },
            seller: {
                id: booking.equipment?.owner?.id,
                name: booking.equipment?.owner?.full_name || "Equipment Owner",
                phone: booking.equipment?.owner?.phone,
                email: booking.equipment?.owner?.email,
                address: booking.equipment?.owner?.location,
                state: booking.equipment?.owner?.state,
                district: booking.equipment?.owner?.district,
                taluka: booking.equipment?.owner?.taluka,
                village_city: booking.equipment?.owner?.village_city,
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
                            <div key={c.id} className="bg-card rounded-xl border border-border p-4 sm:p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-lg">{c.crop_name}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-full ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs sm:text-sm">
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
