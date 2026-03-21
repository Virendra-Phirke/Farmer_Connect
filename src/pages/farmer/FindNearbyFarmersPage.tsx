import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId, getUserProfile } from "@/lib/supabase-auth";
import { UserProfile } from "@/lib/supabase-auth";
import { searchFarmersByLocationAndGat } from "@/lib/api/farmers";
import { useIndianLocations } from "@/hooks/useIndianLocations";
import DashboardLayout from "@/components/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Loader2, User, MapPin, MessageSquare, Search, X,
    ChevronLeft, ChevronRight, Wheat, Sprout, TreePine,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 8;

/* ── FieldLabel ──────────────────────────────────────────────────────────── */
const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 sm:mb-1.5 tracking-wide">
        {children}
        {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

/* ── FarmerAvatar ────────────────────────────────────────────────────────── */
const FarmerAvatar = ({ src, name, size = "md" }: { src?: string | null; name?: string | null; size?: "sm" | "md" }) => {
    const letter = String(name || "F").slice(0, 1).toUpperCase();
    const cls = size === "sm"
        ? "w-9 h-9 text-sm"
        : "w-10 h-10 sm:w-11 sm:h-11 text-base";
    return src ? (
        <img src={src} alt={name || "Farmer"}
            className={`${cls} rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm`} />
    ) : (
        <div className={`${cls} rounded-full flex-shrink-0 flex items-center justify-center
            bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300
            font-bold ring-2 ring-white dark:ring-gray-800 shadow-sm`}>
            {letter}
        </div>
    );
};

/* ── StatChip ────────────────────────────────────────────────────────────── */
const StatChip = ({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: any }) => (
    <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg
        bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        {Icon && <Icon size={10} className="text-teal-500 dark:text-teal-400 flex-shrink-0" />}
        <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
        <span className="text-[10px] sm:text-[11px] font-semibold text-gray-700 dark:text-gray-300 capitalize">
            {value || "—"}
        </span>
    </div>
);

/* ── Pagination Button ───────────────────────────────────────────────────── */
const PgBtn = ({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled}
        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg
            border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
            text-gray-600 dark:text-gray-400
            hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50
            dark:hover:border-teal-600 dark:hover:text-teal-400 dark:hover:bg-teal-950
            disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150">
        {children}
    </button>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
const FindNearbyFarmersPage = () => {
    const navigate = useNavigate();
    const { user } = useUser();

    const [profileId, setProfileId]     = useState<string | null>(null);
    const [state, setState]             = useState("");
    const [district, setDistrict]       = useState("");
    const [subDistrict, setSubDistrict] = useState("");
    const [villageCity, setVillageCity] = useState("");
    const [isLoading, setIsLoading]     = useState(false);
    const [results, setResults]         = useState<UserProfile[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then(id => {
                setProfileId(id);
                if (id) getUserProfile(id).then(() => {});
            });
        }
    }, [user?.id]);

    const { states, districts, subDistricts, villages, isLoading: locationsLoading } =
        useIndianLocations(state, district, subDistrict);

    const handleSearch = async () => {
        if (!state || !district || !subDistrict) {
            toast.error("Please select state, district, and sub-district.");
            return;
        }
        setIsLoading(true); setHasSearched(true);
        try {
            const data = await searchFarmersByLocationAndGat({
                district:    district    || undefined,
                taluka:      subDistrict || undefined,
                villageCity: villageCity || undefined,
            });
            const filtered = data.filter(f => f.id !== profileId);
            setResults(filtered); setCurrentPage(1);
            if (!filtered.length) toast.info("No farmers found in this location.");
        } catch (e: any) {
            toast.error(e.message || "Failed to search farmers.");
        } finally { setIsLoading(false); }
    };

    const handleClear = () => {
        setState(""); setDistrict(""); setSubDistrict(""); setVillageCity("");
        setResults([]); setHasSearched(false); setCurrentPage(1);
    };

    const handleContact = (farmer: UserProfile) => {
        if (!profileId || !farmer?.id) return;
        navigate(`/farmer/groups/direct?tab=chats&peer=${farmer.id}&name=${encodeURIComponent(farmer.full_name || "Farmer")}`);
    };

    const totalPages       = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const paginatedResults = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const ph = (
        loading: boolean, blockOn: boolean, blockMsg: string,
        empty: boolean, emptyMsg: string, normal: string
    ) => loading ? "Loading…" : blockOn ? blockMsg : empty ? emptyMsg : normal;

    /* ── trigger search on Enter ─────────────────────────────────────────── */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearch();
    };

    return (
        <DashboardLayout subtitle="">
            <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 px-0">

                {/* ══ HERO — compact on mobile, spacious on desktop ════════ */}
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl
                    bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800
                    dark:from-teal-800 dark:via-teal-900 dark:to-gray-900
                    border border-teal-500/30 dark:border-teal-700/50
                    shadow-md shadow-teal-200/40 dark:shadow-teal-900/40
                    px-4 py-4 sm:px-8 sm:py-7">
                    <div className="absolute top-0 right-0 w-48 h-48 sm:w-72 sm:h-72 opacity-10
                        bg-[radial-gradient(circle_at_70%_30%,white_1px,transparent_1px)]
                        bg-[size:16px_16px] sm:bg-[size:18px_18px] pointer-events-none" />
                    <div className="relative">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full
                            bg-white/15 border border-white/25 text-white/90
                            text-[0.62rem] sm:text-[0.68rem] font-semibold tracking-widest uppercase mb-2 sm:mb-3">
                            <Wheat size={9} /> Farmer Network
                        </div>
                        <h1 className="text-xl sm:text-3xl font-bold text-white leading-tight tracking-tight mb-0.5 sm:mb-1">
                            Find Nearby Farmers
                        </h1>
                        <p className="text-teal-100/80 text-xs sm:text-sm font-normal max-w-sm sm:max-w-md">
                            Search by state, district, and taluka to connect and collaborate.
                        </p>
                    </div>
                </div>

                {/* ══ SEARCH FORM ══════════════════════════════════════════ */}
                <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl
                    border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

                    {/* form header — hidden on very small screens to save space */}
                    <div className="hidden sm:flex px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4
                        border-b border-gray-100 dark:border-gray-800 items-center gap-2.5">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center
                            bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400
                            border border-teal-100 dark:border-teal-800">
                            <MapPin size={13} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Search Criteria</h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500">State, district and sub-district are required</p>
                        </div>
                    </div>

                    {/* dropdowns — 2-col on mobile, 4-col on lg+ */}
                    <div className="p-3 sm:px-5 sm:pt-4 sm:pb-3 lg:px-6
                        grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4"
                        onKeyDown={handleKeyDown}>

                        {/* State */}
                        <div>
                            <FieldLabel required>State</FieldLabel>
                            <Select value={state} disabled={locationsLoading}
                                onValueChange={v => { setState(v); setDistrict(""); setSubDistrict(""); setVillageCity(""); }}>
                                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm rounded-lg sm:rounded-xl
                                    border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                                    focus:border-teal-400 focus:ring-teal-400/20">
                                    <SelectValue placeholder={locationsLoading ? "Loading…" : "Select state"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-56 sm:max-h-60">
                                    {states.map(s => <SelectItem key={s} value={s} className="text-xs sm:text-sm">{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* District */}
                        <div>
                            <FieldLabel required>District</FieldLabel>
                            <Select value={district} disabled={!state || districts.length === 0 || locationsLoading}
                                onValueChange={v => { setDistrict(v); setSubDistrict(""); setVillageCity(""); }}>
                                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm rounded-lg sm:rounded-xl
                                    border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                                    focus:border-teal-400 focus:ring-teal-400/20">
                                    <SelectValue placeholder={ph(locationsLoading, !state, "State first", districts.length === 0, "No districts", "Select district")} />
                                </SelectTrigger>
                                <SelectContent className="max-h-56 sm:max-h-60">
                                    {districts.map(d => <SelectItem key={d} value={d} className="text-xs sm:text-sm">{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sub-District */}
                        <div>
                            <FieldLabel required>Sub-District</FieldLabel>
                            <Select value={subDistrict} disabled={!district || subDistricts.length === 0 || locationsLoading}
                                onValueChange={v => { setSubDistrict(v); setVillageCity(""); }}>
                                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm rounded-lg sm:rounded-xl
                                    border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                                    focus:border-teal-400 focus:ring-teal-400/20">
                                    <SelectValue placeholder={ph(locationsLoading, !district, "District first", subDistricts.length === 0, "No sub-districts", "Select sub-district")} />
                                </SelectTrigger>
                                <SelectContent className="max-h-56 sm:max-h-60">
                                    {subDistricts.map(sd => <SelectItem key={sd} value={sd} className="text-xs sm:text-sm">{sd}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Village */}
                        <div>
                            <FieldLabel>Village</FieldLabel>
                            <Select value={villageCity} disabled={!subDistrict || villages.length === 0 || locationsLoading}
                                onValueChange={setVillageCity}>
                                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm rounded-lg sm:rounded-xl
                                    border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                                    focus:border-teal-400 focus:ring-teal-400/20">
                                    <SelectValue placeholder={ph(locationsLoading, !subDistrict, "Sub-district first", villages.length === 0, "No villages", "Select village")} />
                                </SelectTrigger>
                                <SelectContent className="max-h-56 sm:max-h-60">
                                    {villages.map(v => <SelectItem key={v} value={v} className="text-xs sm:text-sm">{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* action row */}
                    <div className="px-3 pb-3 sm:px-5 sm:pb-5 lg:px-6 flex items-center justify-between sm:justify-end gap-2">
                        {/* mobile: show required hint */}
                        <p className="sm:hidden text-[10px] text-gray-400 dark:text-gray-500">
                            * State, district & sub-district required
                        </p>
                        <div className="flex gap-2">
                            <button onClick={handleClear} disabled={isLoading}
                                className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2
                                    rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold
                                    text-gray-600 dark:text-gray-300
                                    border border-gray-200 dark:border-gray-700
                                    bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800
                                    disabled:opacity-50 transition-all duration-150">
                                <X size={12} /> Clear
                            </button>
                            <button onClick={handleSearch} disabled={isLoading}
                                className="inline-flex items-center gap-1 sm:gap-1.5 px-3.5 sm:px-5 py-1.5 sm:py-2
                                    rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold
                                    bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                    dark:bg-teal-500 dark:hover:bg-teal-600
                                    shadow-sm hover:shadow-md disabled:opacity-50 transition-all duration-150">
                                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                                {isLoading ? "Searching…" : "Find Farmers"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ══ RESULTS ══════════════════════════════════════════════ */}
                {hasSearched && (
                    <section className="space-y-3 sm:space-y-4">

                        {/* results bar */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg
                                    bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400
                                    text-[10px] sm:text-xs font-bold">
                                    {results.length}
                                </span>
                                Farmer{results.length !== 1 ? "s" : ""} Found
                            </h3>
                            {results.length > PAGE_SIZE && (
                                <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, results.length)} of {results.length}
                                </span>
                            )}
                        </div>

                        {/* ── Loader ── */}
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 sm:py-16 rounded-xl sm:rounded-2xl
                                bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-[3px]
                                    border-gray-200 dark:border-gray-700 border-t-teal-500 animate-spin" />
                                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">Searching farmers…</p>
                            </div>

                        /* ── Empty ── */
                        ) : results.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6 text-center
                                rounded-xl sm:rounded-2xl border-2 border-dashed
                                border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2.5 sm:mb-3
                                    bg-teal-50 dark:bg-teal-950 text-teal-500 dark:text-teal-400
                                    border border-teal-100 dark:border-teal-900">
                                    <User size={18} className="sm:hidden" />
                                    <User size={22} className="hidden sm:block" />
                                </div>
                                <h4 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">No Farmers Found</h4>
                                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                                    No farmers match your location. Try a broader area.
                                </p>
                            </div>

                        /* ── Cards ── */
                        ) : (
                            <>
                                {/* 1-col on xs, 2-col on md, 3-col on xl */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                                    {paginatedResults.map((farmer) => {
                                        const location = [farmer.village_city, farmer.taluka, farmer.district]
                                            .filter(Boolean).join(", ");
                                        const hasLandRef = farmer.survey_number || farmer.gat_number;

                                        return (
                                            <div key={farmer.id}
                                                className="group relative bg-white dark:bg-gray-900
                                                    border border-gray-200 dark:border-gray-700 rounded-xl sm:rounded-2xl
                                                    overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 sm:hover:-translate-y-1
                                                    hover:border-teal-300 dark:hover:border-teal-700
                                                    transition-all duration-200">

                                                {/* top accent stripe */}
                                                <div className="h-0.5 w-full bg-gradient-to-r from-teal-500 to-teal-400
                                                    opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                                                <div className="p-3.5 sm:p-5">
                                                    {/* header row */}
                                                    <div className="flex items-start gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                                                        <FarmerAvatar src={farmer.avatar_url} name={farmer.full_name} />
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug truncate">
                                                                {farmer.full_name || "Unknown Farmer"}
                                                            </h4>
                                                            <div className="flex items-start gap-1 mt-0.5 sm:mt-1">
                                                                <MapPin size={9} className="text-teal-500 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                                                                <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 leading-snug">
                                                                    {location || "Location not specified"}
                                                                </p>
                                                            </div>
                                                            {hasLandRef && (
                                                                <div className="mt-1 sm:mt-1.5 inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md
                                                                    bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400
                                                                    border border-teal-100 dark:border-teal-900
                                                                    text-[9px] sm:text-[10px] font-semibold leading-tight">
                                                                    {farmer.gat_number ? `Gat: ${farmer.gat_number}` : ""}
                                                                    {farmer.gat_number && farmer.survey_number ? " · " : ""}
                                                                    {farmer.survey_number ? `Survey: ${farmer.survey_number}` : ""}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* stat chips — wrap gracefully */}
                                                    <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
                                                        <StatChip label="Land" value={farmer.land_size_acres ? `${farmer.land_size_acres} Ac` : null} icon={Wheat} />
                                                        <StatChip label="Soil" value={farmer.soil_type} icon={Sprout} />
                                                        <StatChip label="Farming" value={farmer.farming_type} icon={TreePine} />
                                                    </div>

                                                    {/* footer action */}
                                                    <div className="border-t border-gray-100 dark:border-gray-800 pt-2.5 sm:pt-3">
                                                        <button onClick={() => handleContact(farmer)}
                                                            className="inline-flex items-center gap-1 sm:gap-1.5
                                                                px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl
                                                                text-[11px] sm:text-xs font-semibold
                                                                bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                                                dark:bg-teal-500 dark:hover:bg-teal-600
                                                                shadow-sm hover:shadow transition-all duration-150">
                                                            <MessageSquare size={11} /> Contact Farmer
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ── Pagination ── */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between flex-wrap gap-2
                                        px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl
                                        bg-white dark:bg-gray-900
                                        border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                                            Page {currentPage} of {totalPages} · {results.length} farmers
                                        </span>
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <PgBtn onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                                                <ChevronLeft size={13} />
                                            </PgBtn>
                                            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums px-1">
                                                {currentPage} / {totalPages}
                                            </span>
                                            <PgBtn onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                                                <ChevronRight size={13} />
                                            </PgBtn>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                )}
            </div>
        </DashboardLayout>
    );
};

export default FindNearbyFarmersPage;