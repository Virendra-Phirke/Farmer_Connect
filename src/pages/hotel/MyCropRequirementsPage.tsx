import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { getProfileId, getUserProfile, updateUserProfile } from "@/lib/supabase-auth";
import {
    useMyCropRequirements, useCreateCropRequirement,
    useUpdateCropRequirementStatus, useDeleteCropRequirement,
} from "@/hooks/useCropRequirements";
import {
    Loader2, Plus, CheckCircle, Trash2, Calendar as CalendarIcon,
    Search, X, Wheat, ChevronLeft, ChevronRight,
    SlidersHorizontal, ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

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

/* ── Status badge ────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
        open:      "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        fulfilled: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800",
        closed:    "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
    };
    const cls = map[status] ?? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${cls}`}>
            {status}
        </span>
    );
};

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
export default function MyCropRequirementsPage() {
    const { user } = useUser();
    const [profileId, setProfileId]       = useState<string | null>(null);
    const [isCreating, setIsCreating]     = useState(false);
    const [newCropName, setNewCropName]   = useState("");
    const [newQuantity, setNewQuantity]   = useState("");
    const [newDate, setNewDate]           = useState("");
    const [searchQuery, setSearchQuery]   = useState("");
    const [currentPage, setCurrentPage]   = useState(1);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: requirements, isLoading } = useMyCropRequirements(profileId || undefined);
    const createReq    = useCreateCropRequirement();
    const updateStatus = useUpdateCropRequirementStatus();
    const deleteReq    = useDeleteCropRequirement();

    const filteredReqs = requirements?.filter(r =>
        r.crop_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

    useEffect(() => { setCurrentPage(1); }, [searchQuery, requirements?.length]);

    const totalPages     = Math.max(1, Math.ceil(filteredReqs.length / PAGE_SIZE));
    const paginatedItems = filteredReqs.slice(
        (currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE
    );

    /* ── phone guard ─────────────────────────────────────────────────────── */
    const ensurePhone = async () => {
        if (!user?.id) return false;
        const existing  = await getUserProfile(user.id);
        const clerkPhone = user.phoneNumbers?.[0]?.phoneNumber;
        if (!existing?.phone && clerkPhone) await updateUserProfile(user.id, { phone: clerkPhone });
        const refreshed  = await getUserProfile(user.id);
        if (!refreshed?.phone) {
            toast.error("Please add your mobile number in Profile before posting a demand.");
            return false;
        }
        return true;
    };

    const openCreate = async () => {
        if (!(await ensurePhone())) return;
        setNewCropName(""); setNewQuantity(""); setNewDate("");
        setIsCreating(true);
    };

    const handleCreate = async () => {
        if (!profileId || !newCropName || !newQuantity) {
            toast.error("Please fill crop name and quantity."); return;
        }
        if (!(await ensurePhone())) return;
        createReq.mutate(
            { hotel_id: profileId, crop_name: newCropName, quantity_kg: Number(newQuantity), required_by_date: newDate || undefined },
            {
                onSuccess: () => { setIsCreating(false); setNewCropName(""); setNewQuantity(""); setNewDate(""); toast.success("Demand posted!"); },
                onError:   () => toast.error("Failed to post demand"),
            }
        );
    };

    return (
        <DashboardLayout subtitle="Post and manage your crop demand requirements.">
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
                                <ShoppingBag size={9} /> Crop Demands
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight mb-1">
                                My Crop Requirements
                            </h1>
                            <p className="text-teal-100/75 text-xs sm:text-sm max-w-md">
                                Post what you need and let farmers come to you with fresh supply proposals.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {!isLoading && (
                                <div className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl
                                    bg-white/10 border border-white/20 text-white text-xs font-semibold">
                                    <SlidersHorizontal size={12} />
                                    {filteredReqs.length} demand{filteredReqs.length !== 1 ? "s" : ""}
                                </div>
                            )}
                            <button onClick={openCreate}
                                className="inline-flex items-center gap-2 px-4 py-2.5
                                    rounded-xl text-sm font-semibold
                                    bg-white/15 hover:bg-white/25 border border-white/25 text-white
                                    transition-all duration-150">
                                <Plus size={14} /> Post Demand
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── CREATE FORM (inline, collapsible) ─────────────────── */}
                {isCreating && (
                    <div className="bg-white dark:bg-gray-900
                        border border-teal-200 dark:border-teal-800
                        rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">

                        {/* form header */}
                        <div className="flex items-center justify-between
                            px-4 sm:px-5 py-3 sm:py-4
                            border-b border-teal-100 dark:border-teal-900
                            bg-teal-50 dark:bg-teal-950/30">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-xl flex items-center justify-center
                                    bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-400
                                    border border-teal-200 dark:border-teal-800">
                                    <Plus size={13} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Post New Crop Requirement</p>
                                    <p className="text-[11px] text-gray-400 dark:text-gray-500">Farmers will see this and propose supply contracts</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCreating(false)}
                                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500
                                    hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300
                                    transition-colors">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="px-4 sm:px-5 py-4 sm:py-5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                                <Field label="Crop Name" required>
                                    <Input value={newCropName} onChange={e => setNewCropName(e.target.value)}
                                        placeholder="e.g. Tomatoes, Wheat…" className={inputCls} />
                                </Field>

                                <Field label="Quantity (kg)" required>
                                    <Input type="number" value={newQuantity} onChange={e => setNewQuantity(e.target.value)}
                                        placeholder="e.g. 50" className={inputCls} />
                                </Field>

                                <Field label="Required By Date">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className={`${inputCls} flex items-center gap-2 px-3 text-left w-full`}>
                                                <CalendarIcon size={13} className="text-teal-500 flex-shrink-0" />
                                                <span className={newDate ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}>
                                                    {newDate ? new Date(newDate).toLocaleDateString() : "Pick a date"}
                                                </span>
                                                {newDate && (
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); setNewDate(""); }}
                                                        className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                        <X size={11} />
                                                    </button>
                                                )}
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={newDate ? new Date(newDate) : undefined}
                                                onSelect={date => { if (date) setNewDate(date.toISOString().split("T")[0]); }}
                                                disabled={date => { const t = new Date(); t.setHours(0,0,0,0); return date < t; }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </Field>
                            </div>

                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-semibold
                                        text-gray-600 dark:text-gray-300
                                        border border-gray-200 dark:border-gray-700
                                        bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800
                                        transition-all duration-150">
                                    Cancel
                                </button>
                                <button onClick={handleCreate}
                                    disabled={createReq.isPending || !newCropName || !newQuantity}
                                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold
                                        bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                        dark:bg-teal-500 dark:hover:bg-teal-600
                                        shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
                                        transition-all duration-150">
                                    {createReq.isPending
                                        ? <><Loader2 size={13} className="animate-spin" /> Posting…</>
                                        : <><Plus size={13} /> Post Demand</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SEARCH ────────────────────────────────────────────── */}
                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                            text-gray-400 dark:text-gray-500 pointer-events-none" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search demands by crop name…"
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
                            {filteredReqs.length}
                        </span>
                    )}
                </div>

                {/* ── CONTENT ───────────────────────────────────────────── */}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20
                        rounded-2xl bg-white dark:bg-gray-900
                        border border-gray-200 dark:border-gray-700 gap-3">
                        <div className="w-10 h-10 rounded-full border-[3px]
                            border-gray-200 dark:border-gray-700 border-t-teal-500 animate-spin" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">Loading demands…</p>
                    </div>

                ) : !filteredReqs.length ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center
                        rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-900/50">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3
                            bg-teal-50 dark:bg-teal-950 text-teal-500 dark:text-teal-400
                            border border-teal-100 dark:border-teal-900">
                            <Wheat size={22} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                            {searchQuery ? `No results for "${searchQuery}"` : "No Demands Posted"}
                        </h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mb-4">
                            {searchQuery
                                ? "Try a different search term."
                                : "Post a crop requirement to let farmers know what you need."}
                        </p>
                        {!searchQuery && (
                            <button onClick={openCreate}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                                    bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all duration-150">
                                <Plus size={14} /> Post First Demand
                            </button>
                        )}
                    </div>

                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            {paginatedItems.map(req => (
                                <div key={req.id}
                                    className="group relative flex flex-col bg-white dark:bg-gray-900
                                        rounded-xl overflow-hidden shadow-sm
                                        border border-gray-200 dark:border-gray-700
                                        hover:border-teal-300 dark:hover:border-teal-700
                                        hover:shadow-md hover:-translate-y-0.5
                                        transition-all duration-200">

                                    {/* top accent */}
                                    <div className={[
                                        "h-0.5 w-full",
                                        req.status === "fulfilled"
                                            ? "bg-gradient-to-r from-teal-500 to-teal-400"
                                            : req.status === "cancelled"
                                                ? "bg-red-400 dark:bg-red-600"
                                                : "bg-gradient-to-r from-blue-400 to-blue-500 opacity-0 group-hover:opacity-100",
                                        "transition-opacity duration-200",
                                    ].join(" ")} />

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
                                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Crop demand</p>
                                                </div>
                                            </div>
                                            <StatusBadge status={req.status} />
                                        </div>

                                        {/* quantity highlight */}
                                        <div className="flex items-baseline gap-1 mb-3 px-3 py-2 rounded-lg
                                            bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-800">
                                            <span className="text-xl font-bold text-teal-600 dark:text-teal-400">
                                                {req.quantity_kg}
                                            </span>
                                            <span className="text-xs text-teal-500 dark:text-teal-500 font-medium">kg needed</span>
                                        </div>

                                        {/* date */}
                                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 mb-4">
                                            <CalendarIcon size={10} className="text-teal-500 flex-shrink-0" />
                                            <span>
                                                {req.required_by_date
                                                    ? `By ${new Date(req.required_by_date).toLocaleDateString()}`
                                                    : "No date specified"}
                                            </span>
                                        </div>

                                        {/* actions */}
                                        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                                            {req.status === "open" && (
                                                <button
                                                    onClick={() => updateStatus.mutate({ id: req.id, status: "fulfilled" })}
                                                    disabled={updateStatus.isPending}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5
                                                        py-1.5 rounded-lg text-xs font-semibold
                                                        text-teal-600 dark:text-teal-400
                                                        border border-teal-200 dark:border-teal-800
                                                        hover:bg-teal-50 dark:hover:bg-teal-950/40
                                                        disabled:opacity-50 transition-all duration-150">
                                                    <CheckCircle size={11} /> Fulfilled
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteReq.mutate(req.id)}
                                                disabled={deleteReq.isPending}
                                                className={[
                                                    "inline-flex items-center justify-center gap-1.5",
                                                    "py-1.5 rounded-lg text-xs font-semibold",
                                                    "text-red-500 dark:text-red-400",
                                                    "border border-red-200 dark:border-red-800/60",
                                                    "hover:bg-red-50 dark:hover:bg-red-950/30",
                                                    "disabled:opacity-50 transition-all duration-150",
                                                    req.status === "open" ? "px-2.5" : "flex-1 px-3",
                                                ].join(" ")}>
                                                <Trash2 size={11} />
                                                {req.status !== "open" && <span>Delete</span>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between flex-wrap gap-2
                                px-4 py-3 rounded-xl
                                bg-white dark:bg-gray-900
                                border border-gray-200 dark:border-gray-700 shadow-sm">
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    Page {currentPage} of {totalPages} · {filteredReqs.length} demand{filteredReqs.length !== 1 ? "s" : ""}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
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
                                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
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
        </DashboardLayout>
    );
}