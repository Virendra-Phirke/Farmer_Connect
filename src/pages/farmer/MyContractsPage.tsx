import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useSupplyContracts, useUpdateSupplyContract } from "@/hooks/useSupplyContracts";
import { useEquipmentBookings } from "@/hooks/useEquipmentBookings";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Loader2, FileText, Receipt, Search, Tractor, Calendar,
    Package, TrendingUp, Wheat, X, ChevronRight,
    IndianRupee, Clock, CheckCircle2,
} from "lucide-react";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";
import { toast } from "sonner";

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
    active:    "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60",
    completed: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
    confirmed: "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60",
    pending:   "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
    cancelled: "bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60",
    paid:      "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60",
    unpaid:    "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
};
const STATUS_DOTS: Record<string, string> = {
    active: "bg-green-500", completed: "bg-blue-500", confirmed: "bg-green-500",
    pending: "bg-amber-500", cancelled: "bg-red-500", paid: "bg-green-500", unpaid: "bg-amber-500",
};
function StatusBadge({ status }: { status: string }) {
    const key = status?.toLowerCase() ?? "";
    const cls = STATUS_STYLES[key] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    const dot = STATUS_DOTS[key] ?? "bg-slate-400";
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize ${cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
            {status}
        </span>
    );
}

// ─── Info Cell ────────────────────────────────────────────────────────────────
function InfoCell({ label, value, Icon }: { label: string; value: React.ReactNode; Icon?: React.ElementType }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                {Icon && <Icon size={9} />} {label}
            </span>
            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{value || "—"}</span>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
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

// ─── Supply Contract Card ─────────────────────────────────────────────────────
function ContractCard({ c, onBill }: { c: any; onBill: (c: any) => void }) {
    const amount = Number(c.total_amount ?? (Number(c.price_per_kg || 0) * Number(c.quantity_kg_per_delivery || 0)));
    return (
        <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800
            overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            {/* Accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-green-500 to-green-600
                opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

            <div className="p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center
                            bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40">
                            <Wheat size={18} className="text-green-700 dark:text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight capitalize">{c.crop_name}</h3>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                Buyer: <span className="text-slate-600 dark:text-slate-300 font-semibold">{c.buyer?.full_name || "—"}</span>
                            </p>
                        </div>
                    </div>
                    <StatusBadge status={c.status} />
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl
                    bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 mb-4">
                    <InfoCell label="Qty / Delivery" value={`${c.quantity_kg_per_delivery} kg`} Icon={Package} />
                    <InfoCell label="Price" value={`₹${c.price_per_kg}/kg`} Icon={IndianRupee} />
                    <InfoCell label="Frequency" value={c.delivery_frequency} Icon={Clock} />
                    <InfoCell label="Period" value={`${c.start_date} – ${c.end_date}`} Icon={Calendar} />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                        <TrendingUp size={13} className="text-green-600 dark:text-green-500" />
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">Total value:</span>
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white">
                            ₹{amount.toLocaleString("en-IN")}
                        </span>
                    </div>
                    {c.status === "active" && (
                        <button type="button" onClick={() => onBill(c)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold
                                text-white shadow-sm transition-all
                                bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800
                                hover:from-green-800 hover:to-green-950 active:scale-[.98]">
                            <Receipt size={12} /> View Bill <ChevronRight size={11} className="opacity-70" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Equipment Rental Card ────────────────────────────────────────────────────
function RentalCard({ booking, onBill }: { booking: any; onBill: (b: any) => void }) {
    const payStatus = getEquipmentPaymentStatus(booking);
    return (
        <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800
            overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <div className="h-1 w-full bg-gradient-to-r from-green-500 to-green-600
                opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

            <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center
                            bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40">
                            <Tractor size={18} className="text-green-700 dark:text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">
                                {booking.equipment?.name || "Equipment"}
                            </h3>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                                <Calendar size={10} />
                                {booking.start_date} → {booking.end_date}
                            </p>
                        </div>
                    </div>
                    <StatusBadge status={booking.status} />
                </div>

                {/* Owner + amount row */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl
                    bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 mb-4">
                    <InfoCell label="Owner" value={booking.equipment?.owner?.full_name || "—"} />
                    <InfoCell label="Rental Amount" value={`₹${Number(booking.total_price).toLocaleString("en-IN")}`} Icon={IndianRupee} />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                    <StatusBadge status={payStatus} />
                    <button type="button" onClick={() => onBill(booking)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold
                            text-white shadow-sm transition-all
                            bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800
                            hover:from-green-800 hover:to-green-950 active:scale-[.98]">
                        <Receipt size={12} /> View Bill <ChevronRight size={11} className="opacity-70" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = "contracts" | "rentals";

const MyContractsPage = () => {
    const { user }      = useUser();
    const [profileId,   setProfileId]   = useState<string | null>(null);
    const [activeTab,   setActiveTab]   = useState<Tab>("contracts");
    const [searchQuery, setSearchQuery] = useState("");
    const [isBillOpen,  setIsBillOpen]  = useState(false);
    const [selectedBill,setSelectedBill]= useState<any>(null);
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

    const billingRentals = rentalBookings?.filter(
        (b: any) => b.status === "confirmed" || b.status === "completed"
    ) ?? [];

    const filteredContracts = contracts?.filter((c: any) =>
        c.crop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.buyer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

    const filteredRentals = billingRentals.filter((r: any) =>
        r.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.owner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── Bill helpers ──────────────────────────────────────────────────────────
    const openBill = (c: any) => {
        const amount = Number(c.total_amount ?? (Number(c.price_per_kg || 0) * Number(c.quantity_kg_per_delivery || 0)));
        const billId = c.billing_id || `INV-SC-${c.id.slice(0, 8).toUpperCase()}`;
        setSelectedBill({
            title: `${c.crop_name} - Supply Contract`,
            receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
            source: "supply", billId, billingId: billId,
            transactionId: c.id, transactionType: "Supply Contract Delivery",
            date: new Date(c.created_at || new Date()).toLocaleDateString(),
            amount, paymentStatus: c.payment_status || "unpaid",
            paymentConfirmedAt: c.payment_status === "paid"
                ? new Date(c.updated_at || c.created_at).toLocaleString() : undefined,
            status: c.status || "active",
            buyerName: c.buyer?.full_name || "Buyer",
            buyer:  { id: c.buyer?.id, name: c.buyer?.full_name || "Buyer", phone: c.buyer?.phone, email: c.buyer?.email, address: c.buyer?.location, state: c.buyer?.state, district: c.buyer?.district, taluka: c.buyer?.taluka, village_city: c.buyer?.village_city },
            seller: { id: c.farmer?.id || profileId || undefined, name: c.farmer?.full_name || user?.fullName || "Farmer", phone: c.farmer?.phone || user?.phoneNumbers?.[0]?.phoneNumber, email: c.farmer?.email || user?.primaryEmailAddress?.emailAddress || undefined, address: c.farmer?.location, state: c.farmer?.state, district: c.farmer?.district, taluka: c.farmer?.taluka, village_city: c.farmer?.village_city },
            lineItems: [{ description: `${c.crop_name} (${c.quantity_kg_per_delivery} kg/delivery)`, quantity: Number(c.quantity_kg_per_delivery || 0), unitPrice: Number(c.price_per_kg || 0), amount }],
            subtotal: amount, taxRate: 0, taxAmount: 0, total: amount,
            cropDetails: `${c.crop_name} (${c.quantity_kg_per_delivery} kg/delivery @ ₹${c.price_per_kg}/kg)`,
            originalRecord: c,
        });
        setIsBillOpen(true);
    };

    const openRentalBill = (booking: any) => {
        const amount = Number(booking.total_price || 0);
        const billId = booking.billing_id || `INV-RENT-${booking.id.slice(0, 8).toUpperCase()}`;
        setSelectedBill({
            title: `${booking.equipment?.name || "Equipment"} - Equipment Rental`,
            receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
            source: "rental", billId, billingId: billId,
            transactionId: booking.id, transactionType: "Equipment Rental",
            date: new Date(booking.created_at || new Date()).toLocaleDateString(),
            amount, paymentStatus: getEquipmentPaymentStatus(booking),
            status: booking.status || "confirmed",
            buyerName: user?.fullName || "Renter",
            buyer:  { id: booking.renter?.id || profileId || undefined, name: booking.renter?.full_name || user?.fullName || "Renter", phone: booking.renter?.phone, email: booking.renter?.email || user?.primaryEmailAddress?.emailAddress || undefined, address: booking.renter?.location, state: booking.renter?.state, district: booking.renter?.district, taluka: booking.renter?.taluka, village_city: booking.renter?.village_city },
            seller: { id: booking.equipment?.owner?.id, name: booking.equipment?.owner?.full_name || "Equipment Owner", phone: booking.equipment?.owner?.phone, email: booking.equipment?.owner?.email, address: booking.equipment?.owner?.location, state: booking.equipment?.owner?.state, district: booking.equipment?.owner?.district, taluka: booking.equipment?.owner?.taluka, village_city: booking.equipment?.owner?.village_city },
            lineItems: [{ description: `${booking.equipment?.name || "Equipment"} (${booking.start_date} → ${booking.end_date})`, quantity: 1, unitPrice: amount, amount }],
            subtotal: amount, taxRate: 0, taxAmount: 0, total: amount,
            cropDetails: `${booking.equipment?.name || "Equipment"} (${booking.start_date} → ${booking.end_date})`,
            originalRecord: booking,
        });
        setIsBillOpen(true);
    };

    const handleMarkPaid = async () => {
        const isActualSeller = selectedBill?.source === "supply" && selectedBill?.originalRecord?.farmer_id === profileId;
        if (selectedBill && selectedBill.source === "supply" && isActualSeller && selectedBill?.originalRecord?.payment_status !== "paid") {
            try {
                await updateContract.mutateAsync({ id: selectedBill.originalRecord.id, updates: { payment_status: "paid" } });
                setIsBillOpen(false);
                toast.success("Payment marked as complete.");
            } catch { toast.error("Failed to mark payment as complete."); }
        }
    };

    const loading = !profileId || isLoading;

    const TABS = [
        { id: "contracts" as Tab, label: "Supply Contracts",    Icon: Wheat,   count: contracts?.length ?? 0 },
        { id: "rentals"   as Tab, label: "Equipment Rentals",   Icon: Tractor, count: billingRentals.length },
    ];

    return (
        <DashboardLayout subtitle="">
            <div className="space-y-5 pb-8 max-w-5xl mx-auto">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm
                            bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800">
                            <FileText className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                                My Contracts
                            </h1>
                            <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">
                                Manage supply contracts &amp; rental bills
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-60">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={activeTab === "contracts" ? "Search crop or buyer…" : "Search equipment…"}
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
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                                    isActive
                                        ? "bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800 text-white shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                }`}
                            >
                                <tab.Icon size={15} className={isActive ? "text-white/90" : ""} />
                                <span className="hidden xs:inline sm:inline">{tab.label}</span>
                                {/* mobile short labels */}
                                <span className="xs:hidden sm:hidden">
                                    {tab.id === "contracts" ? "Contracts" : "Rentals"}
                                </span>
                                {/* Count pill */}
                                {tab.count > 0 && (
                                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                                        isActive
                                            ? "bg-white/20 text-white"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Tab summary strip ── */}
                {!loading && (
                    <div className="grid grid-cols-3 gap-3">
                        {activeTab === "contracts" ? (
                            <>
                                {[
                                    { label: "Total",     val: contracts?.length ?? 0,                                                     dot: "bg-slate-400" },
                                    { label: "Active",    val: contracts?.filter((c:any) => c.status === "active").length ?? 0,            dot: "bg-green-500" },
                                    { label: "Completed", val: contracts?.filter((c:any) => c.status === "completed").length ?? 0,         dot: "bg-blue-500" },
                                ].map(s => (
                                    <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3 shadow-sm">
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                                        <div>
                                            <p className="text-[18px] font-bold text-slate-900 dark:text-white leading-none">{s.val}</p>
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">{s.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <>
                                {[
                                    { label: "Total",     val: billingRentals.length,                                                                    dot: "bg-slate-400" },
                                    { label: "Confirmed", val: billingRentals.filter((r:any) => r.status === "confirmed").length,                         dot: "bg-green-500" },
                                    { label: "Completed", val: billingRentals.filter((r:any) => r.status === "completed").length,                         dot: "bg-blue-500" },
                                ].map(s => (
                                    <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3 shadow-sm">
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                                        <div>
                                            <p className="text-[18px] font-bold text-slate-900 dark:text-white leading-none">{s.val}</p>
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">{s.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {/* ── Tab content ── */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3
                        bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="w-9 h-9 rounded-full border-[3px] border-slate-200 dark:border-slate-700 border-t-green-500 animate-spin" />
                        <p className="text-[12px] text-slate-400 dark:text-slate-500">Loading…</p>
                    </div>

                ) : activeTab === "contracts" ? (
                    /* Supply Contracts tab */
                    !contracts?.length ? (
                        <EmptyState icon={FileText} title="No Active Contracts"
                            subtitle="When buyers create supply contracts with you, they'll appear here." />
                    ) : !filteredContracts.length ? (
                        <EmptyState icon={Search} title="No results"
                            subtitle="No contracts match your search. Try a different keyword." />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredContracts.map((c: any) => (
                                <ContractCard key={c.id} c={c} onBill={openBill} />
                            ))}
                        </div>
                    )

                ) : (
                    /* Equipment Rentals tab */
                    !billingRentals.length ? (
                        <EmptyState icon={Tractor} title="No Rental Bills Yet"
                            subtitle="Bills appear once your equipment bookings are confirmed or completed." />
                    ) : !filteredRentals.length ? (
                        <EmptyState icon={Search} title="No results"
                            subtitle="No rentals match your search. Try a different keyword." />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredRentals.map((booking: any) => (
                                <RentalCard key={booking.id} booking={booking} onBill={openRentalBill} />
                            ))}
                        </div>
                    )
                )}
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