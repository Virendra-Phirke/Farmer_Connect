import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useOwnerBookings, useUpdateEquipmentBooking } from "@/hooks/useEquipmentBookings";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";
import { toast } from "sonner";

const BookingCalendarPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [isBillOpen, setIsBillOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: bookings, isLoading } = useOwnerBookings(profileId || "");
    const updateMutation = useUpdateEquipmentBooking();
    const confirmedBookings = bookings?.filter((b: any) => b.status === "confirmed" || b.status === "completed") || [];

    const showBill = (booking: any) => {
        const amount = Number(booking.total_price || 0);
        setSelectedBooking({
            billingId: booking.billing_id || `BILL-${booking.id}`,
            transactionId: booking.id,
            transactionType: "Equipment Rental",
            title: `${booking.equipment?.name || "Equipment"} (${booking.start_date} to ${booking.end_date})`,
            amount,
            date: new Date(booking.created_at || new Date()).toLocaleDateString(),
            paymentStatus: getEquipmentPaymentStatus(booking),
            paymentConfirmedAt: getEquipmentPaymentStatus(booking) === "paid" ? new Date(booking.updated_at || booking.created_at).toLocaleString() : undefined,
            buyer: {
                id: booking.renter?.id,
                name: booking.renter?.full_name || "Renter",
                phone: booking.renter?.phone,
                address: booking.renter?.location,
            },
            seller: {
                id: profileId || undefined,
                name: user?.fullName || "Equipment Owner",
                email: user?.primaryEmailAddress?.emailAddress || undefined,
            },
            lineItems: [
                {
                    description: booking.equipment?.name || "Equipment Rental",
                    quantity: 1,
                    unitPrice: amount,
                    amount,
                }
            ],
            subtotal: amount,
            taxRate: 0,
            taxAmount: 0,
            total: amount,
            status: booking.status,
            originalRecord: booking,
        });
        setIsBillOpen(true);
    };

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

    return (
        <DashboardLayout subtitle="Track your active and completed equipment rentals.">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> My Renters</h2>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !confirmedBookings.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No confirmed bookings yet.</div>
                ) : (
                    <div className="space-y-4">
                        {confirmedBookings.map((booking: any) => (
                            <div key={booking.id} className="bg-card rounded-xl border border-border p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{booking.equipment?.name || "Equipment"}</p>
                                        <p className="font-semibold">📅 {booking.start_date} → {booking.end_date}</p>
                                        <p className="text-sm text-muted-foreground">Total: ₹{booking.total_price}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Renter: {booking.renter?.full_name || "Renter"} • {booking.renter?.phone || "N/A"} • {booking.renter?.location || "N/A"}</p>
                                        {booking.notes && <p className="text-sm mt-1">{booking.notes}</p>}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${booking.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{booking.status}</span>
                                        <span className={`text-xs px-2 py-1 rounded-full border ${getEquipmentPaymentStatus(booking) === "paid" ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>{getEquipmentPaymentStatus(booking).toUpperCase()}</span>
                                        <Button size="sm" variant="outline" onClick={() => showBill(booking)} className="flex items-center gap-1">
                                            <FileText className="h-4 w-4" /> View Bill
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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

export default BookingCalendarPage;
