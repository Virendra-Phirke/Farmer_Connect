import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useOpenCropRequirements } from "@/hooks/useCropRequirements";
import { useCreateSupplyContract } from "@/hooks/useSupplyContracts";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { getProfileId } from "@/lib/supabase-auth";
import {
    Loader2, ArrowRight, CheckCircle, Search, X,
    Wheat, MapPin, Calendar, Package, ChevronLeft,
    ChevronRight, Building2, SlidersHorizontal, BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/PageSkeleton";

const PAGE_SIZE = 12;

/* ── Field wrapper ───────────────────────────────────────────────────────── */
const Field = ({ label, required, children }: {
    label: string; required?: boolean; children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

/* ── Info row ────────────────────────────────────────────────────────────── */
const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-2">
        <Icon size={11} className="text-teal-500 dark:text-teal-400 mt-0.5 flex-shrink-0" />
        <span className="text-[11px] text-gray-400 dark:text-gray-500">{label}:</span>
        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex-1 text-right">{value}</span>
    </div>
);

/* ── Bill row ────────────────────────────────────────────────────────────── */
const BillRow = ({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) => (
    <div className="flex items-center justify-between gap-2">
        <span className={`text-xs ${bold ? "font-semibold text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}>{label}</span>
        <span className={`text-xs ${bold ? "font-bold text-gray-900 dark:text-gray-100" : "font-semibold text-gray-700 dark:text-gray-300"}`}>{value}</span>
    </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
export default function HotelCropRequestsPage() {
    const { user } = useUser();
    const [profileId, setProfileId]               = useState<string | null>(null);
    const [selectedReq, setSelectedReq]           = useState<any>(null);
    const [proposedPrice, setProposedPrice]       = useState("");
    const [confirmedProposal, setConfirmedProposal] = useState<any>(null);
    const [searchQuery, setSearchQuery]           = useState("");
    const [currentPage, setCurrentPage]           = useState(1);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: requirements, isLoading } = useOpenCropRequirements();
    const createContract = useCreateSupplyContract();

    const filteredRequirements = requirements?.filter((req: any) =>
        req.crop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.hotel?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.hotel?.location?.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

    useEffect(() => { setCurrentPage(1); }, [searchQuery]);

    const totalPages     = Math.max(1, Math.ceil(filteredRequirements.length / PAGE_SIZE));
    const paginatedItems = filteredRequirements.slice(
        (currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE
    );

    const handleFulfill = () => {
        if (!profileId || !selectedReq || !proposedPrice) {
            toast.error("Please enter a price for your proposal");
            return;
        }
        const price = parseFloat(proposedPrice);
        if (isNaN(price) || price <= 0) {
            toast.error("Please enter a valid price");
            return;
        }
        createContract.mutate({
            farmer_id:                profileId,
            buyer_id:                 selectedReq.hotel_id,
            crop_name:                selectedReq.crop_name,
            quantity_kg_per_delivery: selectedReq.quantity_kg,
            delivery_frequency:       "weekly",
            start_date:               new Date().toISOString().split("T")[0],
            end_date:                 new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            price_per_kg:             price,
            payment_status:           "unpaid",
            status:                   "pending",
        }, {
            onSuccess: (data: any) => {
                toast.success(`Proposal sent to ${selectedReq.hotel?.full_name || "Hotel"}`);
                setConfirmedProposal({
                    proposalId:       data.id,
                    cropName:         selectedReq.crop_name,
                    hotelName:        selectedReq.hotel?.full_name || "Hotel",
                    quantity:         selectedReq.quantity_kg,
                    pricePerKg:       price,
                    totalPerDelivery: price * selectedReq.quantity_kg,
                    frequency:        "Weekly",
                    startDate:        new Date().toLocaleDateString(),
                    endDate:          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                });
                setSelectedReq(null);
                setProposedPrice("");
            },
            onError: (e: any) =>
                toast.error(e?.message || "Failed to send proposal. Please try again."),
        });
    };

    const closeProposal = () => { setSelectedReq(null); setProposedPrice(""); };

    return (
        <DashboardLayout subtitle="">
            <div className="w-full space-y-4 sm:space-y-5">

                {/* ── HERO ──────────────────────────────────────────────── */}
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl
                    bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800
                    dark:from-teal-800 dark:via-teal-900 dark:to-gray-900
                    border border-teal-500/30 dark:border-teal-700/50
                    shadow-md shadow-teal-200/30 dark:shadow-none
                    px-5 py-5 sm:px-8 sm:py-7">
                    <div className="absolute inset-0 opacity-10
                        bg-[radial-gradient(circle_at_70%_30%,white_1px,transparent_1px)]
                        bg-[size:18px_18px] pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                bg-white/15 border border-white/20 text-white/90
                                text-[0.65rem] font-semibold tracking-widest uppercase mb-2.5">
                                <Building2 size={9} /> Hotel Crop Requests
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight mb-1">
                                Open Crop Requirements
                            </h1>
                            <p className="text-teal-100/75 text-xs sm:text-sm max-w-md">
                                Hotels and buyers are looking for fresh crops. Propose your supply contract and start earning.
                            </p>
                        </div>
                        {!isLoading && (
                            <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                                bg-white/10 border border-white/20 text-white text-xs font-semibold flex-shrink-0">
                                <SlidersHorizontal size={12} />
                                {filteredRequirements.length} request{filteredRequirements.length !== 1 ? "s" : ""}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── SEARCH ────────────────────────────────────────────── */}
                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                            text-gray-400 dark:text-gray-500 pointer-events-none" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by crop, hotel or location…"
                            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm
                                bg-white dark:bg-gray-900
                                border border-gray-200 dark:border-gray-700
                                text-gray-900 dark:text-gray-100
                                placeholder:text-gray-400 dark:placeholder:text-gray-500
                                focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15
                                shadow-sm transition-all duration-150"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2
                                    text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    {!isLoading && (
                        <span className="sm:hidden flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl
                            text-xs font-medium bg-white dark:bg-gray-900
                            border border-gray-200 dark:border-gray-700
                            text-gray-500 dark:text-gray-400 shadow-sm">
                            <SlidersHorizontal size={11} />
                            {filteredRequirements.length}
                        </span>
                    )}
                </div>

                {/* ── BODY ──────────────────────────────────────────────── */}

                {/* Loading */}
                {(!profileId || isLoading) ? (
                    <PageSkeleton type="grid" />

                /* No requirements */
                ) : !requirements?.length ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center
                        rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-900/50">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3
                            bg-teal-50 dark:bg-teal-950 text-teal-500 dark:text-teal-400
                            border border-teal-100 dark:border-teal-900">
                            <Wheat size={22} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">No Open Requests</h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                            No hotels are currently looking for crops. Check back soon!
                        </p>
                    </div>

                /* No search match */
                ) : !filteredRequirements.length ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center
                        rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-900/50">
                        <Search size={20} className="text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No requests match "{searchQuery}"
                        </p>
                    </div>

                /* Grid */
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            {paginatedItems.map((req: any) => (
                                <div key={req.id}
                                    className="group relative flex flex-col bg-white dark:bg-gray-900
                                        rounded-xl overflow-hidden shadow-sm
                                        border border-gray-200 dark:border-gray-700
                                        hover:border-teal-300 dark:hover:border-teal-700
                                        hover:shadow-md hover:-translate-y-0.5
                                        transition-all duration-200">

                                    {/* top accent */}
                                    <div className="h-0.5 w-full bg-gradient-to-r from-teal-500 to-teal-400
                                        opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                                    <div className="flex flex-col flex-1 p-4">
                                        {/* header */}
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center
                                                    bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400
                                                    border border-teal-100 dark:border-teal-800">
                                                    <Wheat size={16} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                                        {req.crop_name}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                                                        {req.hotel?.full_name || "Unknown Buyer"}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full
                                                text-[10px] font-bold
                                                bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400
                                                border border-blue-100 dark:border-blue-800">
                                                Wanted
                                            </span>
                                        </div>

                                        {/* quantity highlight */}
                                        <div className="flex items-baseline gap-1 mb-3 px-3 py-2 rounded-lg
                                            bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-800">
                                            <span className="text-xl font-bold text-teal-600 dark:text-teal-400">
                                                {req.quantity_kg}
                                            </span>
                                            <span className="text-xs text-teal-500 dark:text-teal-500 font-medium">kg needed</span>
                                        </div>

                                        {/* details */}
                                        <div className="space-y-1.5 mb-4 flex-1">
                                            <InfoRow icon={Calendar} label="Required By"
                                                value={req.required_by_date
                                                    ? new Date(req.required_by_date).toLocaleDateString()
                                                    : "ASAP"} />
                                            <InfoRow icon={MapPin} label="Location"
                                                value={req.hotel?.location || "—"} />
                                            <InfoRow icon={Building2} label="Buyer"
                                                value={req.hotel?.full_name || "Unknown"} />
                                        </div>

                                        {/* action */}
                                        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                                            <button
                                                onClick={() => setSelectedReq(req)}
                                                disabled={createContract.isPending}
                                                className="w-full inline-flex items-center justify-center gap-1.5
                                                    py-2 rounded-lg text-xs font-semibold
                                                    bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                                    dark:bg-teal-500 dark:hover:bg-teal-600
                                                    shadow-sm hover:shadow disabled:opacity-50
                                                    transition-all duration-150">
                                                <ArrowRight size={12} /> Propose Supply Contract
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between flex-wrap gap-2
                                px-4 py-3 rounded-xl
                                bg-white dark:bg-gray-900
                                border border-gray-200 dark:border-gray-700 shadow-sm">
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    Page {currentPage} of {totalPages} · {filteredRequirements.length} requests
                                </span>
                                <div className="flex items-center gap-2">
                                    <button disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg
                                            border border-gray-200 dark:border-gray-700
                                            bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400
                                            hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50
                                            dark:hover:border-teal-600 dark:hover:text-teal-400 dark:hover:bg-teal-950
                                            disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                        <ChevronLeft size={14} />
                                    </button>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums px-1">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg
                                            border border-gray-200 dark:border-gray-700
                                            bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400
                                            hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50
                                            dark:hover:border-teal-600 dark:hover:text-teal-400 dark:hover:bg-teal-950
                                            disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ══ PROPOSAL DIALOG ════════════════════════════════════════════ */}
            <Dialog open={!!selectedReq} onOpenChange={open => !open && closeProposal()}>
                <DialogContent className="w-[calc(100vw-24px)] sm:max-w-sm max-h-[92vh] overflow-y-auto
                    rounded-xl sm:rounded-2xl p-4 sm:p-6">
                    <DialogHeader className="mb-3">
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center
                                bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400
                                border border-teal-100 dark:border-teal-800 flex-shrink-0">
                                <Wheat size={13} />
                            </div>
                            Propose Supply Contract
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {selectedReq?.crop_name} → {selectedReq?.hotel?.full_name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        {/* summary */}
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50
                            border border-gray-200 dark:border-gray-700 p-3">
                            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                Request Summary
                            </p>
                            <div className="space-y-1.5">
                                <BillRow label="Crop" value={selectedReq?.crop_name} />
                                <BillRow label="Quantity" value={`${selectedReq?.quantity_kg} kg / week`} />
                                <BillRow label="Buyer" value={selectedReq?.hotel?.full_name || "—"} />
                            </div>
                        </div>

                        {/* price input */}
                        <Field label="Your Price per kg (₹)" required>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="e.g. 45.50"
                                value={proposedPrice}
                                onChange={e => setProposedPrice(e.target.value)}
                                autoFocus
                                className="h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700
                                    bg-gray-50 dark:bg-gray-800 focus:border-teal-400 focus:ring-teal-400/20"
                            />
                        </Field>

                        {/* live total */}
                        {proposedPrice && !isNaN(parseFloat(proposedPrice)) && parseFloat(proposedPrice) > 0 && (
                            <div className="rounded-xl bg-teal-50 dark:bg-teal-950/30
                                border border-teal-100 dark:border-teal-800 p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                                        Total per delivery
                                    </span>
                                    <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                                        ₹{(parseFloat(proposedPrice) * (selectedReq?.quantity_kg || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <p className="text-[11px] text-teal-500/70 dark:text-teal-600 mt-0.5">
                                    {selectedReq?.quantity_kg} kg × ₹{proposedPrice}/kg · weekly delivery
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 justify-end mt-4">
                        <button onClick={closeProposal}
                            className="px-4 py-2 rounded-xl text-sm font-semibold
                                text-gray-600 dark:text-gray-300
                                border border-gray-200 dark:border-gray-700
                                bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800
                                transition-all duration-150">
                            Cancel
                        </button>
                        <button onClick={handleFulfill}
                            disabled={createContract.isPending || !proposedPrice}
                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold
                                bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                dark:bg-teal-500 dark:hover:bg-teal-600
                                shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-150">
                            {createContract.isPending
                                ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
                                : "Send Proposal"}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ══ CONFIRMATION DIALOG ════════════════════════════════════════ */}
            <Dialog open={!!confirmedProposal} onOpenChange={open => !open && setConfirmedProposal(null)}>
                <DialogContent className="w-[calc(100vw-24px)] sm:max-w-sm max-h-[90vh] overflow-y-auto
                    rounded-xl sm:rounded-2xl p-4 sm:p-6">
                    <DialogHeader className="mb-3">
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center
                                bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400
                                border border-teal-100 dark:border-teal-800 flex-shrink-0">
                                <CheckCircle size={13} />
                            </div>
                            Proposal Sent!
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Your proposal has been sent to {confirmedProposal?.hotelName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        {/* proposal summary */}
                        <div className="rounded-xl bg-teal-50 dark:bg-teal-950/30
                            border border-teal-200 dark:border-teal-800 p-3.5 space-y-2">
                            <p className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-2.5">
                                Proposal Summary
                            </p>
                            <BillRow label="Crop" value={confirmedProposal?.cropName} />
                            <BillRow label="Buyer" value={confirmedProposal?.hotelName} />
                            <BillRow label="Qty/Delivery" value={`${confirmedProposal?.quantity} kg`} />
                            <BillRow label="Price/kg" value={`₹${confirmedProposal?.pricePerKg}`} />
                            <div className="pt-2 mt-1 border-t border-teal-200 dark:border-teal-800 flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Total / Delivery</span>
                                <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                                    ₹{confirmedProposal?.totalPerDelivery.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* contract details */}
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50
                            border border-gray-200 dark:border-gray-700 p-3.5 space-y-2">
                            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                Contract Details
                            </p>
                            <BillRow label="Frequency" value={confirmedProposal?.frequency} />
                            <BillRow label="Start Date" value={confirmedProposal?.startDate} />
                            <BillRow label="End Date" value={confirmedProposal?.endDate} />
                            <BillRow label="Status"
                                value={
                                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400
                                        bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800
                                        px-2 py-0.5 rounded-full">
                                        Pending Acceptance
                                    </span>
                                }
                            />
                        </div>

                        {/* next steps */}
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30
                            border border-blue-100 dark:border-blue-800 p-3">
                            <div className="flex items-start gap-2">
                                <BadgeCheck size={13} className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                                    <span className="font-semibold">Next Steps:</span> The hotel will review your proposal and accept or reject it. You'll be notified once they respond.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-4">
                        <button onClick={() => setConfirmedProposal(null)}
                            className="w-full py-2.5 rounded-xl text-sm font-semibold
                                bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                dark:bg-teal-500 dark:hover:bg-teal-600
                                shadow-sm transition-all duration-150">
                            Done
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}