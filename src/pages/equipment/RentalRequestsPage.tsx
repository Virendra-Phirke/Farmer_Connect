import { useEffect, useState, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useOwnerBookings, useUpdateEquipmentBooking } from "@/hooks/useEquipmentBookings";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Loader2, CalendarCheck, Check, X, Clock,
    FileText, Search, Tractor, Calendar, IndianRupee,
    ChevronRight, Receipt, Users, Package, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        confirmed: "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60",
        completed: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
        cancelled: "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60",
        pending:   "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
        paid:      "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60",
        unpaid:    "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
    };
    const dot: Record<string, string> = {
        confirmed: "bg-green-500", completed: "bg-blue-500", cancelled: "bg-red-500",
        pending: "bg-amber-500", paid: "bg-green-500", unpaid: "bg-amber-500",
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
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Icon size={11} className="flex-shrink-0 opacity-60" />
            <span className="truncate">{children}</span>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle }: {
    icon: React.ElementType; title: string; subtitle: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center
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

// ─── Pending Booking Card ─────────────────────────────────────────────────────
function PendingCard({ booking, onConfirm, onDecline, isLoading }: {
    booking: any; onConfirm: () => void; onDecline: () => void; isLoading: boolean;
}) {
    const qty   = booking.quantity || 1;
    const ppd   = booking.equipment?.price_per_day || 0;
    const total = Number(booking.total_price || 0);
    return (
        <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800
            overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-amber-500
                opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center
                            bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                            <Tractor size={18} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                                {booking.equipment?.name || "Equipment"}
                            </h3>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                <Calendar size={10} />
                                <span>{booking.start_date} → {booking.end_date}</span>
                            </div>
                        </div>
                    </div>
                    <StatusBadge status="pending" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl mb-3
                    bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Qty</p>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{qty} <span className="text-[10px] font-normal text-slate-400">unit{qty > 1 ? "s" : ""}</span></p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Rate</p>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">₹{ppd}<span className="text-[10px] font-normal text-slate-400">/day</span></p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Total</p>
                        <p className="text-[13px] font-bold text-green-700 dark:text-green-400">₹{total.toLocaleString("en-IN")}</p>
                    </div>
                </div>

                {/* Renter info */}
                <div className="flex flex-col gap-1 mb-4 pl-0.5">
                    <InfoRow Icon={Users}>{booking.renter?.full_name || "Renter"}</InfoRow>
                    {booking.renter?.phone    && <InfoRow Icon={Receipt}>{booking.renter.phone}</InfoRow>}
                    {booking.renter?.location && <InfoRow Icon={Calendar}>{booking.renter.location}</InfoRow>}
                    {booking.notes            && <InfoRow Icon={FileText}>{booking.notes}</InfoRow>}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button type="button" onClick={onConfirm} disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold
                            text-white shadow-sm transition-all active:scale-[.98]
                            bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800
                            hover:from-green-800 hover:to-green-950 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Confirm
                    </button>
                    <button type="button" onClick={onDecline} disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold
                            border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400
                            bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40
                            transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <X size={13} /> Decline
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── History Booking Card ─────────────────────────────────────────────────────
function HistoryCard({ booking, onViewBill }: { booking: any; onViewBill: () => void }) {
    const qty        = booking.quantity || 1;
    const ppd        = booking.equipment?.price_per_day || 0;
    const total      = Number(booking.total_price || 0);
    const payStatus  = getEquipmentPaymentStatus(booking);
    const isCancelled = booking.status === "cancelled";
    const isCompleted = booking.status === "completed";

    return (
        <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800
            overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <div className={`h-1 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                isCancelled ? "bg-gradient-to-r from-red-400 to-red-500"
                : isCompleted && payStatus === "paid" ? "bg-gradient-to-r from-blue-500 to-blue-600"
                : "bg-gradient-to-r from-green-500 to-green-600"
            }`} />
            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border ${
                            isCancelled
                                ? "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40"
                                : "bg-green-50 dark:bg-green-950/40 border-green-100 dark:border-green-900/40"
                        }`}>
                            <Tractor size={18} className={isCancelled ? "text-red-500 dark:text-red-400" : "text-green-700 dark:text-green-400"} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                                {booking.equipment?.name || "Equipment"}
                            </h3>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                <Calendar size={10} />
                                <span>{booking.start_date} → {booking.end_date}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge status={booking.status} />
                        {!isCancelled && <StatusBadge status={payStatus} />}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl mb-3
                    bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Qty</p>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{qty} <span className="text-[10px] font-normal text-slate-400">unit{qty > 1 ? "s" : ""}</span></p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Rate</p>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">₹{ppd}<span className="text-[10px] font-normal text-slate-400">/day</span></p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Total</p>
                        <p className={`text-[13px] font-bold ${isCancelled ? "text-slate-400 dark:text-slate-500 line-through" : "text-green-700 dark:text-green-400"}`}>
                            ₹{total.toLocaleString("en-IN")}
                        </p>
                    </div>
                </div>

                {/* Renter info */}
                <div className="flex flex-col gap-1 mb-4 pl-0.5">
                    <InfoRow Icon={Users}>{booking.renter?.full_name || "Renter"}</InfoRow>
                    {booking.renter?.phone    && <InfoRow Icon={Receipt}>{booking.renter.phone}</InfoRow>}
                    {booking.renter?.location && <InfoRow Icon={Calendar}>{booking.renter.location}</InfoRow>}
                </div>

                {/* View bill — only for completed */}
                {isCompleted && (
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
                )}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = "pending" | "history";

const RentalRequestsPage = () => {
    const { user } = useUser();
    const [profileId,      setProfileId]       = useState<string | null>(null);
    const [activeTab,      setActiveTab]        = useState<Tab>("pending");
    const [isBillOpen,     setIsBillOpen]       = useState(false);
    const [selectedBooking,setSelectedBooking]  = useState<any>(null);
    const [searchQuery,    setSearchQuery]      = useState("");

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: bookings, isLoading } = useOwnerBookings(profileId || "");
    const updateMutation = useUpdateEquipmentBooking();

    const pendingBookings = useMemo(() => bookings?.filter((b: any) => b.status === "pending") ?? [], [bookings]);
    const historyBookings = useMemo(() => bookings?.filter((b: any) => b.status !== "pending") ?? [], [bookings]);

    const filteredPending = useMemo(() => pendingBookings.filter((b: any) =>
        b.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.renter?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [pendingBookings, searchQuery]);

    const filteredHistory = useMemo(() => historyBookings.filter((b: any) =>
        b.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.renter?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [historyBookings, searchQuery]);

    // ── Stats ──────────────────────────────────────────────────────────────────
    const pendingStats = [
        { label: "Total",    val: pendingBookings.length,                                                                        dot: "bg-slate-400" },
        { label: "This Week",val: pendingBookings.filter((b: any) => (Date.now() - new Date(b.created_at).getTime()) < 604800000).length, dot: "bg-amber-500" },
        { label: "Value",    val: `₹${pendingBookings.reduce((s: number, b: any) => s + Number(b.total_price || 0), 0).toLocaleString("en-IN")}`, dot: "bg-green-500" },
    ];
    const historyStats = [
        { label: "Total",     val: historyBookings.length,                                                          dot: "bg-slate-400" },
        { label: "Confirmed", val: historyBookings.filter((b: any) => b.status === "confirmed").length,             dot: "bg-green-500" },
        { label: "Declined",  val: historyBookings.filter((b: any) => b.status === "cancelled").length,             dot: "bg-red-400"   },
    ];
    const summaryStats = activeTab === "pending" ? pendingStats : historyStats;

    // ── Bill helpers ───────────────────────────────────────────────────────────
    const showBill = (booking: any) => {
        const amount = Number(booking.total_price || 0);
        const qty    = booking.quantity || 1;
        const ppd    = booking.equipment?.price_per_day || 0;
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
            buyer:  { id: booking.renter?.id, name: booking.renter?.full_name || "Renter", phone: booking.renter?.phone, email: booking.renter?.email, address: booking.renter?.location, state: booking.renter?.state, district: booking.renter?.district, taluka: booking.renter?.taluka, village_city: booking.renter?.village_city },
            seller: { id: booking.equipment?.owner?.id || profileId || undefined, name: booking.equipment?.owner?.full_name || user?.fullName || "Equipment Owner", phone: booking.equipment?.owner?.phone || user?.phoneNumbers?.[0]?.phoneNumber, email: booking.equipment?.owner?.email || user?.primaryEmailAddress?.emailAddress || undefined, address: booking.equipment?.owner?.location || booking.equipment?.location, state: booking.equipment?.owner?.state, district: booking.equipment?.owner?.district, taluka: booking.equipment?.owner?.taluka, village_city: booking.equipment?.owner?.village_city },
            lineItems: [{ description: `${booking.equipment?.name || "Equipment Rental"} (${qty} unit${qty > 1 ? "s" : ""})`, quantity: qty, unitPrice: ppd, amount }],
            subtotal: amount, taxRate: 0, taxAmount: 0, total: amount,
            notes: booking.notes || undefined,
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

    const loading = !profileId || isLoading;

    const TABS = [
        { id: "pending" as Tab, label: "Pending",  count: pendingBookings.length },
        { id: "history" as Tab, label: "History",  count: historyBookings.length },
    ];

    return (
        <DashboardLayout subtitle="">
            <div className="space-y-5 pb-8 w-full">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm
                            bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800">
                            <CalendarCheck className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                                Rental Requests
                            </h1>
                            <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">
                                Respond to rental requests for your equipment
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={activeTab === "pending" ? "Search equipment or renter…" : "Search history…"}
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

                {/* ── Tab bar ── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 flex gap-1.5 shadow-sm">
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button key={tab.id} type="button"
                                onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                                    isActive
                                        ? "bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800 text-white shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                }`}>
                                {tab.id === "pending"
                                    ? <Clock size={15} className={isActive ? "text-white/90" : ""} />
                                    : <FileText size={15} className={isActive ? "text-white/90" : ""} />
                                }
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                                        isActive
                                            ? "bg-white/20 text-white"
                                            : tab.id === "pending"
                                                ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Summary strip ── */}
                {!loading && (
                    <div className="grid grid-cols-3 gap-4">
                        {summaryStats.map(s => (
                            <div key={s.label}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center gap-4 shadow-sm">
                                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${s.dot}`} />
                                <div className="min-w-0">
                                    <p className="text-[24px] sm:text-[28px] font-bold text-slate-900 dark:text-white leading-none truncate">{s.val}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Content ── */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3
                        bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="w-9 h-9 rounded-full border-[3px] border-slate-200 dark:border-slate-700 border-t-green-500 animate-spin" />
                        <p className="text-[12px] text-slate-400 dark:text-slate-500">Loading requests…</p>
                    </div>

                ) : activeTab === "pending" ? (
                    !pendingBookings.length ? (
                        <EmptyState icon={CalendarCheck} title="No Pending Requests"
                            subtitle="When renters request your equipment, they'll appear here for you to confirm or decline." />
                    ) : !filteredPending.length ? (
                        <EmptyState icon={Search} title="No Results"
                            subtitle="No pending requests match your search." />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                            {filteredPending.map((booking: any) => (
                                <PendingCard key={booking.id} booking={booking}
                                    onConfirm={() => updateMutation.mutate(
                                        { id: booking.id, updates: { status: "confirmed" } },
                                        { onSuccess: () => toast.success("Booking confirmed!") }
                                    )}
                                    onDecline={() => updateMutation.mutate(
                                        { id: booking.id, updates: { status: "cancelled" } },
                                        { onSuccess: () => toast.success("Booking declined") }
                                    )}
                                    isLoading={updateMutation.isPending}
                                />
                            ))}
                        </div>
                    )

                ) : (
                    !historyBookings.length ? (
                        <EmptyState icon={FileText} title="No Rental History"
                            subtitle="Confirmed, completed, and declined bookings will appear here." />
                    ) : !filteredHistory.length ? (
                        <EmptyState icon={Search} title="No Results"
                            subtitle="No history bookings match your search." />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                            {filteredHistory.map((booking: any) => (
                                <HistoryCard key={booking.id} booking={booking}
                                    onViewBill={() => showBill(booking)} />
                            ))}
                        </div>
                    )
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