import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useFarmerPurchaseRequests, useUpdatePurchaseRequest } from "@/hooks/usePurchaseRequests";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Loader2, ShoppingCart, Check, X, FileText, Search,
    Wheat, IndianRupee, Weight, User, Phone, MapPin,
    MessageSquare, Clock, ChevronRight, Receipt, Package,
    TrendingUp, Tag,
} from "lucide-react";
import { toast } from "sonner";
import BillReceiptDialog from "@/components/BillReceiptDialog";

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
    accepted: "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60",
    rejected: "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60",
    pending:  "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
    paid:     "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60",
    unpaid:   "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
};
const STATUS_DOTS: Record<string, string> = {
    accepted: "bg-green-500", rejected: "bg-red-500",
    pending: "bg-amber-500", paid: "bg-green-500", unpaid: "bg-amber-500",
};
function StatusBadge({ status }: { status: string }) {
    const key = status?.toLowerCase() ?? "";
    const cls = STATUS_STYLES[key] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    const dot = STATUS_DOTS[key] ?? "bg-slate-400";
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize flex-shrink-0 ${cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
            {status}
        </span>
    );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ Icon, children }: { Icon: React.ElementType; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Icon size={11} className="flex-shrink-0 opacity-60" />
            <span>{children}</span>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
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

// ─── Pending Request Card ─────────────────────────────────────────────────────
function PendingCard({ req, onAccept, onReject, isLoading }: {
    req: any; onAccept: () => void; onReject: () => void; isLoading: boolean;
}) {
    const crop     = req.crop_listing?.crop_name || "Crop";
    const qty      = Number(req.quantity_kg || 0);
    const price    = Number(req.offered_price || 0);
    const total    = qty * price;
    return (
        <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800
            overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            {/* Accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-amber-500
                opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

            <div className="p-4 sm:p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center
                            bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                            <Wheat size={18} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight capitalize">{crop}</h3>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 capitalize">{req.request_type || "Purchase"}</p>
                        </div>
                    </div>
                    <StatusBadge status="pending" />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl
                    bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 mb-3">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Qty</p>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{qty} <span className="text-[11px] font-normal text-slate-400">kg</span></p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Price</p>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">₹{price}<span className="text-[11px] font-normal text-slate-400">/kg</span></p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Total</p>
                        <p className="text-[13px] font-bold text-green-700 dark:text-green-400">₹{total.toLocaleString("en-IN")}</p>
                    </div>
                </div>

                {/* Buyer info */}
                <div className="flex flex-col gap-1 mb-4 pl-0.5">
                    <InfoRow Icon={User}>{req.buyer?.full_name || "Buyer"}</InfoRow>
                    {req.buyer?.phone   && <InfoRow Icon={Phone}>{req.buyer.phone}</InfoRow>}
                    {req.buyer?.location && <InfoRow Icon={MapPin}>{req.buyer.location}</InfoRow>}
                    {req.message && <InfoRow Icon={MessageSquare}>{req.message}</InfoRow>}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button type="button" onClick={onAccept} disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold
                            text-white shadow-sm transition-all active:scale-[.98]
                            bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800
                            hover:from-green-800 hover:to-green-950 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Accept
                    </button>
                    <button type="button" onClick={onReject} disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold
                            border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400
                            bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40
                            transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        <X size={13} /> Reject
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── History Card ─────────────────────────────────────────────────────────────
function HistoryCard({ req, onViewBill }: { req: any; onViewBill: () => void }) {
    const crop    = req.crop_listing?.crop_name || "Crop";
    const qty     = Number(req.quantity_kg || 0);
    const price   = Number(req.offered_price || 0);
    const total   = Number(req.total_amount ?? (qty * price));
    const isPaid  = req.payment_status === "paid";
    const isRejected = req.status === "rejected";
    return (
        <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800
            overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <div className={`h-1 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                isRejected ? "bg-gradient-to-r from-red-400 to-red-500"
                : isPaid   ? "bg-gradient-to-r from-blue-500 to-blue-600"
                :             "bg-gradient-to-r from-green-500 to-green-600"
            }`} />

            <div className="p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border ${
                            isRejected
                                ? "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/40"
                                : "bg-green-50 dark:bg-green-950/40 border-green-100 dark:border-green-900/40"
                        }`}>
                            <Wheat size={18} className={isRejected ? "text-red-500 dark:text-red-400" : "text-green-700 dark:text-green-400"} />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight capitalize">{crop}</h3>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                {new Date(req.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        <StatusBadge status={req.status} />
                        {!isRejected && <StatusBadge status={req.payment_status || "unpaid"} />}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl
                    bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 mb-3">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Qty</p>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{qty} <span className="text-[11px] font-normal text-slate-400">kg</span></p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Price</p>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">₹{price}<span className="text-[11px] font-normal text-slate-400">/kg</span></p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Total</p>
                        <p className="text-[13px] font-bold text-green-700 dark:text-green-400">₹{total.toLocaleString("en-IN")}</p>
                    </div>
                </div>

                {/* Buyer info */}
                <div className="flex flex-col gap-1 mb-4 pl-0.5">
                    <InfoRow Icon={User}>{req.buyer?.full_name || "Individual Buyer"}</InfoRow>
                    {req.buyer?.phone    && <InfoRow Icon={Phone}>{req.buyer.phone}</InfoRow>}
                    {req.buyer?.location && <InfoRow Icon={MapPin}>{req.buyer.location}</InfoRow>}
                </div>

                {/* Footer */}
                {!isRejected && (
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

const PurchaseRequestsPage = () => {
    const { user } = useUser();
    const [profileId,    setProfileId]    = useState<string | null>(null);
    const [activeTab,    setActiveTab]    = useState<Tab>("pending");
    const [searchQuery,  setSearchQuery]  = useState("");
    const [selectedBill, setSelectedBill] = useState<any>(null);
    const [isBillOpen,   setIsBillOpen]   = useState(false);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: requests, isLoading } = useFarmerPurchaseRequests(profileId || "");
    const updateMutation = useUpdatePurchaseRequest();

    const pendingRequests = useMemo(() => requests?.filter((r: any) => r.status === "pending") ?? [], [requests]);
    const historyRequests = useMemo(() => requests?.filter((r: any) => r.status !== "pending") ?? [], [requests]);

    const filteredPending = useMemo(() => pendingRequests.filter((r: any) =>
        r.crop_listing?.crop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.buyer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [pendingRequests, searchQuery]);

    const filteredHistory = useMemo(() => historyRequests.filter((r: any) =>
        r.crop_listing?.crop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.buyer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [historyRequests, searchQuery]);

    const handleAccept = (req: any) => {
        updateMutation.mutate({ id: req.id, updates: { status: "accepted", payment_status: "unpaid" } }, {
            onSuccess: (updatedData: any) => {
                toast.success("Request accepted! Bill generated.");
                const merged = { ...req, ...updatedData, status: "accepted", payment_status: "unpaid", billing_id: updatedData?.billing_id || req.billing_id };
                showBill(merged, "unpaid", merged.billing_id);
            },
            onError: () => toast.error("Failed to update"),
        });
    };

    const handleReject = (id: string) => {
        updateMutation.mutate({ id, updates: { status: "rejected" } }, {
            onSuccess: () => toast.success("Request rejected"),
            onError:   () => toast.error("Failed to update"),
        });
    };

    const handleMarkPaid = async () => {
        const isActualSeller = selectedBill?.originalRecord?.crop_listing?.farmer_id === profileId;
        if (selectedBill?.originalRecord?.id && selectedBill?.originalRecord?.payment_status !== "paid" && isActualSeller) {
            try {
                await updateMutation.mutateAsync({ id: selectedBill.originalRecord.id, updates: { payment_status: "paid" } });
                setIsBillOpen(false);
                toast.success("Payment marked as complete.");
            } catch { toast.error("Failed to mark payment as complete."); }
        }
    };

    const showBill = (req: any, paymentStatusOverride?: string, billingIdOverride?: string) => {
        const crop   = req.crop_listing?.crop_name || "Crop";
        const qty    = Number(req.quantity_kg || 0);
        const price  = Number(req.offered_price || 0);
        const total  = Number(req.total_amount ?? (qty * price));
        const billId = billingIdOverride || req.billing_id || `INV-PR-${req.id.slice(0, 8).toUpperCase()}`;
        const farmer = req.crop_listing?.farmer;
        setSelectedBill({
            title: `${crop} - Purchase Request`,
            receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
            billId, billingId: billId,
            transactionId: req.id, transactionType: "Produce Sale",
            date: new Date(req.created_at || new Date()).toLocaleDateString(),
            paymentConfirmedAt: req.payment_status === "paid" ? new Date(req.updated_at || req.created_at).toLocaleString() : undefined,
            amount: total, paymentStatus: paymentStatusOverride || req.payment_status || "unpaid",
            status: req.status || "accepted", buyerName: req.buyer?.full_name || "Buyer",
            buyer:  { id: req.buyer?.id, name: req.buyer?.full_name || "Buyer", phone: req.buyer?.phone, email: req.buyer?.email, address: req.buyer?.location, state: req.buyer?.state, district: req.buyer?.district, taluka: req.buyer?.taluka, village_city: req.buyer?.village_city },
            seller: { id: farmer?.id || profileId, name: farmer?.full_name || user?.fullName || "Seller", phone: farmer?.phone || user?.phoneNumbers?.[0]?.phoneNumber, email: farmer?.email || user?.primaryEmailAddress?.emailAddress, address: farmer?.location, state: farmer?.state, district: farmer?.district, taluka: farmer?.taluka, village_city: farmer?.village_city },
            lineItems: [{ description: `${crop} (${qty} kg)`, quantity: qty, unitPrice: price, amount: total }],
            subtotal: total, taxRate: 0, taxAmount: 0, total,
            notes: req.message || undefined,
            cropDetails: `${qty}kg of ${crop} @ ₹${price}/kg`,
            originalRecord: req,
        });
        setIsBillOpen(true);
    };

    const loading = !profileId || isLoading;

    const TABS = [
        { id: "pending" as Tab, label: "Pending",  count: pendingRequests.length },
        { id: "history" as Tab, label: "History",  count: historyRequests.length },
    ];

    // Summary stats for each tab
    const pendingStats = [
        { label: "Total",    val: pendingRequests.length,                                                        dot: "bg-slate-400" },
        { label: "This Week",val: pendingRequests.filter((r: any) => { const d = new Date(r.created_at); const now = new Date(); return (now.getTime() - d.getTime()) < 7 * 86400000; }).length, dot: "bg-amber-500" },
        { label: "Value",    val: `₹${pendingRequests.reduce((s: number, r: any) => s + Number(r.quantity_kg || 0) * Number(r.offered_price || 0), 0).toLocaleString("en-IN")}`, dot: "bg-green-500" },
    ];
    const historyStats = [
        { label: "Total",    val: historyRequests.length,                                                                   dot: "bg-slate-400" },
        { label: "Accepted", val: historyRequests.filter((r: any) => r.status === "accepted").length,                       dot: "bg-green-500" },
        { label: "Rejected", val: historyRequests.filter((r: any) => r.status === "rejected").length,                       dot: "bg-red-400" },
    ];
    const summaryStats = activeTab === "pending" ? pendingStats : historyStats;

    return (
        <DashboardLayout subtitle="">
            <div className="space-y-5 pb-8 max-w-5xl mx-auto">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm
                            bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800">
                            <ShoppingCart className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                                Purchase Requests
                            </h1>
                            <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">
                                Review &amp; manage incoming buyer requests
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-60">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search crop or buyer…"
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
                    <div className="grid grid-cols-3 gap-3">
                        {summaryStats.map(s => (
                            <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3 shadow-sm">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                                <div className="min-w-0">
                                    <p className="text-[16px] sm:text-[18px] font-bold text-slate-900 dark:text-white leading-none truncate">{s.val}</p>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">{s.label}</p>
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
                    !pendingRequests.length ? (
                        <EmptyState icon={ShoppingCart} title="No Pending Requests"
                            subtitle="When buyers send purchase requests for your listings, they'll appear here." />
                    ) : !filteredPending.length ? (
                        <EmptyState icon={Search} title="No results"
                            subtitle="No pending requests match your search." />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPending.map((req: any) => (
                                <PendingCard key={req.id} req={req}
                                    onAccept={() => handleAccept(req)}
                                    onReject={() => handleReject(req.id)}
                                    isLoading={updateMutation.isPending} />
                            ))}
                        </div>
                    )

                ) : (
                    !historyRequests.length ? (
                        <EmptyState icon={FileText} title="No Purchase History"
                            subtitle="Accepted and rejected requests will appear here." />
                    ) : !filteredHistory.length ? (
                        <EmptyState icon={Search} title="No results"
                            subtitle="No history requests match your search." />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredHistory.map((req: any) => (
                                <HistoryCard key={req.id} req={req} onViewBill={() => showBill(req)} />
                            ))}
                        </div>
                    )
                )}
            </div>

            <BillReceiptDialog
                isOpen={isBillOpen}
                onClose={() => setIsBillOpen(false)}
                billData={selectedBill}
                canMarkPaid={selectedBill?.originalRecord?.crop_listing?.farmer_id === profileId}
                onMarkPaid={handleMarkPaid}
                isLoading={updateMutation.isPending}
            />
        </DashboardLayout>
    );
};

export default PurchaseRequestsPage;