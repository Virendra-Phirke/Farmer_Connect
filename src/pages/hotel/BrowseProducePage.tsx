import { useState, useEffect } from "react";
import { useCropListings } from "@/hooks/useCropListings";
import { useCreatePurchaseRequest } from "@/hooks/usePurchaseRequests";
import { useUser } from "@clerk/clerk-react";
import { getProfileId, getUserProfile, updateUserProfile } from "@/lib/supabase-auth";
import { safeStorageGetItem, safeStorageSetItem } from "@/lib/storage";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Loader2, Store, Heart, Search, X,
    ChevronLeft, ChevronRight, Wheat, SlidersHorizontal,
    ShoppingCart, User, Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/PageSkeleton";

const PAGE_SIZE = 12;

/* ── Field ───────────────────────────────────────────────────────────────── */
const Field = ({ label, required, children }: {
    label: string; required?: boolean; children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

/* ── shared input class ──────────────────────────────────────────────────── */
const inputCls =
    "h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700 " +
    "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
    "placeholder:text-gray-400 dark:placeholder:text-gray-500 " +
    "focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all duration-150";

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
const BrowseProducePage = () => {
    const { data: listings, isLoading } = useCropListings({ status: "available" });
    const createRequest = useCreatePurchaseRequest();

    const [searchQuery, setSearchQuery]         = useState("");
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [favoriteFarmers, setFavoriteFarmers] = useState<string[]>([]);
    const [currentPage, setCurrentPage]         = useState(1);
    const [selectedCrop, setSelectedCrop]       = useState<any | null>(null);
    const [requestQuantity, setRequestQuantity] = useState("");
    const [message, setMessage]                 = useState("");

    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
        const saved = safeStorageGetItem("favoriteFarmers");
        if (saved) {
            try { setFavoriteFarmers(JSON.parse(saved)); } catch {
                // Ignore invalid JSON
            }
        }
    }, [user?.id]);

    const toggleFavorite = (farmerId: string) => {
        setFavoriteFarmers(prev => {
            const next = prev.includes(farmerId)
                ? prev.filter(id => id !== farmerId)
                : [...prev, farmerId];
            safeStorageSetItem("favoriteFarmers", JSON.stringify(next));
            return next;
        });
    };

    const filteredListings = listings?.filter((item: any) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            item.crop_name?.toLowerCase().includes(q) ||
            item.farmer?.full_name?.toLowerCase().includes(q);
        const matchesFav = showFavoritesOnly ? favoriteFarmers.includes(item.farmer_id) : true;
        return matchesSearch && matchesFav;
    }) ?? [];

    useEffect(() => { setCurrentPage(1); }, [searchQuery, showFavoritesOnly, listings?.length]);

    const totalPages      = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE));
    const paginatedItems  = filteredListings.slice(
        (currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE
    );

    const handleSendRequest = async () => {
        if (!profileId || !selectedCrop || !requestQuantity) {
            toast.error("Please fill in quantity."); return;
        }
        try {
            if (user?.id) {
                const phone = user?.phoneNumbers?.[0]?.phoneNumber;
                const existing = await getUserProfile(user.id);
                if (!existing?.phone && phone) await updateUserProfile(user.id, { phone });
                const refreshed = await getUserProfile(user.id);
                if (!refreshed?.phone) {
                    toast.error("Please add your mobile number in Profile before sending requests.");
                    return;
                }
            }
        } catch {
            toast.error("Please add your mobile number in Profile before sending requests.");
            return;
        }

        const qty = parseFloat(requestQuantity);
        if (qty <= 0) { toast.error("Quantity must be greater than zero."); return; }
        if (qty > selectedCrop.quantity_kg) {
            toast.error(`Only ${selectedCrop.quantity_kg} kg available.`); return;
        }

        createRequest.mutate({
            crop_listing_id: selectedCrop.id,
            buyer_id:        profileId,
            quantity_kg:     qty,
            offered_price:   selectedCrop.price_per_kg,
            request_type:    "single",
            status:          "pending",
            message:         message || undefined,
            payment_status:  "unpaid",
            billing_id:      null,
        }, {
            onSuccess: () => {
                toast.success("Purchase request sent to farmer!");
                setSelectedCrop(null); setRequestQuantity(""); setMessage("");
            },
            onError: () => toast.error("Failed to send request"),
        });
    };

    const totalCost = requestQuantity && selectedCrop
        ? (parseFloat(requestQuantity) * (selectedCrop.price_per_kg ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : null;

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
                                <Wheat size={9} /> Fresh Produce
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight mb-1">
                                Browse Produce
                            </h1>
                            <p className="text-teal-100/75 text-xs sm:text-sm max-w-md">
                                Buy fresh crops directly from local farmers — search, favourite and request.
                            </p>
                        </div>
                        {!isLoading && (
                            <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                                bg-white/10 border border-white/20 text-white text-xs font-semibold flex-shrink-0">
                                <SlidersHorizontal size={12} />
                                {filteredListings.length} listing{filteredListings.length !== 1 ? "s" : ""}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── TOOLBAR ───────────────────────────────────────────── */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* search */}
                    <div className="relative flex-1 min-w-0">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                            text-gray-400 dark:text-gray-500 pointer-events-none" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search crops or farmers…"
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

                    {/* favourites toggle */}
                    <button
                        onClick={() => setShowFavoritesOnly(v => !v)}
                        className={[
                            "flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl",
                            "text-xs font-semibold border transition-all duration-150",
                            showFavoritesOnly
                                ? "bg-red-500 text-white border-red-500 shadow-sm hover:bg-red-600"
                                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-red-300 hover:text-red-500 dark:hover:border-red-800 dark:hover:text-red-400",
                        ].join(" ")}>
                        <Heart size={13} className={showFavoritesOnly ? "fill-white" : ""} />
                        <span className="hidden sm:inline">{showFavoritesOnly ? "All Listings" : "Favourites"}</span>
                    </button>

                    {/* count — mobile */}
                    {!isLoading && (
                        <span className="sm:hidden flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl
                            text-xs font-medium bg-white dark:bg-gray-900
                            border border-gray-200 dark:border-gray-700
                            text-gray-500 dark:text-gray-400 shadow-sm">
                            <SlidersHorizontal size={11} />
                            {filteredListings.length}
                        </span>
                    )}
                </div>

                {/* ── CONTENT ───────────────────────────────────────────── */}

                {/* Loading */}
                {(!profileId || isLoading) ? (
                    <PageSkeleton type="grid" />

                /* Empty */
                ) : !filteredListings.length ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center
                        rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-900/50">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3
                            bg-teal-50 dark:bg-teal-950 text-teal-500 dark:text-teal-400
                            border border-teal-100 dark:border-teal-900">
                            {showFavoritesOnly ? <Heart size={22} /> : <Store size={22} />}
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                            {showFavoritesOnly ? "No Favourite Farmers" : searchQuery ? `No results for "${searchQuery}"` : "No Produce Available"}
                        </h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                            {showFavoritesOnly
                                ? "Heart a farmer to save them here."
                                : searchQuery ? "Try a different search term." : "Check back soon for fresh listings."}
                        </p>
                    </div>

                /* Grid */
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            {paginatedItems.map((item: any) => {
                                const isFav = favoriteFarmers.includes(item.farmer_id);
                                return (
                                    <div key={item.id}
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
                                            <div className="flex items-start gap-2.5 mb-3">
                                                <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center
                                                    bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400
                                                    border border-teal-100 dark:border-teal-800">
                                                    <Wheat size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                                                        {item.crop_name}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                                                        <User size={9} className="flex-shrink-0" />
                                                        {item.farmer?.full_name || "Unknown Farmer"}
                                                    </p>
                                                </div>
                                                {/* heart */}
                                                <button
                                                    onClick={() => toggleFavorite(item.farmer_id)}
                                                    className={[
                                                        "flex-shrink-0 p-1.5 rounded-lg transition-colors",
                                                        isFav
                                                            ? "text-red-500 bg-red-50 dark:bg-red-950/40"
                                                            : "text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30",
                                                    ].join(" ")}
                                                    title={isFav ? "Remove from favourites" : "Add to favourites"}>
                                                    <Heart size={14} className={isFav ? "fill-red-500" : ""} />
                                                </button>
                                            </div>

                                            {/* price */}
                                            <div className="flex items-baseline gap-0.5 mb-2.5">
                                                <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                                                    ₹{(item.price_per_kg ?? 0).toLocaleString("en-IN")}
                                                </span>
                                                <span className="text-[11px] text-gray-400 dark:text-gray-500">/kg</span>
                                            </div>

                                            {/* available qty */}
                                            <div className="flex items-center gap-1 mb-3 text-[11px] text-gray-400 dark:text-gray-500">
                                                <Package size={9} className="text-teal-500 flex-shrink-0" />
                                                <span>{item.quantity_kg} kg available</span>
                                            </div>

                                            {/* description */}
                                            {item.description && (
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed
                                                    line-clamp-2 mb-3 flex-1">
                                                    {item.description}
                                                </p>
                                            )}

                                            {/* CTA */}
                                            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                                                <button
                                                    onClick={() => setSelectedCrop(item)}
                                                    className="w-full inline-flex items-center justify-center gap-1.5
                                                        py-2 rounded-lg text-xs font-semibold
                                                        bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                                        dark:bg-teal-500 dark:hover:bg-teal-600
                                                        shadow-sm hover:shadow transition-all duration-150">
                                                    <ShoppingCart size={12} /> Request to Buy
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between flex-wrap gap-2
                                px-4 py-3 rounded-xl
                                bg-white dark:bg-gray-900
                                border border-gray-200 dark:border-gray-700 shadow-sm">
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    Page {currentPage} of {totalPages} · {filteredListings.length} listing{filteredListings.length !== 1 ? "s" : ""}
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

            {/* ══ PURCHASE REQUEST DIALOG ════════════════════════════════════ */}
            <Dialog open={!!selectedCrop} onOpenChange={open => !open && setSelectedCrop(null)}>
                <DialogContent className="w-[calc(100vw-20px)] sm:max-w-sm max-h-[92vh] overflow-y-auto
                    rounded-2xl p-0 gap-0">

                    {/* dialog header */}
                    <div className="relative overflow-hidden rounded-t-2xl
                        bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800
                        dark:from-teal-800 dark:via-teal-900 dark:to-gray-900 px-5 py-4">
                        <div className="absolute inset-0 opacity-10
                            bg-[radial-gradient(circle_at_70%_30%,white_1px,transparent_1px)]
                            bg-[size:16px_16px] pointer-events-none" />
                        <div className="relative flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center
                                bg-white/15 border border-white/20 text-white flex-shrink-0">
                                <ShoppingCart size={14} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm font-bold text-white leading-tight truncate">
                                    Request: {selectedCrop?.crop_name}
                                </h2>
                                <p className="text-teal-100/70 text-xs mt-0.5 truncate">
                                    from {selectedCrop?.farmer?.full_name || "Unknown Farmer"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="px-5 py-4 space-y-3">
                        {/* listing summary */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl
                                bg-teal-50 dark:bg-teal-950/30
                                border border-teal-100 dark:border-teal-800">
                                <span className="text-[10px] font-semibold text-teal-500 dark:text-teal-500 uppercase tracking-wider">Listed Price</span>
                                <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                                    ₹{(selectedCrop?.price_per_kg ?? 0).toLocaleString("en-IN")}<span className="text-xs font-normal">/kg</span>
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl
                                bg-gray-50 dark:bg-gray-800/50
                                border border-gray-200 dark:border-gray-700">
                                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Available</span>
                                <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                                    {selectedCrop?.quantity_kg}<span className="text-xs font-normal text-gray-400"> kg</span>
                                </span>
                            </div>
                        </div>

                        {/* fields */}
                        <Field label="Quantity (kg)" required>
                            <Input
                                type="number" min="1" max={selectedCrop?.quantity_kg}
                                value={requestQuantity}
                                onChange={e => setRequestQuantity(e.target.value)}
                                placeholder={`Max ${selectedCrop?.quantity_kg} kg`}
                                className={inputCls}
                            />
                        </Field>

                        <Field label="Message">
                            <Input
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Optional details or notes…"
                                className={inputCls}
                            />
                        </Field>

                        {/* live total */}
                        {totalCost && (
                            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl
                                bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-800">
                                <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">Total Amount</span>
                                <span className="text-base font-bold text-teal-600 dark:text-teal-400">₹{totalCost}</span>
                            </div>
                        )}

                        {/* actions */}
                        <div className="flex gap-2 pt-1">
                            <button onClick={() => setSelectedCrop(null)}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold
                                    text-gray-600 dark:text-gray-300
                                    border border-gray-200 dark:border-gray-700
                                    bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800
                                    transition-all duration-150">
                                Cancel
                            </button>
                            <button
                                onClick={handleSendRequest}
                                disabled={createRequest.isPending || !requestQuantity}
                                className="flex-1 inline-flex items-center justify-center gap-1.5
                                    py-2 rounded-xl text-sm font-semibold
                                    bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                    dark:bg-teal-500 dark:hover:bg-teal-600
                                    shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
                                    transition-all duration-150">
                                {createRequest.isPending
                                    ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
                                    : <><ShoppingCart size={13} /> Submit Request</>}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default BrowseProducePage;