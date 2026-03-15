import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useOwnerBookings, useUpdateEquipmentBooking } from "@/hooks/useEquipmentBookings";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarCheck, Check, X, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";

const RentalRequestsPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [isBillOpen, setIsBillOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: bookings, isLoading } = useOwnerBookings(profileId || "");
    const updateMutation = useUpdateEquipmentBooking();

    const handleMarkPaid = async () => {
        const isActualSeller = selectedBooking?.originalRecord?.equipment?.owner_id === profileId;
        if (!selectedBooking?.originalRecord?.id || getEquipmentPaymentStatus(selectedBooking?.originalRecord) === "paid" || !isActualSeller) return;
        try {
            await updateMutation.mutateAsync({
                id: selectedBooking.originalRecord.id,
                updates: { payment_status: "paid" }
            });
            setIsBillOpen(false);
            toast.success("Payment marked as complete.");
        } catch {
            toast.error("Failed to mark payment as complete.");
        }
    };

    const showBill = (booking: any) => {
        const amount = Number(booking.total_price || 0);
        const qty = booking.quantity || 1;
        const pricePerUnit = booking.equipment?.price_per_day || 0;
        setSelectedBooking({
            billingId: booking.billing_id || `BILL-${booking.id}`,
            receiptNumber: `RCPT-${(booking.billing_id || booking.id).toString().slice(0, 8).toUpperCase()}`,
            transactionId: booking.id,
            transactionType: "Equipment Rental",
            title: `${booking.equipment?.name || "Equipment"} (${booking.start_date} to ${booking.end_date})`,
            amount,
            date: new Date(booking.created_at).toLocaleDateString(),
            buyerName: booking.renter?.full_name || "Renter",
            sellerName: user?.fullName || "You",
            paymentConfirmedAt: getEquipmentPaymentStatus(booking) === "paid" ? new Date(booking.updated_at || booking.created_at).toLocaleString() : undefined,
            paymentStatus: getEquipmentPaymentStatus(booking),
            paymentMethod: "Cash / UPI / Bank Transfer",
            buyer: {
                id: booking.renter?.id,
                name: booking.renter?.full_name || "Renter",
                phone: booking.renter?.phone,
                email: booking.renter?.email,
                address: booking.renter?.location,
                state: booking.renter?.state,
                district: booking.renter?.district,
                taluka: booking.renter?.taluka,
                village_city: booking.renter?.village_city,
            },
            seller: {
                id: booking.equipment?.owner?.id || profileId || undefined,
                name: booking.equipment?.owner?.full_name || user?.fullName || "Equipment Owner",
                phone: booking.equipment?.owner?.phone,
                email: booking.equipment?.owner?.email || user?.primaryEmailAddress?.emailAddress || undefined,
                address: booking.equipment?.owner?.location,
                state: booking.equipment?.owner?.state,
                district: booking.equipment?.owner?.district,
                taluka: booking.equipment?.owner?.taluka,
                village_city: booking.equipment?.owner?.village_city,
            },
            lineItems: [
                {
                    description: `${booking.equipment?.name || "Equipment Rental"} (${qty} unit${qty > 1 ? 's' : ''})`,
                    quantity: qty,
                    unitPrice: pricePerUnit,
                    amount,
                }
            ],
            subtotal: amount,
            taxRate: 0,
            taxAmount: 0,
            total: amount,
            notes: booking.notes || undefined,
            status: booking.status,
            originalRecord: booking
        });
        setIsBillOpen(true);
    };

    const pendingBookings = bookings?.filter((b: any) => b.status === "pending") || [];
    const historyBookings = bookings?.filter((b: any) => b.status !== "pending") || [];

    return (
        <DashboardLayout subtitle="View and respond to rental requests for your equipment.">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><CalendarCheck className="h-6 w-6" /> Rental Requests</h2>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <Tabs defaultValue="pending" className="w-full">
                        <TabsList className="mb-6 grid w-full grid-cols-2 md:w-[400px]">
                            <TabsTrigger value="pending">Pending ({pendingBookings.length})</TabsTrigger>
                            <TabsTrigger value="history">History ({historyBookings.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending">
                            {!pendingBookings.length ? (
                                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No pending rental requests.</div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingBookings.map((booking: any) => (
                                        <div key={booking.id} className="bg-card rounded-xl border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <p className="font-semibold">Item: {booking.equipment?.name || "Equipment"}</p>
                                                <p className="text-sm text-muted-foreground">Qty: {booking.quantity || 1} unit{(booking.quantity || 1) > 1 ? 's' : ''} × ₹{booking.equipment?.price_per_day || 0}/day</p>
                                                <p className="font-semibold mt-2">{booking.start_date} → {booking.end_date}</p>
                                                <p className="text-sm text-muted-foreground mt-1">Total: ₹{booking.total_price}</p>
                                                <p className="text-xs text-muted-foreground mt-1">Buyer: {booking.renter?.full_name || "Renter"} • {booking.renter?.phone || "N/A"} • {booking.renter?.location || "N/A"}</p>
                                                {booking.notes && <p className="text-sm mt-1">{booking.notes}</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => updateMutation.mutate({ id: booking.id, updates: { status: "confirmed" } }, { onSuccess: () => toast.success("Confirmed!") })}><Check className="mr-1 h-4 w-4" /> Confirm</Button>
                                                <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: booking.id, updates: { status: "cancelled" } }, { onSuccess: () => toast.success("Cancelled") })}><X className="mr-1 h-4 w-4" /> Decline</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="history">
                            {!historyBookings.length ? (
                                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No rental history found.</div>
                            ) : (
                                <div className="space-y-4">
                                    {historyBookings.map((booking: any) => (
                                        <div key={booking.id} className="bg-card border border-border p-6 flex justify-between gap-4 opacity-75">
                                            <div>
                                                <p className="font-semibold">Item: {booking.equipment?.name || "Equipment"}</p>
                                                <p className="text-sm text-muted-foreground">Qty: {booking.quantity || 1} unit{(booking.quantity || 1) > 1 ? 's' : ''} × ₹{booking.equipment?.price_per_day || 0}/day</p>
                                                <p className="font-semibold mt-2">{booking.start_date} → {booking.end_date}</p>
                                                <p className="text-sm text-muted-foreground">Total: ₹{booking.total_price}</p>
                                                <p className="text-xs text-muted-foreground mt-1">Buyer: {booking.renter?.full_name || "Renter"} • {booking.renter?.phone || "N/A"} • {booking.renter?.location || "N/A"}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {booking.status === "confirmed" && <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Confirmed</span>}
                                                {booking.status === "cancelled" && <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-sm font-medium"><X className="h-4 w-4" /> Declined</span>}
                                                {booking.status === "completed" && (
                                                    <>
                                                        <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Completed</span>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium border ${
                                                            getEquipmentPaymentStatus(booking) === "paid"
                                                                ? "bg-green-100 text-green-700 border-green-200"
                                                                : "bg-yellow-100 text-yellow-700 border-yellow-200"
                                                        }`}>
                                                            {getEquipmentPaymentStatus(booking).toUpperCase()}
                                                        </span>
                                                        <Button size="sm" variant="outline" onClick={() => showBill(booking)} className="flex items-center gap-1 ml-2">
                                                            <FileText className="h-4 w-4" /> View Bill
                                                        </Button>
                                                    </>
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
                billDetails={selectedBooking}
                canMarkPaid={selectedBooking?.originalRecord?.equipment?.owner_id === profileId}
                onMarkPaid={handleMarkPaid}
                isLoading={updateMutation.isPending}
            />
        </DashboardLayout>
    );
};

export default RentalRequestsPage;
