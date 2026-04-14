import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useEquipmentBookings, useUpdateEquipmentBooking } from "@/hooks/useEquipmentBookings";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import DashboardLayout from "@/components/DashboardLayout";
import { CalendarCheck, Check, X, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";
import { PageSkeleton } from "@/components/PageSkeleton";
import { stripPaymentMarkerLines } from "@/lib/payment-markers";
import { useToast } from "@/hooks/use-toast";

const RentalHistoryPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [isBillOpen, setIsBillOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();
    const updateMutation = useUpdateEquipmentBooking();

    const showBill = (booking: any) => {
        const amount = Number(booking.total_price || 0);
        const billId = booking.billing_id || `INV-RENT-${booking.id.slice(0, 8).toUpperCase()}`;

        setSelectedBooking({
            title: `${booking.equipment?.name || "Equipment"} - Equipment Rental`,
            receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
            billId,
            billingId: billId,
            transactionId: booking.id,
            transactionType: "Equipment Rental",
            date: new Date(booking.created_at).toLocaleDateString(),
            amount,
            paymentStatus: getEquipmentPaymentStatus(booking),
            paymentQrUrl: booking.payment_qr_url || booking.equipment?.owner?.payment_qr_url,
            paymentReceiptUrl: booking.payment_receipt_url,
            status: booking.status,
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
            originalRecord: booking
        });
        setIsBillOpen(true);
    };

    const handleUploadPaymentReceipt = async (paymentReceiptDataUrl: string) => {
        if (!selectedBooking?.originalRecord?.id) return;
        try {
            const updated = await updateMutation.mutateAsync({
                id: selectedBooking.originalRecord.id,
                updates: { payment_receipt_url: paymentReceiptDataUrl } as any,
            });

            setSelectedBooking((prev: any) => prev ? {
                ...prev,
                paymentReceiptUrl: paymentReceiptDataUrl,
                originalRecord: { ...prev.originalRecord, ...(updated || {}), payment_receipt_url: paymentReceiptDataUrl },
            } : prev);

            toast({ title: "Receipt uploaded", description: "Seller has been notified to verify your payment receipt." });
        } catch {
            toast({ title: "Upload failed", description: "Could not upload payment receipt.", variant: "destructive" });
        }
    };

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: bookings, isLoading } = useEquipmentBookings(
        profileId ? { renter_id: profileId } : undefined,
        { enabled: !!profileId }
    );

    // Filter by search query
    const filteredBookings = bookings?.filter((booking: any) =>
        booking.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.equipment?.owner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

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
        <DashboardLayout subtitle="">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><CalendarCheck className="h-6 w-6" /> Rental History</h2>

                <SearchBar 
                    placeholder="Search by equipment name or owner..." 
                    onSearch={setSearchQuery} 
                />

                {(!profileId || isLoading) ? (
                    <PageSkeleton type="list" />
                ) : !bookings?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">You haven't requested to rent any equipment yet.</div>
                ) : !filteredBookings?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No rentals match your search.</div>
                ) : (
                    <div className="space-y-4">
                        {filteredBookings.map((booking: any) => (
                            <div key={booking.id} className="bg-card rounded-xl border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-lg">{booking.equipment?.name || "Equipment"} <span className="text-muted-foreground text-sm font-normal">from {booking.equipment?.owner?.full_name || "Unknown Owner"}</span></p>
                                    <p className="text-sm">Dates: {booking.start_date} → {booking.end_date}</p>
                                    <p className="font-medium mt-1">Total Estimated Cost: ₹{booking.total_price}</p>
                                    {stripPaymentMarkerLines(booking.notes) && <p className="text-sm mt-1 text-muted-foreground">Note: {stripPaymentMarkerLines(booking.notes)}</p>}
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
                canUploadPaymentReceipt={true}
                onUploadPaymentReceipt={handleUploadPaymentReceipt}
                isUploadingPaymentReceipt={updateMutation.isPending}
            />
        </DashboardLayout>
    );
};

export default RentalHistoryPage;
