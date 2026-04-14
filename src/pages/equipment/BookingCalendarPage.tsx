import { useEffect, useState, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId, updateUserProfile } from "@/lib/supabase-auth";
import { useOwnerBookings, useUpdateEquipmentBooking } from "@/hooks/useEquipmentBookings";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Users, FileText, Search, X,
    Tractor, Calendar, IndianRupee, ChevronRight,
    Receipt, CheckCircle2, Clock, Package,
} from "lucide-react";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/PageSkeleton";
import { stripPaymentMarkerLines } from "@/lib/payment-markers";

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        confirmed: "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60",
        completed: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
        paid:      "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60",
        unpaid:    "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
    };
    const dot: Record<string, string> = {
        confirmed: "bg-green-500", completed: "bg-blue-500",
        paid: "bg-green-500", unpaid: "bg-amber-500",
    };
    const key = status?.toLowerCase() ?? "";
    const cls = map[key] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    const d   = dot[key] ?? "bg-slate-400";
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize flex-shrink-0 ${cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${d}`} />
            {status}
        </span>
    );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ Icon, children }: { Icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
            <Icon size={11} className="flex-shrink-0 opacity-60" />
            <span className="text-wrap-safe leading-snug">{children}</span>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle }: {
    icon: React.ElementType; title: string; subtitle: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center
            rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800
            bg-white dark:bg-slate-900/50">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4
                bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40">
                <Icon size={22} className="text-green-400 dark:text-green-600" />
            </div>
            <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</p>
            <p className="text-[12px] text-slate-400 dark:text-slate-500 max-w-xs">{subtitle}</p>
        </div>
    );
}

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, onViewBill }: {
    booking: any;
    onViewBill: () => void;
}) {
    const payStatus = getEquipmentPaymentStatus(booking);
    const isPaid    = payStatus === "paid";
    const visibleNotes = stripPaymentMarkerLines(booking.notes);

    return (
        <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800
            overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            {/* Accent bar */}
            <div className={`h-1 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                isPaid
                    ? "bg-gradient-to-r from-blue-500 to-blue-600"
                    : "bg-gradient-to-r from-green-500 to-green-600"
            }`} />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center
                            bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40">
                            <Tractor size={18} className="text-green-700 dark:text-green-400" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight text-wrap-safe">
                                {booking.equipment?.name || "Equipment"}
                            </h3>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                <Calendar size={10} />
                                <span>{booking.start_date} → {booking.end_date}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <StatusBadge status={booking.status} />
                        <StatusBadge status={payStatus} />
                    </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl mb-4
                    bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5 flex items-center gap-1">
                            <IndianRupee size={9} /> Amount
                        </p>
                        <p className="text-[15px] font-bold text-green-700 dark:text-green-400">
                            ₹{Number(booking.total_price || 0).toLocaleString("en-IN")}
                        </p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5 flex items-center gap-1">
                            <Package size={9} /> Equipment
                        </p>
                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 text-wrap-safe leading-snug">
                            {booking.equipment?.type || booking.equipment?.category || "—"}
                        </p>
                    </div>
                </div>

                {/* Renter info */}
                <div className="flex flex-col gap-1 mb-4 pl-0.5">
                    <InfoRow Icon={Users}>{booking.renter?.full_name || "Renter"}</InfoRow>
                    {booking.renter?.phone    && <InfoRow Icon={Receipt}>{booking.renter.phone}</InfoRow>}
                    {booking.renter?.location && <InfoRow Icon={Calendar}>{booking.renter.location}</InfoRow>}
                    {visibleNotes             && <InfoRow Icon={FileText}>{visibleNotes}</InfoRow>}
                </div>

                {/* View bill button */}
                <button type="button" onClick={onViewBill}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold
                        border border-slate-200 dark:border-slate-700
                        text-slate-600 dark:text-slate-300
                        bg-white dark:bg-slate-800
                        hover:border-green-300 dark:hover:border-green-700
                        hover:bg-green-50 dark:hover:bg-green-950/30
                        hover:text-green-800 dark:hover:text-green-300
                        transition-all">
                    <Receipt size={13} /> View Bill <ChevronRight size={12} className="opacity-50" />
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const BookingCalendarPage = () => {
    const { user } = useUser();
    const [profileId,      setProfileId]      = useState<string | null>(null);
    const [isBillOpen,     setIsBillOpen]      = useState(false);
    const [selectedBooking,setSelectedBooking] = useState<any>(null);
    const [searchQuery,    setSearchQuery]     = useState("");

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: bookings, isLoading } = useOwnerBookings(profileId || "");
    const updateMutation = useUpdateEquipmentBooking();

    const confirmedBookings = useMemo(
        () => bookings?.filter((b: any) => b.status === "confirmed" || b.status === "completed") ?? [],
        [bookings]
    );

    const filteredBookings = useMemo(
        () => confirmedBookings.filter((b: any) =>
            b.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.renter?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [confirmedBookings, searchQuery]
    );

    // ── Stats ──────────────────────────────────────────────────────────────────
    const totalRevenue = confirmedBookings.reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
    const paidCount    = confirmedBookings.filter((b: any) => getEquipmentPaymentStatus(b) === "paid").length;
    const pendingCount = confirmedBookings.filter((b: any) => getEquipmentPaymentStatus(b) !== "paid").length;

    const summaryStats = [
        { label: "Total",       val: confirmedBookings.length,                                          dot: "bg-slate-400" },
        { label: "Paid",        val: paidCount,                                                         dot: "bg-green-500" },
        { label: "Pending Pay", val: pendingCount,                                                      dot: "bg-amber-500" },
        { label: "Revenue",     val: `₹${totalRevenue.toLocaleString("en-IN")}`,                       dot: "bg-blue-500"  },
    ];

    // ── Bill helpers ───────────────────────────────────────────────────────────
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
            paymentQrUrl: booking.payment_qr_url || booking.equipment?.owner?.payment_qr_url,
            paymentReceiptUrl: booking.payment_receipt_url,
            paymentConfirmedAt: getEquipmentPaymentStatus(booking) === "paid"
                ? new Date(booking.updated_at || booking.created_at).toLocaleString() : undefined,
            buyer: { id: booking.renter?.id, name: booking.renter?.full_name || "Renter", phone: booking.renter?.phone, email: booking.renter?.email, address: booking.renter?.location, state: booking.renter?.state, district: booking.renter?.district, taluka: booking.renter?.taluka, village_city: booking.renter?.village_city },
            seller: { id: booking.equipment?.owner?.id || profileId || undefined, name: booking.equipment?.owner?.full_name || user?.fullName || "Equipment Owner", phone: booking.equipment?.owner?.phone || user?.phoneNumbers?.[0]?.phoneNumber, email: booking.equipment?.owner?.email || user?.primaryEmailAddress?.emailAddress || undefined, address: booking.equipment?.owner?.location || booking.equipment?.location, state: booking.equipment?.owner?.state, district: booking.equipment?.owner?.district, taluka: booking.equipment?.owner?.taluka, village_city: booking.equipment?.owner?.village_city },
            lineItems: [{ description: booking.equipment?.name || "Equipment Rental", quantity: 1, unitPrice: amount, amount }],
            subtotal: amount, taxRate: 0, taxAmount: 0, total: amount,
            status: booking.status, originalRecord: booking,
        });
        setIsBillOpen(true);
    };

    const handleMarkPaid = async () => {
        const isActualSeller = selectedBooking?.originalRecord?.equipment?.owner_id === profileId;
        if (!selectedBooking?.originalRecord?.id || getEquipmentPaymentStatus(selectedBooking?.originalRecord) === "paid" || !isActualSeller) return;
        try {
            await updateMutation.mutateAsync({ id: selectedBooking.originalRecord.id, updates: { payment_status: "paid" } });
            setIsBillOpen(false);
            toast.success("Payment marked as complete.");
        } catch { toast.error("Failed to mark payment as complete."); }
    };

    const handleUploadPaymentQr = async (paymentQrDataUrl: string) => {
        const isActualSeller = selectedBooking?.originalRecord?.equipment?.owner_id === profileId;
        if (!selectedBooking?.originalRecord?.id || !isActualSeller) return;

        try {
            const updated = await updateMutation.mutateAsync({
                id: selectedBooking.originalRecord.id,
                updates: { payment_qr_url: paymentQrDataUrl } as any,
            });

            if (user?.id) {
                await updateUserProfile(user.id, { payment_qr_url: paymentQrDataUrl } as any);
            }

            setSelectedBooking((prev: any) => prev ? {
                ...prev,
                paymentQrUrl: paymentQrDataUrl,
                originalRecord: { ...prev.originalRecord, ...(updated || {}), payment_qr_url: paymentQrDataUrl },
            } : prev);
            toast.success("Payment QR uploaded.");
        } catch {
            toast.error("Failed to upload payment QR.");
        }
    };

    const loading = !profileId || isLoading;

    return (
        <DashboardLayout subtitle="">
            <div className="space-y-5 pb-8 w-full">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm
                            bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800">
                            <Users className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                                My Renters
                            </h1>
                            <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">
                                Track active &amp; completed equipment rentals
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search equipment or renter…"
                            className="w-full pl-8 pr-8 py-2 text-[13px] rounded-xl
                                bg-white dark:bg-slate-900
                                border border-slate-200 dark:border-slate-700
                                text-slate-800 dark:text-slate-200
                                placeholder:text-slate-400 dark:placeholder:text-slate-500
                                focus:outline-none focus:ring-2 focus:ring-green-400/20 focus:border-green-400 dark:focus:border-green-600
                                transition-all shadow-sm"
                        />
                        {searchQuery && (
                            <button type="button" onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Stats strip ── */}
                {!loading && confirmedBookings.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {summaryStats.map(s => (
                            <div key={s.label}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center gap-4 shadow-sm">
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                                <div className="min-w-0">
                                    <p className="text-[20px] sm:text-[24px] font-bold text-slate-900 dark:text-white leading-none break-all">{s.val}</p>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Content ── */}
                {loading ? (
                    <PageSkeleton type="list" />
                ) : !confirmedBookings.length ? (
                    <EmptyState icon={Tractor} title="No Confirmed Bookings"
                        subtitle="Confirmed and completed equipment rental bookings will appear here." />
                ) : !filteredBookings.length ? (
                    <EmptyState icon={Search} title="No Results"
                        subtitle="No bookings match your search. Try a different keyword." />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                        {filteredBookings.map((booking: any) => (
                            <BookingCard
                                key={booking.id}
                                booking={booking}
                                onViewBill={() => showBill(booking)}
                            />
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
                canUploadPaymentQr={selectedBooking?.originalRecord?.equipment?.owner_id === profileId}
                onUploadPaymentQr={handleUploadPaymentQr}
                isUploadingPaymentQr={updateMutation.isPending}
                isLoading={updateMutation.isPending}
            />
        </DashboardLayout>
    );
};

export default BookingCalendarPage;