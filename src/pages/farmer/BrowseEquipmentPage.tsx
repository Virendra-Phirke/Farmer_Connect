import { useState, useEffect } from "react";
import { useEquipmentListings } from "@/hooks/useEquipmentListings";
import { useCreateEquipmentBooking } from "@/hooks/useEquipmentBookings";
import { useUser } from "@clerk/clerk-react";
import { getProfileId, getUserProfile, updateUserProfile } from "@/lib/supabase-auth";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Loader2, Tractor, MapPin, Info, Search, X,
    ChevronLeft, ChevronRight, AlertTriangle, CalendarDays,
    BadgeCheck, SlidersHorizontal,
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { differenceInDays, parseISO } from "date-fns";

const PAGE_SIZE = 12;

/* ── Stock badge ─────────────────────────────────────────────────────────── */
const StockBadge = ({ qty }: { qty: number }) => {
    if (qty === 1) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
            text-[10px] font-bold
            bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400
            border border-red-200 dark:border-red-800 whitespace-nowrap">
            <AlertTriangle size={8} /> Only 1 left
        </span>
    );
    if (qty <= 2) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
            text-[10px] font-bold
            bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400
            border border-amber-200 dark:border-amber-800 whitespace-nowrap">
            Limited
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
            text-[10px] font-semibold
            bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400
            border border-teal-100 dark:border-teal-800 whitespace-nowrap">
            <BadgeCheck size={9} /> {qty} units
        </span>
    );
};

/* ── Form field ──────────────────────────────────────────────────────────── */
const Field = ({
    label, required, children,
}: {
    label: string; required?: boolean; children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 tracking-wide">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

/* ── Usage tips ──────────────────────────────────────────────────────────── */
const getGuidance = (item: any) => {
    const cat = String(item?.category || "").toLowerCase();
    if (cat.includes("tractor")) return [
        "Check engine oil and coolant before start.",
        "Drive at low speed in wet or uneven fields.",
        "Avoid overloading and sharp turns with attachments.",
    ];
    if (cat.includes("sprayer")) return [
        "Use correct PPE and follow label dosage.",
        "Test nozzle pressure before field application.",
        "Clean tank/nozzles after use to prevent clogging.",
    ];
    if (cat.includes("harvester") || cat.includes("thresher")) return [
        "Keep hands/clothes away from moving parts.",
        "Operate only on stable surface and proper crop moisture.",
        "Stop machine fully before maintenance/cleaning.",
    ];
    return [
        "Inspect equipment condition before use.",
        "Follow owner instructions and safety checks.",
        "Report any issue immediately to the owner.",
    ];
};

/* ── Pagination button ───────────────────────────────────────────────────── */
const PgBtn = ({
    onClick, disabled, children,
}: {
    onClick: () => void; disabled: boolean; children: React.ReactNode;
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="w-8 h-8 flex items-center justify-center rounded-lg
            border border-gray-200 dark:border-gray-700
            bg-gray-50 dark:bg-gray-800
            text-gray-600 dark:text-gray-400
            hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50
            dark:hover:border-teal-600 dark:hover:text-teal-400 dark:hover:bg-teal-950
            disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
    >
        {children}
    </button>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════════════════ */
const BrowseEquipmentPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId]                   = useState<string | null>(null);
    const [searchQuery, setSearchQuery]               = useState("");
    const [currentPage, setCurrentPage]               = useState(1);
    const [selectedEquipment, setSelectedEquipment]   = useState<any | null>(null);
    const [guideEquipment, setGuideEquipment]         = useState<any | null>(null);
    const [startDate, setStartDate]                   = useState("");
    const [endDate, setEndDate]                       = useState("");
    const [notes, setNotes]                           = useState("");
    const [quantity, setQuantity]                     = useState("1");

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: equipment, isLoading } = useEquipmentListings();
    const createBooking = useCreateEquipmentBooking();

    const availableEquipment = equipment?.filter((i: any) => i.quantity > 0) ?? [];
    const filteredEquipment  = availableEquipment.filter((i: any) =>
        i.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.owner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => { setCurrentPage(1); }, [searchQuery]);

    const totalPages     = Math.max(1, Math.ceil(filteredEquipment.length / PAGE_SIZE));
    const paginatedItems = filteredEquipment.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    /* pricing helpers */
    const calcDays  = (s: string, e: string) =>
        s && e ? Math.max(0, differenceInDays(parseISO(e), parseISO(s)) + 1) : 0;
    const calcTotal = (s: string, e: string, qty: string, rate: number) =>
        calcDays(s, e) * (parseInt(qty) || 1) * (rate || 0);

    const today = new Date().toISOString().split("T")[0];

    /* submit */
    const handleRequest = async () => {
        if (!selectedEquipment || !startDate || !endDate || !profileId || !quantity) {
            toast.error("Please fill in all required fields");
            return;
        }
        try {
            const phone = user?.phoneNumbers?.[0]?.phoneNumber;
            if (user?.id && phone) {
                const existing = await getUserProfile(user.id);
                if (!existing?.phone) await updateUserProfile(user.id, { phone });
            }
        } catch {

        if (calcDays(startDate, endDate) <= 0) {
            toast.error("End date must be the same or after start date.");
            return;
        }}

        const days  = calcDays(startDate, endDate);
        const qty   = parseInt(quantity);
        const total = days * (selectedEquipment.price_per_day ?? 0) * qty;

        createBooking.mutate(
            {
                equipment_id: selectedEquipment.id,
                renter_id:    profileId,
                start_date:   startDate,
                end_date:     endDate,
                total_price:  total,
                status:       "pending",
                notes,
                quantity:     qty,
            },
            {
                onSuccess: () => {
                    toast.success(`Rental request sent for ${selectedEquipment.name}`);
                    setSelectedEquipment(null);
                    setStartDate(""); setEndDate(""); setNotes(""); setQuantity("1");
                },
                onError: (e: any) =>
                    toast.error(e?.message || "Failed to send rental request."),
            }
        );
    };

    /* ── JSX ─────────────────────────────────────────────────────────────── */
    return (
        <DashboardLayout subtitle="">

            {/* Full-width wrapper — no max-w, no side padding beyond what DashboardLayout provides */}
            <div className="w-full space-y-4 sm:space-y-5">

                {/* ── HERO ──────────────────────────────────────────────── */}
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl
                    bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800
                    dark:from-teal-800 dark:via-teal-900 dark:to-gray-900
                    border border-teal-500/30 dark:border-teal-700/50
                    shadow-md shadow-teal-200/30 dark:shadow-none
                    px-5 py-5 sm:px-8 sm:py-7">

                    {/* dot texture */}
                    <div className="absolute inset-0 opacity-10
                        bg-[radial-gradient(circle_at_70%_30%,white_1px,transparent_1px)]
                        bg-[size:18px_18px] pointer-events-none" />

                    <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                bg-white/15 border border-white/20 text-white/90
                                text-[0.65rem] font-semibold tracking-widest uppercase mb-2.5">
                                <Tractor size={9} /> Equipment Rental
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight mb-1">
                                Browse Equipment
                            </h1>
                            <p className="text-teal-100/75 text-xs sm:text-sm max-w-md">
                                Rent tractors, sprayers, harvesters and more from local farmers near you.
                            </p>
                        </div>

                        {/* live count chip on desktop */}
                        {!isLoading && (
                            <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl
                                bg-white/10 border border-white/20 text-white text-xs font-semibold">
                                <SlidersHorizontal size={12} />
                                {filteredEquipment.length} listing{filteredEquipment.length !== 1 ? "s" : ""}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── SEARCH BAR ────────────────────────────────────────── */}
                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                            text-gray-400 dark:text-gray-500 pointer-events-none" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by name, category or owner…"
                            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm
                                bg-white dark:bg-gray-900
                                border border-gray-200 dark:border-gray-700
                                text-gray-900 dark:text-gray-100
                                placeholder:text-gray-400 dark:placeholder:text-gray-500
                                focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15
                                shadow-sm transition-all duration-150"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2
                                    text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* count pill — mobile */}
                    {!isLoading && (
                        <span className="sm:hidden flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl
                            text-xs font-medium bg-white dark:bg-gray-900
                            border border-gray-200 dark:border-gray-700
                            text-gray-500 dark:text-gray-400 shadow-sm">
                            <SlidersHorizontal size={11} />
                            {filteredEquipment.length}
                        </span>
                    )}
                </div>

                {/* ── CONTENT ───────────────────────────────────────────── */}

                {/* Loading */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20
                        rounded-2xl bg-white dark:bg-gray-900
                        border border-gray-200 dark:border-gray-700 gap-3">
                        <div className="w-10 h-10 rounded-full border-[3px]
                            border-gray-200 dark:border-gray-700 border-t-teal-500 animate-spin" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">Loading equipment…</p>
                    </div>

                /* No equipment at all */
                ) : !availableEquipment.length ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center
                        rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-900/50">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3
                            bg-teal-50 dark:bg-teal-950 text-teal-500 dark:text-teal-400
                            border border-teal-100 dark:border-teal-900">
                            <Tractor size={22} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                            No Equipment Available
                        </h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                            Check back later for new listings.
                        </p>
                    </div>

                /* No search match */
                ) : !filteredEquipment.length ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center
                        rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-900/50">
                        <Search size={22} className="text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No equipment matches "{searchQuery}"
                        </p>
                    </div>

                /* GRID */
                ) : (
                    <>
                        {/* 1-col → 2-col sm → 3-col lg → 4-col xl */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            {paginatedItems.map((item: any) => {
                                const isLow = item.quantity <= 2;
                                return (
                                    <div key={item.id}
                                        className={[
                                            "group relative flex flex-col bg-white dark:bg-gray-900",
                                            "rounded-xl overflow-hidden shadow-sm",
                                            "hover:shadow-md hover:-translate-y-0.5",
                                            "transition-all duration-200",
                                            "border",
                                            isLow
                                                ? "border-amber-300 dark:border-amber-700/70"
                                                : "border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700",
                                        ].join(" ")}>

                                        {/* top stripe */}
                                        <div className={[
                                            "h-0.5 w-full",
                                            isLow
                                                ? "bg-gradient-to-r from-amber-400 to-orange-400"
                                                : "bg-gradient-to-r from-teal-500 to-teal-400 opacity-0 group-hover:opacity-100",
                                            "transition-opacity duration-200",
                                        ].join(" ")} />

                                        <div className="flex flex-col flex-1 p-4">
                                            {/* card header */}
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center
                                                    bg-teal-50 dark:bg-teal-950/60
                                                    text-teal-600 dark:text-teal-400
                                                    border border-teal-100 dark:border-teal-800">
                                                    <Tractor size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">
                                                        {item.name}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 capitalize mt-0.5">
                                                        {item.category}
                                                    </p>
                                                </div>
                                                {/* info button */}
                                                <button
                                                    onClick={() => setGuideEquipment(item)}
                                                    title="Usage guidance"
                                                    className="flex-shrink-0 p-1.5 rounded-lg
                                                        text-gray-400 dark:text-gray-500
                                                        hover:bg-teal-50 dark:hover:bg-teal-950/40
                                                        hover:text-teal-600 dark:hover:text-teal-400
                                                        transition-colors">
                                                    <Info size={14} />
                                                </button>
                                            </div>

                                            {/* location */}
                                            <div className="flex items-center gap-1 mb-3
                                                text-[11px] text-gray-400 dark:text-gray-500">
                                                <MapPin size={9} className="text-teal-500 flex-shrink-0" />
                                                <span className="truncate">{item.location || "Location not specified"}</span>
                                            </div>

                                            {/* price + stock */}
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <div className="flex items-baseline gap-0.5">
                                                    <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                                                        ₹{(item.price_per_day ?? 0).toLocaleString("en-IN")}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 dark:text-gray-500">/day</span>
                                                </div>
                                                <StockBadge qty={item.quantity} />
                                            </div>

                                            {/* description */}
                                            {item.description && (
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500
                                                    leading-relaxed line-clamp-2 mb-3 flex-1">
                                                    {item.description}
                                                </p>
                                            )}

                                            {/* action — pushed to bottom */}
                                            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                                                <button
                                                    onClick={() => setSelectedEquipment(item)}
                                                    className="w-full inline-flex items-center justify-center gap-1.5
                                                        py-2 rounded-lg text-xs font-semibold
                                                        bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                                        dark:bg-teal-500 dark:hover:bg-teal-600
                                                        shadow-sm hover:shadow transition-all duration-150">
                                                    <CalendarDays size={12} /> Request Rental
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
                                    Page {currentPage} of {totalPages} · {filteredEquipment.length} items
                                </span>
                                <div className="flex items-center gap-2">
                                    <PgBtn onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                                        <ChevronLeft size={14} />
                                    </PgBtn>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums px-1">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <PgBtn onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                                        <ChevronRight size={14} />
                                    </PgBtn>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ══ RENTAL REQUEST DIALOG ══════════════════════════════════════ */}
            <Dialog open={!!selectedEquipment} onOpenChange={open => !open && setSelectedEquipment(null)}>
                <DialogContent className="w-[calc(100vw-24px)] sm:max-w-md max-h-[92vh] overflow-y-auto
                    rounded-xl sm:rounded-2xl p-4 sm:p-6">
                    <DialogHeader className="mb-3">
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center
                                bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400
                                border border-teal-100 dark:border-teal-800 flex-shrink-0">
                                <Tractor size={13} />
                            </div>
                            Request Rental
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                            {selectedEquipment?.name} · ₹{(selectedEquipment?.price_per_day ?? 0).toLocaleString("en-IN")}/day
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        {/* stock banner */}
                        {selectedEquipment?.quantity != null && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border
                                ${selectedEquipment.quantity <= 2
                                    ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                                    : "bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-100 dark:border-teal-800"}`}>
                                <BadgeCheck size={13} />
                                {selectedEquipment.quantity} unit{selectedEquipment.quantity > 1 ? "s" : ""} available
                            </div>
                        )}

                        {/* dates side by side on sm+ */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Start Date" required>
                                <Input
                                    type="date"
                                    value={startDate}
                                    min={today}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700
                                        bg-gray-50 dark:bg-gray-800 focus:border-teal-400 focus:ring-teal-400/20"
                                />
                            </Field>
                            <Field label="End Date" required>
                                <Input
                                    type="date"
                                    value={endDate}
                                    min={startDate || today}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700
                                        bg-gray-50 dark:bg-gray-800 focus:border-teal-400 focus:ring-teal-400/20"
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Quantity" required>
                                <Input
                                    type="number"
                                    value={quantity}
                                    min="1"
                                    max={selectedEquipment?.quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    className="h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700
                                        bg-gray-50 dark:bg-gray-800 focus:border-teal-400 focus:ring-teal-400/20"
                                />
                            </Field>
                            <Field label="Notes">
                                <Input
                                    value={notes}
                                    placeholder="Special requirements…"
                                    onChange={e => setNotes(e.target.value)}
                                    className="h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700
                                        bg-gray-50 dark:bg-gray-800 focus:border-teal-400 focus:ring-teal-400/20"
                                />
                            </Field>
                        </div>

                        {/* pricing summary */}
                        <div className="rounded-xl border border-teal-100 dark:border-teal-800
                            bg-teal-50 dark:bg-teal-950/20 p-3.5">
                            <p className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-1.5">
                                <CalendarDays size={11} /> Pricing Summary
                            </p>
                            <p className="text-[11px] text-teal-600/70 dark:text-teal-500 mb-2">
                                Both start and end dates are included in the rental period.
                            </p>
                            {startDate && endDate ? (
                                <div className="space-y-1.5">
                                    <div className="text-xs text-gray-600 dark:text-gray-300">
                                        {calcDays(startDate, endDate)} day{calcDays(startDate, endDate) !== 1 ? "s" : ""}
                                        {" × "}{parseInt(quantity) || 1} unit{(parseInt(quantity) || 1) > 1 ? "s" : ""}
                                        {" × "}₹{(selectedEquipment?.price_per_day ?? 0).toLocaleString("en-IN")}
                                    </div>
                                    <div className="flex items-center justify-between pt-1.5 border-t border-teal-200/50 dark:border-teal-800/50">
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Total</span>
                                        <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                                            ₹{calcTotal(startDate, endDate, quantity, selectedEquipment?.price_per_day ?? 0).toLocaleString("en-IN")}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                                    Select dates to see estimated cost
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 mt-4 flex-row justify-end">
                        <button
                            onClick={() => setSelectedEquipment(null)}
                            className="px-4 py-2 rounded-xl text-sm font-semibold
                                text-gray-600 dark:text-gray-300
                                border border-gray-200 dark:border-gray-700
                                bg-white dark:bg-gray-900
                                hover:bg-gray-50 dark:hover:bg-gray-800
                                transition-all duration-150">
                            Cancel
                        </button>
                        <button
                            onClick={handleRequest}
                            disabled={createBooking.isPending || !startDate || !endDate || !quantity}
                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold
                                bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                dark:bg-teal-500 dark:hover:bg-teal-600
                                shadow-sm disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-150">
                            {createBooking.isPending
                                ? <><Loader2 size={13} className="animate-spin" /> Submitting…</>
                                : "Submit Request"}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══ GUIDANCE DIALOG ════════════════════════════════════════════ */}
            <Dialog open={!!guideEquipment} onOpenChange={open => !open && setGuideEquipment(null)}>
                <DialogContent className="w-[calc(100vw-24px)] sm:max-w-sm max-h-[85vh] overflow-y-auto
                    rounded-xl sm:rounded-2xl p-4 sm:p-6">
                    <DialogHeader className="mb-3">
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center
                                bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400
                                border border-teal-100 dark:border-teal-800 flex-shrink-0">
                                <Info size={13} />
                            </div>
                            Usage Guidance
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {guideEquipment?.name} · <span className="capitalize">{guideEquipment?.category}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50
                            border border-gray-200 dark:border-gray-700 p-3.5">
                            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500
                                uppercase tracking-wider mb-2.5">Safety Tips</p>
                            <ul className="space-y-2">
                                {getGuidance(guideEquipment).map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {guideEquipment?.description && (
                            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50
                                border border-gray-200 dark:border-gray-700 p-3.5">
                                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500
                                    uppercase tracking-wider mb-1.5">Owner Notes</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {guideEquipment.description}
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-4">
                        <button
                            onClick={() => setGuideEquipment(null)}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold
                                text-gray-600 dark:text-gray-300
                                border border-gray-200 dark:border-gray-700
                                bg-white dark:bg-gray-900
                                hover:bg-gray-50 dark:hover:bg-gray-800
                                transition-all duration-150">
                            Close
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
};

export default BrowseEquipmentPage;