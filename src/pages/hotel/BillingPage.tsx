import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import {
    FileText, Loader2, Receipt, Search, X, Wheat,
    Clock, ChevronRight, IndianRupee, Package,
    Calendar, User, TrendingUp, ChevronLeft,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";
import { getProfileId } from "@/lib/supabase-auth";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useSupplyContracts } from "@/hooks/useSupplyContracts";
import { PageSkeleton } from "@/components/PageSkeleton";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toDateString = (value?: string) =>
    new Date(value || new Date()).toLocaleDateString("en-GB");

const hashAlphaNum = (input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    return hash.toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
};

const buildOfficialNumbers = ({ sourceId, createdAt, kind }: { sourceId: string; createdAt?: string; kind: "PR" | "SC" }) => {
    const date = new Date(createdAt || new Date());
    const yyyymmdd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const yymm = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, "0")}`;
    const serial = hashAlphaNum(`${sourceId}-${kind}-${yyyymmdd}`);
    return {
        billingId:     `FCB-${kind}-${yyyymmdd}-${serial}`,
        receiptNumber: `RCPT-${yymm}-${serial}`,
        invoiceNumber: `INV-${yymm}-${serial}`,
    };
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        paid:      "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60",
        unpaid:    "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
        accepted:  "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60",
        active:    "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
        completed: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
        pending:   "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
    };
    const dot: Record<string, string> = {
        paid: "bg-green-500", unpaid: "bg-amber-500", accepted: "bg-green-500",
        active: "bg-blue-500", completed: "bg-slate-400", pending: "bg-amber-500",
    };
    const key = status?.toLowerCase() ?? "";
    const cls = map[key] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize flex-shrink-0 ${cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot[key] ?? "bg-slate-400"}`} />
            {status}
        </span>
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

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, total, pageSize, onChange }: {
    page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (totalPages <= 1) return null;
    const start = (page - 1) * pageSize + 1;
    const end   = Math.min(page * pageSize, total);
    return (
        <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Showing <span className="font-semibold text-slate-600 dark:text-slate-300">{start}–{end}</span> of <span className="font-semibold text-slate-600 dark:text-slate-300">{total}</span>
            </p>
            <div className="flex items-center gap-1">
                <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700
                        text-slate-500 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-950/30
                        hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-400
                        disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | "…")[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                        acc.push(p);
                        return acc;
                    }, [])
                    .map((p, i) =>
                        p === "…" ? (
                            <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-[12px] text-slate-400">…</span>
                        ) : (
                            <button key={p} type="button" onClick={() => onChange(p as number)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-semibold border transition-all ${
                                    p === page
                                        ? "bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800 text-white border-transparent shadow-sm"
                                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-950/30 hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-400"
                                }`}>
                                {p}
                            </button>
                        )
                    )
                }
                <button type="button" onClick={() => onChange(page + 1)} disabled={page >= totalPages}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700
                        text-slate-500 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-950/30
                        hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-400
                        disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

// ─── Purchase Bill Card ───────────────────────────────────────────────────────
function PurchaseCard({ req, onView }: { req: any; onView: () => void }) {
    const qty    = Number(req.quantity_kg || 0);
    const price  = Number(req.offered_price || 0);
    const total  = Number(req.total_amount ?? (qty * price));
    const payStatus = req.payment_status || "unpaid";
    return (
        <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800
            overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="h-1 w-full bg-gradient-to-r from-green-500 to-green-600
                opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <div className="p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center
                            bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40">
                            <Wheat size={16} className="text-green-700 dark:text-green-400" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white leading-tight truncate capitalize">
                                {req.crop_listing?.crop_name || "Crop"}
                            </h3>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                                {req.crop_listing?.farmer?.full_name || "Farmer"}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <StatusBadge status={req.status || "accepted"} />
                        <StatusBadge status={payStatus} />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl mb-3
                    bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Qty</p>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{qty}<span className="text-[10px] font-normal text-slate-400"> kg</span></p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Price</p>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">₹{price}<span className="text-[10px] font-normal text-slate-400">/kg</span></p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Total</p>
                        <p className="text-[13px] font-bold text-green-700 dark:text-green-400">₹{total.toLocaleString("en-IN")}</p>
                    </div>
                </div>

                {/* Date */}
                {req.created_at && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 mb-3">
                        <Calendar size={10} className="flex-shrink-0" />
                        <span>{toDateString(req.created_at)}</span>
                    </div>
                )}

                <button type="button" onClick={onView}
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

// ─── Contract Bill Card ───────────────────────────────────────────────────────
function ContractCard({ contract, onView }: { contract: any; onView: () => void }) {
    const qpd   = contract.quantity_kg_per_delivery ?? contract.quantity_per_delivery ?? 0;
    const total = Number(contract.total_amount ?? (Number(contract.price_per_kg || 0) * Number(qpd || 0)));
    return (
        <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800
            overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-600
                opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <div className="p-4 sm:p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center
                            bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                            <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-white leading-tight truncate capitalize">
                                {contract.crop_name}
                            </h3>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                                {contract.farmer?.full_name || "Farmer"}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <StatusBadge status={contract.status || "active"} />
                        <StatusBadge status={contract.payment_status || "unpaid"} />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl mb-3
                    bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Qty</p>
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{qpd}<span className="text-[10px] font-normal text-slate-400"> kg</span></p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Freq</p>
                        <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100 truncate">{contract.delivery_frequency || "—"}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Total</p>
                        <p className="text-[13px] font-bold text-blue-600 dark:text-blue-400">₹{total.toLocaleString("en-IN")}</p>
                    </div>
                </div>

                {/* Period */}
                {(contract.start_date || contract.end_date) && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 mb-3">
                        <Calendar size={10} className="flex-shrink-0" />
                        <span className="truncate">{contract.start_date} → {contract.end_date}</span>
                    </div>
                )}

                <button type="button" onClick={onView}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-semibold
                        border border-slate-200 dark:border-slate-700
                        text-slate-600 dark:text-slate-300
                        bg-white dark:bg-slate-800
                        hover:border-blue-300 dark:hover:border-blue-700
                        hover:bg-blue-50 dark:hover:bg-blue-950/30
                        hover:text-blue-800 dark:hover:text-blue-300
                        transition-all">
                    <Receipt size={13} /> View Bill <ChevronRight size={12} className="opacity-50" />
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = "purchase" | "contracts";

const BillingPage = () => {
    const { user } = useUser();
    const [profileId,    setProfileId]    = useState<string | null>(null);
    const [isBillOpen,   setIsBillOpen]   = useState(false);
    const [selectedBill, setSelectedBill] = useState<any>(null);
    const [searchQuery,  setSearchQuery]  = useState("");
    const [activeTab,    setActiveTab]    = useState<Tab>("purchase");
    const [purchasePage, setPurchasePage] = useState(1);
    const [contractPage, setContractPage] = useState(1);
    const PAGE_SIZE = 8;

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: requests,  isLoading: reqLoading  } = usePurchaseRequests(profileId ? { buyer_id: profileId } : undefined, { enabled: !!profileId });
    const { data: contracts, isLoading: conLoading  } = useSupplyContracts(profileId ? { buyer_id: profileId } : undefined, { enabled: !!profileId });

    const purchaseBills  = useMemo(() => (requests  || []).filter((r: any) => r.status !== "rejected"), [requests]);
    const contractBills  = useMemo(() => (contracts || []).filter((c: any) => c.status !== "pending"),  [contracts]);

    const filteredPurchase = useMemo(() => purchaseBills.filter((r: any) =>
        r.crop_listing?.crop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.crop_listing?.farmer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [purchaseBills, searchQuery]);

    const filteredContracts = useMemo(() => contractBills.filter((c: any) =>
        c.crop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.farmer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [contractBills, searchQuery]);

    useEffect(() => { setPurchasePage(1); setContractPage(1); }, [searchQuery]);

    const paginatedPurchase = useMemo(() => {
        const s = (purchasePage - 1) * PAGE_SIZE;
        return filteredPurchase.slice(s, s + PAGE_SIZE);
    }, [filteredPurchase, purchasePage]);

    const paginatedContracts = useMemo(() => {
        const s = (contractPage - 1) * PAGE_SIZE;
        return filteredContracts.slice(s, s + PAGE_SIZE);
    }, [filteredContracts, contractPage]);

    // ── Stats ──────────────────────────────────────────────────────────────────
    const purchaseStats = [
        { label: "Total",  val: purchaseBills.length,                                                                dot: "bg-slate-400" },
        { label: "Paid",   val: purchaseBills.filter((r: any) => r.payment_status === "paid").length,               dot: "bg-green-500" },
        { label: "Value",  val: `₹${purchaseBills.reduce((s: number, r: any) => s + Number(r.total_amount ?? (Number(r.quantity_kg || 0) * Number(r.offered_price || 0))), 0).toLocaleString("en-IN")}`, dot: "bg-blue-500" },
    ];
    const contractStats = [
        { label: "Total",  val: contractBills.length,                                                                dot: "bg-slate-400" },
        { label: "Active", val: contractBills.filter((c: any) => c.status === "active").length,                      dot: "bg-blue-500"  },
        { label: "Value",  val: `₹${contractBills.reduce((s: number, c: any) => s + Number(c.total_amount ?? (Number(c.price_per_kg || 0) * Number(c.quantity_kg_per_delivery || 0))), 0).toLocaleString("en-IN")}`, dot: "bg-green-500" },
    ];
    const summaryStats = activeTab === "purchase" ? purchaseStats : contractStats;

    // ── Bill builders ──────────────────────────────────────────────────────────
    const showPurchaseBill = (req: any) => {
        const cropName = req.crop_listing?.crop_name || "Crop";
        const quantity = Number(req.quantity_kg || 0);
        const unitPrice = Number(req.offered_price || 0);
        const amount = Number(req.total_amount ?? (quantity * unitPrice));
        const nums = buildOfficialNumbers({ sourceId: String(req.id || req.billing_id || "REQ"), createdAt: req.created_at, kind: "PR" });
        setSelectedBill({
            title: `${cropName} - Purchase Request`,
            ...nums, billId: nums.billingId,
            transactionId: req.id, transactionType: "Produce Purchase",
            date: toDateString(req.created_at), amount,
            paymentStatus: req.payment_status || "unpaid",
            paymentConfirmedAt: req.payment_status === "paid" ? new Date(req.updated_at || req.created_at).toLocaleString("en-GB") : undefined,
            status: req.status || "accepted",
            buyer:  { id: req.buyer?.id || profileId || undefined, name: req.buyer?.full_name || user?.fullName || "Buyer", phone: req.buyer?.phone, email: req.buyer?.email || user?.primaryEmailAddress?.emailAddress || undefined, address: req.buyer?.location, state: req.buyer?.state, district: req.buyer?.district, taluka: req.buyer?.taluka, village_city: req.buyer?.village_city },
            seller: { id: req.crop_listing?.farmer?.id, name: req.crop_listing?.farmer?.full_name || "Farmer", phone: req.crop_listing?.farmer?.phone, email: req.crop_listing?.farmer?.email, address: req.crop_listing?.farmer?.location || req.crop_listing?.location, state: req.crop_listing?.farmer?.state, district: req.crop_listing?.farmer?.district, taluka: req.crop_listing?.farmer?.taluka, village_city: req.crop_listing?.farmer?.village_city },
            lineItems: [{ description: `${cropName} (${quantity} kg)`, quantity, unitPrice, amount }],
            subtotal: amount, taxRate: 0, taxAmount: 0, total: amount,
            originalRecord: req,
        });
        setIsBillOpen(true);
    };

    const showContractBill = (contract: any) => {
        const qpd = contract.quantity_kg_per_delivery ?? contract.quantity_per_delivery ?? 0;
        const amount = Number(contract.total_amount ?? (Number(contract.price_per_kg || 0) * Number(qpd || 0)));
        const nums = buildOfficialNumbers({ sourceId: String(contract.id || contract.billing_id || "CONTRACT"), createdAt: contract.start_date || contract.created_at, kind: "SC" });
        setSelectedBill({
            title: `${contract.crop_name} - Supply Contract`,
            ...nums, billId: nums.billingId,
            transactionId: contract.id, transactionType: "Supply Contract Delivery",
            date: toDateString(contract.start_date || contract.created_at), amount,
            paymentStatus: contract.payment_status || "unpaid",
            paymentConfirmedAt: contract.payment_status === "paid" ? new Date(contract.updated_at || contract.created_at).toLocaleString("en-GB") : undefined,
            status: contract.status || "active",
            buyer:  { id: contract.buyer?.id || profileId || undefined, name: contract.buyer?.full_name || user?.fullName || "Buyer", phone: contract.buyer?.phone, email: contract.buyer?.email || user?.primaryEmailAddress?.emailAddress || undefined, address: contract.buyer?.location, state: contract.buyer?.state, district: contract.buyer?.district, taluka: contract.buyer?.taluka, village_city: contract.buyer?.village_city },
            seller: { id: contract.farmer?.id, name: contract.farmer?.full_name || "Farmer", phone: contract.farmer?.phone, email: contract.farmer?.email, address: contract.farmer?.location, state: contract.farmer?.state, district: contract.farmer?.district, taluka: contract.farmer?.taluka, village_city: contract.farmer?.village_city },
            lineItems: [{ description: `${contract.crop_name} (${qpd} kg/${contract.delivery_frequency || "delivery"})`, quantity: 1, unitPrice: amount, amount }],
            subtotal: amount, taxRate: 0, taxAmount: 0, total: amount,
            originalRecord: contract,
        });
        setIsBillOpen(true);
    };

    const loading = !profileId || (reqLoading || conLoading);

    const TABS = [
        { id: "purchase"  as Tab, label: "Purchase Bills",  count: purchaseBills.length  },
        { id: "contracts" as Tab, label: "Contract Bills",  count: contractBills.length  },
    ];

    return (
        <DashboardLayout subtitle="">
            <div className="space-y-5 pb-8 w-full">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0
                            bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800">
                            <Receipt className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-[18px] sm:text-[20px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                                Billing Center
                            </h1>
                            <p className="text-[11px] sm:text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">
                                View &amp; download your purchase and contract bills
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={activeTab === "purchase" ? "Search crop or seller…" : "Search contract…"}
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
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1 sm:p-1.5 flex gap-1 sm:gap-1.5 shadow-sm">
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button key={tab.id} type="button"
                                onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all ${
                                    isActive
                                        ? "bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800 text-white shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                }`}>
                                {tab.id === "purchase"
                                    ? <Wheat size={14} className={isActive ? "text-white/90" : ""} />
                                    : <FileText size={14} className={isActive ? "text-white/90" : ""} />
                                }
                                <span className="truncate">{tab.label}</span>
                                {tab.count > 0 && (
                                    <span className={`inline-flex items-center justify-center min-w-[18px] h-4 sm:h-5 px-1 sm:px-1.5 rounded-full text-[9px] sm:text-[10px] font-bold flex-shrink-0 ${
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

                {/* ── Summary strip ── */}
                {!loading && (
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        {summaryStats.map(s => (
                            <div key={s.label}
                                className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 px-3 py-3 sm:px-5 sm:py-4 flex items-center gap-2 sm:gap-4 shadow-sm min-w-0">
                                <span className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${s.dot}`} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] sm:text-[20px] md:text-[24px] font-bold text-slate-900 dark:text-white leading-none truncate">{s.val}</p>
                                    <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 truncate">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Content ── */}
                {loading ? (
                    <PageSkeleton type="grid" />
                ) : activeTab === "purchase" ? (
                    !purchaseBills.length ? (
                        <EmptyState icon={Wheat} title="No Purchase Bills Yet"
                            subtitle="Bills appear here once your purchase requests are accepted." />
                    ) : !filteredPurchase.length ? (
                        <EmptyState icon={Search} title="No Results"
                            subtitle="No purchase bills match your search." />
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
                                {paginatedPurchase.map((req: any) => (
                                    <PurchaseCard key={req.id} req={req} onView={() => showPurchaseBill(req)} />
                                ))}
                            </div>
                            <Pagination page={purchasePage} total={filteredPurchase.length} pageSize={PAGE_SIZE} onChange={setPurchasePage} />
                        </div>
                    )

                ) : (
                    !contractBills.length ? (
                        <EmptyState icon={FileText} title="No Contract Bills Yet"
                            subtitle="Bills appear here once supply contracts move past the pending stage." />
                    ) : !filteredContracts.length ? (
                        <EmptyState icon={Search} title="No Results"
                            subtitle="No contract bills match your search." />
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
                                {paginatedContracts.map((contract: any) => (
                                    <ContractCard key={contract.id} contract={contract} onView={() => showContractBill(contract)} />
                                ))}
                            </div>
                            <Pagination page={contractPage} total={filteredContracts.length} pageSize={PAGE_SIZE} onChange={setContractPage} />
                        </div>
                    )
                )}
            </div>

            <BillReceiptDialog
                isOpen={isBillOpen}
                onClose={() => setIsBillOpen(false)}
                billData={selectedBill}
                canMarkPaid={false}
            />
        </DashboardLayout>
    );
};

export default BillingPage;