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

/* ── tiny label helper ───────────────────────────────────────────────────── */
const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 tracking-wide">
        {children}
        {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

/* ── farmer avatar ───────────────────────────────────────────────────────── */
const FarmerAvatar = ({ src, name }: { src?: string | null; name?: string | null }) => {
    const letter = String(name || "F").slice(0, 1).toUpperCase();
    return src ? (
        <img src={src} alt={name || "Farmer"}
            className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm" />
    ) : (
        <div className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center
            bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300
            text-base font-bold ring-2 ring-white dark:ring-gray-800 shadow-sm">
            {letter}
        </div>
    );
};

/* ── stat chip ───────────────────────────────────────────────────────────── */
const StatChip = ({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: any }) => (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
        bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        {Icon && <Icon size={11} className="text-teal-500 dark:text-teal-400 flex-shrink-0" />}
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{label}</span>
        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 capitalize">
            {value || "—"}
        </span>
    </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
const FindNearbyFarmersPage = () => {
    const navigate  = useNavigate();
    const { user }  = useUser();

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
                district: district || undefined,
                taluka:   subDistrict || undefined,
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

    const totalPages      = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const paginatedResults = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    /* ── shared select style ────────────────────────────────────────────── */
    const selPlaceholder = (loading: boolean, blockOn: boolean, blockMsg: string, empty: boolean, emptyMsg: string, normal: string) => {
        if (loading)  return "Loading…";
        if (blockOn)  return blockMsg;
        if (empty)    return emptyMsg;
        return normal;
    };

    return (
      <DashboardLayout subtitle="Find nearby farmers using location specifics and land records.">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* ══ HERO HEADER ═══════════════════════════════════════════ */}
                <div className="relative overflow-hidden rounded-2xl
                    bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800
                    dark:from-teal-800 dark:via-teal-900 dark:to-gray-900
                    border border-teal-500/30 dark:border-teal-700/50
                    shadow-lg shadow-teal-200/40 dark:shadow-teal-900/40 p-6 sm:p-8">

                    {/* dot texture */}
                    <div className="absolute top-0 right-0 w-72 h-72 opacity-10
                        bg-[radial-gradient(circle_at_70%_30%,white_1px,transparent_1px)]
                        bg-[size:18px_18px] pointer-events-none" />

                    <div className="relative">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                            bg-white/15 border border-white/25 text-white/90
                            text-[0.68rem] font-semibold tracking-widest uppercase mb-3">
                            <Wheat size={10} /> Farmer Network
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight mb-1">
                            Find Nearby Farmers
                        </h1>
                        <p className="text-teal-100/80 text-sm font-normal max-w-md">
                            Search for farmers in your area by state, district, and taluka to connect and collaborate.
                        </p>
                    </div>
                </div>

                {/* ══ SEARCH FORM ═══════════════════════════════════════════ */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

                    {/* form header */}
                    <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center
                            bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400
                            border border-teal-100 dark:border-teal-800">
                            <MapPin size={15} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Search Criteria</h2>
                            <p className="text-xs text-gray-400 dark:text-gray-500">State, district and sub-district are required</p>
                        </div>
                    </div>

                    {/* dropdowns */}
                    <div className="px-5 sm:px-6 pt-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                        {/* State */}
                        <div>
                            <FieldLabel required>State</FieldLabel>
                            <Select value={state} disabled={locationsLoading}
                                onValueChange={v => { setState(v); setDistrict(""); setSubDistrict(""); setVillageCity(""); }}>
                                <SelectTrigger className="h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-teal-400 focus:ring-teal-400/20">
                                    <SelectValue placeholder={locationsLoading ? "Loading…" : "Select state"} />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* District */}
                        <div>
                            <FieldLabel required>District</FieldLabel>
                            <Select value={district} disabled={!state || districts.length === 0 || locationsLoading}
                                onValueChange={v => { setDistrict(v); setSubDistrict(""); setVillageCity(""); }}>
                                <SelectTrigger className="h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-teal-400 focus:ring-teal-400/20">
                                    <SelectValue placeholder={selPlaceholder(
                                        locationsLoading, !state, "Select state first",
                                        districts.length === 0, "No districts", "Select district"
                                    )} />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sub-District */}
                        <div>
                            <FieldLabel required>Sub-District</FieldLabel>
                            <Select value={subDistrict} disabled={!district || subDistricts.length === 0 || locationsLoading}
                                onValueChange={v => { setSubDistrict(v); setVillageCity(""); }}>
                                <SelectTrigger className="h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-teal-400 focus:ring-teal-400/20">
                                    <SelectValue placeholder={selPlaceholder(
                                        locationsLoading, !district, "Select district first",
                                        subDistricts.length === 0, "No sub-districts", "Select sub-district"
                                    )} />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {subDistricts.map(sd => <SelectItem key={sd} value={sd}>{sd}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Village */}
                        <div>
                            <FieldLabel>Village / City</FieldLabel>
                            <Select value={villageCity} disabled={!subDistrict || villages.length === 0 || locationsLoading}
                                onValueChange={setVillageCity}>
                                <SelectTrigger className="h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-teal-400 focus:ring-teal-400/20">
                                    <SelectValue placeholder={selPlaceholder(
                                        locationsLoading, !subDistrict, "Select sub-district first",
                                        villages.length === 0, "No villages", "Select village"
                                    )} />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {villages.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* action buttons */}
                    <div className="px-5 sm:px-6 pb-5 flex items-center justify-end gap-2.5 flex-wrap">
                        <button onClick={handleClear} disabled={isLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                                text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700
                                bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800
                                disabled:opacity-50 transition-all duration-150">
                            <X size={14} /> Clear
                        </button>
                        <button onClick={handleSearch} disabled={isLoading}
                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold
                                bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                dark:bg-teal-500 dark:hover:bg-teal-600
                                shadow-sm hover:shadow-md disabled:opacity-50 transition-all duration-150">
                            {isLoading
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Search size={14} />}
                            {isLoading ? "Searching…" : "Find Farmers"}
                        </button>
                    </div>
                </div>

                {/* ══ RESULTS ═══════════════════════════════════════════════ */}
                {hasSearched && (
                    <section className="space-y-4">

                        {/* results header */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg
                                    bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 text-xs font-bold">
                                    {results.length}
                                </span>
                                Farmer{results.length !== 1 ? "s" : ""} Found
                            </h3>
                            {results.length > 0 && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, results.length)} of {results.length}
                                </span>
                            )}
                        </div>

                        {/* loader */}
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 rounded-2xl
                                bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 gap-3">
                                <div className="w-10 h-10 rounded-full border-[3px] border-gray-200 dark:border-gray-700 border-t-teal-500 animate-spin" />
                                <p className="text-sm text-gray-400 dark:text-gray-500">Searching farmers…</p>
                            </div>

                        /* empty */
                        ) : results.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-6 text-center
                                rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                                bg-gray-50 dark:bg-gray-900/50">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3
                                    bg-teal-50 dark:bg-teal-950 text-teal-500 dark:text-teal-400
                                    border border-teal-100 dark:border-teal-900">
                                    <User size={22} />
                                </div>
                                <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">No Farmers Found</h4>
                                <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                                    No farmers match your selected location. Try a broader search area.
                                </p>
                            </div>

                        /* cards */
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {paginatedResults.map((farmer) => {
                                        const location = [farmer.village_city, farmer.taluka, farmer.district]
                                            .filter(Boolean).join(", ");
                                        const hasLandRef = farmer.survey_number || farmer.gat_number;

                                        return (
                                            <div key={farmer.id}
                                                className="group relative bg-white dark:bg-gray-900
                                                    border border-gray-200 dark:border-gray-700
                                                    rounded-2xl overflow-hidden
                                                    shadow-sm hover:shadow-md hover:-translate-y-1
                                                    hover:border-teal-300 dark:hover:border-teal-700
                                                    transition-all duration-200">

                                                {/* top accent */}
                                                <div className="h-0.5 w-full bg-gradient-to-r from-teal-500 to-teal-400
                                                    opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                                                <div className="p-5">
                                                    {/* header row */}
                                                    <div className="flex items-start gap-3 mb-4">
                                                        <FarmerAvatar src={farmer.avatar_url} name={farmer.full_name} />
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug">
                                                                {farmer.full_name || "Unknown Farmer"}
                                                            </h4>
                                                            <div className="flex items-start gap-1 mt-1">
                                                                <MapPin size={10} className="text-teal-500 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 leading-snug">
                                                                    {location || "Location not specified"}
                                                                </p>
                                                            </div>
                                                            {/* land ref badge */}
                                                            {hasLandRef && (
                                                                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                                                                    bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400
                                                                    border border-teal-100 dark:border-teal-900 text-[10px] font-semibold">
                                                                    {farmer.gat_number ? `Gat: ${farmer.gat_number}` : ""}
                                                                    {farmer.gat_number && farmer.survey_number ? " · " : ""}
                                                                    {farmer.survey_number ? `Survey: ${farmer.survey_number}` : ""}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* stat chips */}
                                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                                        <StatChip
                                                            label="Land"
                                                            value={farmer.land_size_acres ? `${farmer.land_size_acres} Ac` : null}
                                                            icon={Wheat}
                                                        />
                                                        <StatChip
                                                            label="Soil"
                                                            value={farmer.soil_type}
                                                            icon={Sprout}
                                                        />
                                                        <StatChip
                                                            label="Farming"
                                                            value={farmer.farming_type}
                                                            icon={TreePine}
                                                        />
                                                    </div>

                                                    {/* divider + action */}
                                                    <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                                                        <button onClick={() => handleContact(farmer)}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                                                                text-xs font-semibold
                                                                bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                                                dark:bg-teal-500 dark:hover:bg-teal-600
                                                                shadow-sm hover:shadow transition-all duration-150">
                                                            <MessageSquare size={12} /> Contact Farmer
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between flex-wrap gap-3
                                        px-4 py-3 rounded-xl
                                        bg-white dark:bg-gray-900
                                        border border-gray-200 dark:border-gray-700
                                        shadow-sm">
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            Page {currentPage} of {totalPages} · {results.length} farmers
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(p => p - 1)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg
                                                    border border-gray-200 dark:border-gray-700
                                                    bg-gray-50 dark:bg-gray-800
                                                    text-gray-600 dark:text-gray-400
                                                    hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50
                                                    dark:hover:border-teal-600 dark:hover:text-teal-400 dark:hover:bg-teal-950
                                                    disabled:opacity-30 disabled:cursor-not-allowed
                                                    transition-all duration-150">
                                                <ChevronLeft size={14} />
                                            </button>
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-1 tabular-nums">
                                                {currentPage} / {totalPages}
                                            </span>
                                            <button
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(p => p + 1)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg
                                                    border border-gray-200 dark:border-gray-700
                                                    bg-gray-50 dark:bg-gray-800
                                                    text-gray-600 dark:text-gray-400
                                                    hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50
                                                    dark:hover:border-teal-600 dark:hover:text-teal-400 dark:hover:bg-teal-950
                                                    disabled:opacity-30 disabled:cursor-not-allowed
                                                    transition-all duration-150">
                                                <ChevronRight size={14} />
                                            </button>
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