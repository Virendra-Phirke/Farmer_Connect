import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useEquipmentBookings } from "@/hooks/useEquipmentBookings";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, CalendarCheck, Check, X, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";
import { useToast } from "@/hooks/use-toast";

const RentalHistoryPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [isBillOpen, setIsBillOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const { toast } = useToast();

    const showBill = (booking: any) => {
        setSelectedBooking({
            billingId: booking.billing_id || `BILL-${booking.id}`,
            transactionType: "Equipment Rental",
            title: `${booking.equipment?.name || "Equipment"} (${booking.start_date} to ${booking.end_date})`,
            amount: booking.total_price,
            date: new Date(booking.created_at).toLocaleDateString(),
            buyerName: user?.fullName || "You",
            sellerName: booking.equipment?.owner?.full_name || "Unknown Owner",
            paymentStatus: getEquipmentPaymentStatus(booking),
            originalRecord: booking
        });
        setIsBillOpen(true);
    };

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: bookings, isLoading } = useEquipmentBookings(
        profileId ? { renter_id: profileId } : undefined,
        { enabled: !!profileId }
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "confirmed": return <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Confirmed</span>;
            case "cancelled": return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-sm font-medium"><X className="h-4 w-4" /> Cancelled</span>;
            case "completed": return <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Completed</span>;
            case "pending": return <span className="inline-flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md text-sm font-medium"><Clock className="h-4 w-4" /> Pending</span>;
            default: return <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded-md text-sm font-medium">{status}</span>;
        }
    }

    return (
        <DashboardLayout subtitle="View the history of all the equipment you've requested to rent.">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><CalendarCheck className="h-6 w-6" /> Rental History</h2>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !bookings?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">You haven't requested to rent any equipment yet.</div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking: any) => (
                            <div key={booking.id} className="bg-card rounded-xl border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-lg">{booking.equipment?.name || "Equipment"} <span className="text-muted-foreground text-sm font-normal">from {booking.equipment?.owner?.full_name || "Unknown Owner"}</span></p>
                                    <p className="text-sm">Dates: {booking.start_date} → {booking.end_date}</p>
                                    <p className="font-medium mt-1">Total Estimated Cost: ₹{booking.total_price}</p>
                                    {booking.notes && <p className="text-sm mt-1 text-muted-foreground">Note: {booking.notes}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(booking.status)}
                                    {booking.status === "completed" && (
                                        <Button size="sm" variant="outline" onClick={() => showBill(booking)} className="flex items-center gap-1">
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
                billDetails={selectedBooking}
                canMarkPaid={false}
            />
        </DashboardLayout>
    );
};

export default RentalHistoryPage;
