import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId, getUserProfile, updateUserProfile } from "@/lib/supabase-auth";
import {
    useEquipmentListings, useCreateEquipmentListing,
    useDeleteEquipmentListing, useUpdateEquipmentListing,
} from "@/hooks/useEquipmentListings";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    Loader2, Plus, Trash2, Tractor, Edit2, Search, X,
    MapPin, Tag, ChevronLeft, ChevronRight, Package,
    BadgeCheck, AlertTriangle,
} from "lucide-react";
import { PageSkeleton } from "@/components/PageSkeleton";

const PAGE_SIZE = 12;

/* ── shared input class ──────────────────────────────────────────────────── */
const inputCls =
    "h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700 " +
    "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
    "placeholder:text-gray-400 dark:placeholder:text-gray-500 " +
    "focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all duration-150";

/* ── Field wrapper ───────────────────────────────────────────────────────── */
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

/* ── Stock badge ─────────────────────────────────────────────────────────── */
const AvailBadge = ({ qty }: { qty: number }) => {
    if (qty === 0) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
            bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400
            border border-red-200 dark:border-red-800">
            <AlertTriangle size={8} /> Unavailable
        </span>
    );
    if (qty <= 2) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold
            bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400
            border border-amber-200 dark:border-amber-800">
            Limited · {qty}
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
            bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400
            border border-teal-100 dark:border-teal-800">
            <BadgeCheck size={9} /> {qty} units
        </span>
    );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
const MyEquipmentPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId]   = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit]     = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // form state
    const [name, setName]               = useState("");
    const [category, setCategory]       = useState("");
    const [pricePerDay, setPricePerDay] = useState("");
    const [quantity, setQuantity]       = useState("");
    const [location, setLocation]       = useState("");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: equipment, isLoading } = useEquipmentListings(
        profileId ? { owner_id: profileId } : undefined,
        { enabled: !!profileId }
    );
    const createMutation = useCreateEquipmentListing();
    const updateMutation = useUpdateEquipmentListing();
    const deleteMutation = useDeleteEquipmentListing();

    const filteredEquipment = equipment?.filter((item: any) =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

    useEffect(() => { setCurrentPage(1); }, [searchQuery]);
    const totalPages     = Math.max(1, Math.ceil(filteredEquipment.length / PAGE_SIZE));
    const paginatedItems = filteredEquipment.slice(
        (currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE
    );

    const ensureSellerMobile = async () => {
        if (!user?.id) return false;
        const existing = await getUserProfile(user.id);
        if (existing?.phone) return true;
        const clerkPhone = user.phoneNumbers?.[0]?.phoneNumber;
        if (clerkPhone) { await updateUserProfile(user.id, { phone: clerkPhone }); return true; }
        toast.error("Add your mobile number in Profile first to list equipment.");
        return false;
    };

    const resetForm = () => { setName(""); setCategory(""); setPricePerDay(""); setQuantity(""); setLocation(""); setDescription(""); };

    const handleCreate = async () => {
        if (!profileId || !name || !category || !pricePerDay || !location || !quantity) {
            toast.error("Please fill all required fields"); return;
        }
        if (!(await ensureSellerMobile())) return;
        createMutation.mutate(
            { owner_id: profileId, name, category, price_per_day: parseFloat(pricePerDay), location, description, quantity: parseInt(quantity), image_url: null },
            {
                onSuccess: () => { toast.success("Equipment listed!"); setShowCreate(false); resetForm(); },
                onError:   () => toast.error("Failed to create listing"),
            }
        );
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setName(item.name); setCategory(item.category);
        setPricePerDay(item.price_per_day.toString());
        setQuantity(item.quantity?.toString() || "1");
        setLocation(item.location); setDescription(item.description || "");
        setShowEdit(true);
    };

    const handleUpdate = async () => {
        if (!editingItem || !name || !category || !pricePerDay || !location || !quantity) {
            toast.error("Please fill all required fields"); return;
        }
        if (!(await ensureSellerMobile())) return;
        updateMutation.mutate(
            { id: editingItem.id, updates: { name, category, price_per_day: parseFloat(pricePerDay), location, description, quantity: parseInt(quantity) } },
            {
                onSuccess: () => { toast.success("Equipment updated!"); setShowEdit(false); setEditingItem(null); resetForm(); },
                onError:   () => toast.error("Failed to update listing"),
            }
        );
    };

    /* ── shared dialog form ─────────────────────────────────────────────── */
    const EquipmentForm = ({ onSubmit, isPending, submitLabel }: {
        onSubmit: () => void; isPending: boolean; submitLabel: string;
    }) => (
        <div className="space-y-3 pt-1">
            <Field label="Equipment Name" required>
                <Input value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. John Deere Tractor" className={inputCls} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Category" required>
                    <Input value={category} onChange={e => setCategory(e.target.value)}
                        placeholder="e.g. Tractor" className={inputCls} />
                </Field>
                <Field label="Quantity" required>
                    <Input type="number" min="0" value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        placeholder="e.g. 3" className={inputCls} />
                </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label="Price/Day (₹)" required>
                    <Input type="number" value={pricePerDay}
                        onChange={e => setPricePerDay(e.target.value)}
                        placeholder="e.g. 1500" className={inputCls} />
                </Field>
                <Field label="Location" required>
                    <Input value={location} onChange={e => setLocation(e.target.value)}
                        placeholder="City / District" className={inputCls} />
                </Field>
            </div>

            <Field label="Description">
                <Input value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Optional details about the equipment" className={inputCls} />
            </Field>

            {parseInt(quantity) === 0 && quantity !== "" && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl
                    bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800
                    text-xs font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle size={12} />
                    Equipment will be marked as unavailable with 0 quantity
                </div>
            )}

            <div className="flex gap-2 pt-2">
                <button onClick={() => { setShowCreate(false); setShowEdit(false); resetForm(); }}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold
                        text-gray-600 dark:text-gray-300
                        border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800
                        transition-all duration-150">
                    Cancel
                </button>
                <button onClick={onSubmit} disabled={isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1.5
                        py-2 rounded-xl text-sm font-semibold
                        bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                        dark:bg-teal-500 dark:hover:bg-teal-600
                        shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-150">
                    {isPending ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : submitLabel}
                </button>
            </div>
        </div>
    );

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
                                <Tractor size={9} /> My Equipment
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight mb-1">
                                Equipment Listings
                            </h1>
                            <p className="text-teal-100/75 text-xs sm:text-sm max-w-md">
                                List your agricultural equipment for rent and manage existing listings.
                            </p>
                        </div>

                        {/* List Equipment CTA */}
                        <button
                            onClick={async () => {
                                if (!(await ensureSellerMobile())) return;
                                resetForm(); setShowCreate(true);
                            }}
                            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5
                                rounded-xl text-sm font-semibold
                                bg-white/15 hover:bg-white/25 border border-white/25
                                text-white transition-all duration-150 self-start sm:self-auto">
                            <Plus size={14} /> List Equipment
                        </button>
                    </div>
                </div>

                {/* ── SEARCH + COUNT ────────────────────────────────────── */}
                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                            text-gray-400 dark:text-gray-500 pointer-events-none" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by name or category…"
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
                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl
                            text-xs font-medium bg-white dark:bg-gray-900
                            border border-gray-200 dark:border-gray-700
                            text-gray-500 dark:text-gray-400 shadow-sm">
                            <Package size={11} />
                            {filteredEquipment.length}
                        </span>
                    )}
                </div>

                {/* ── CONTENT ───────────────────────────────────────────── */}

                {/* Loading */}
                {(!profileId || isLoading) ? (
                    <PageSkeleton type="grid" />

                /* Empty */
                ) : !filteredEquipment.length ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center
                        rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-900/50">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3
                            bg-teal-50 dark:bg-teal-950 text-teal-500 dark:text-teal-400
                            border border-teal-100 dark:border-teal-900">
                            <Tractor size={22} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                            {searchQuery ? `No results for "${searchQuery}"` : "No Equipment Listed"}
                        </h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mb-4">
                            {searchQuery ? "Try a different search term." : "List your first equipment to start renting it out."}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={async () => { if (!(await ensureSellerMobile())) return; resetForm(); setShowCreate(true); }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                                    bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all duration-150">
                                <Plus size={14} /> List Equipment
                            </button>
                        )}
                    </div>

                /* Grid */
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            {paginatedItems.map((item: any) => (
                                <div key={item.id}
                                    className="group relative flex flex-col bg-white dark:bg-gray-900
                                        rounded-xl overflow-hidden shadow-sm
                                        border border-gray-200 dark:border-gray-700
                                        hover:border-teal-300 dark:hover:border-teal-700
                                        hover:shadow-md hover:-translate-y-0.5
                                        transition-all duration-200">

                                    {/* top accent */}
                                    <div className={[
                                        "h-0.5 w-full",
                                        item.quantity === 0
                                            ? "bg-red-400 dark:bg-red-600"
                                            : "bg-gradient-to-r from-teal-500 to-teal-400 opacity-0 group-hover:opacity-100",
                                        "transition-opacity duration-200",
                                    ].join(" ")} />

                                    <div className="flex flex-col flex-1 p-4">
                                        {/* header */}
                                        <div className="flex items-start gap-2.5 mb-3">
                                            <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center
                                                bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400
                                                border border-teal-100 dark:border-teal-800">
                                                <Tractor size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                                                    {item.name}
                                                </h3>
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 capitalize mt-0.5 flex items-center gap-1">
                                                    <Tag size={9} /> {item.category}
                                                </p>
                                            </div>
                                        </div>

                                        {/* price */}
                                        <div className="flex items-baseline gap-0.5 mb-2.5">
                                            <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                                                ₹{(item.price_per_day ?? 0).toLocaleString("en-IN")}
                                            </span>
                                            <span className="text-[11px] text-gray-400 dark:text-gray-500">/day</span>
                                        </div>

                                        {/* location */}
                                        <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500 mb-3">
                                            <MapPin size={9} className="text-teal-500 flex-shrink-0" />
                                            <span className="truncate">{item.location || "—"}</span>
                                        </div>

                                        {/* availability */}
                                        <div className="mb-3">
                                            <AvailBadge qty={item.quantity} />
                                        </div>

                                        {/* description */}
                                        {item.description && (
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed
                                                line-clamp-2 mb-3 flex-1">
                                                {item.description}
                                            </p>
                                        )}

                                        {/* actions */}
                                        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800
                                            flex gap-2">
                                            <button onClick={() => handleEdit(item)}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5
                                                    py-1.5 rounded-lg text-xs font-semibold
                                                    text-teal-600 dark:text-teal-400
                                                    border border-teal-200 dark:border-teal-800
                                                    hover:bg-teal-50 dark:hover:bg-teal-950/40
                                                    transition-all duration-150">
                                                <Edit2 size={11} /> Edit
                                            </button>
                                            <button
                                                onClick={() => deleteMutation.mutate(item.id, {
                                                    onSuccess: () => toast.success("Deleted"),
                                                    onError:   () => toast.error("Failed to delete"),
                                                })}
                                                disabled={deleteMutation.isPending}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5
                                                    py-1.5 rounded-lg text-xs font-semibold
                                                    text-red-500 dark:text-red-400
                                                    border border-red-200 dark:border-red-800/60
                                                    hover:bg-red-50 dark:hover:bg-red-950/30
                                                    disabled:opacity-50 transition-all duration-150">
                                                <Trash2 size={11} /> Delete
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
                                    Page {currentPage} of {totalPages} · {filteredEquipment.length} listings
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

            {/* ══ CREATE DIALOG ══════════════════════════════════════════════ */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="w-[calc(100vw-20px)] sm:max-w-md max-h-[92vh] overflow-y-auto
                    rounded-2xl p-0 gap-0">
                    <div className="relative overflow-hidden rounded-t-2xl
                        bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800
                        dark:from-teal-800 dark:via-teal-900 dark:to-gray-900
                        px-5 py-4">
                        <div className="absolute inset-0 opacity-10
                            bg-[radial-gradient(circle_at_70%_30%,white_1px,transparent_1px)]
                            bg-[size:16px_16px] pointer-events-none" />
                        <div className="relative flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center
                                bg-white/15 border border-white/20 text-white flex-shrink-0">
                                <Plus size={15} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white">List New Equipment</h2>
                                <p className="text-teal-100/70 text-xs">Fill in the details below</p>
                            </div>
                        </div>
                    </div>
                    <div className="px-5 py-4">
                        <EquipmentForm onSubmit={handleCreate} isPending={createMutation.isPending} submitLabel="List Equipment" />
                    </div>
                </DialogContent>
            </Dialog>

            {/* ══ EDIT DIALOG ════════════════════════════════════════════════ */}
            <Dialog open={showEdit} onOpenChange={open => { setShowEdit(open); if (!open) { setEditingItem(null); resetForm(); } }}>
                <DialogContent className="w-[calc(100vw-20px)] sm:max-w-md max-h-[92vh] overflow-y-auto
                    rounded-2xl p-0 gap-0">
                    <div className="relative overflow-hidden rounded-t-2xl
                        bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800
                        dark:from-teal-800 dark:via-teal-900 dark:to-gray-900
                        px-5 py-4">
                        <div className="absolute inset-0 opacity-10
                            bg-[radial-gradient(circle_at_70%_30%,white_1px,transparent_1px)]
                            bg-[size:16px_16px] pointer-events-none" />
                        <div className="relative flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center
                                bg-white/15 border border-white/20 text-white flex-shrink-0">
                                <Edit2 size={14} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white">Edit Equipment</h2>
                                <p className="text-teal-100/70 text-xs truncate max-w-[260px]">
                                    {editingItem?.name}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="px-5 py-4">
                        <EquipmentForm onSubmit={handleUpdate} isPending={updateMutation.isPending} submitLabel="Update Equipment" />
                    </div>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
};

export default MyEquipmentPage;