import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getUserProfile, updateUserProfile, getUserRole, UserProfile, UserRole } from "@/lib/supabase-auth";
import { useIndianLocations } from "@/hooks/useIndianLocations";
import {
    Loader2, AlertCircle, Phone, MapPin, Hash,
    Landmark, User, Save, X,
} from "lucide-react";

interface EditProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/* ── Field wrapper ───────────────────────────────────────────────────────── */
const Field = ({
    label, icon: Icon, children, hint,
}: {
    label: string;
    icon?: any;
    children: React.ReactNode;
    hint?: string;
}) => (
    <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
            {Icon && <Icon size={11} className="text-teal-500 dark:text-teal-400" />}
            {label}
        </label>
        {children}
        {hint && <p className="text-[11px] text-gray-400 dark:text-gray-500">{hint}</p>}
    </div>
);

/* ── Section heading ─────────────────────────────────────────────────────── */
const SectionHead = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="flex items-center gap-2.5 mb-3">
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
        <div className="text-center">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">{title}</p>
            {subtitle && <p className="text-[10px] text-gray-400 dark:text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
    </div>
);

/* ── shared input classes ────────────────────────────────────────────────── */
const inputCls =
    "h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700 " +
    "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
    "placeholder:text-gray-400 dark:placeholder:text-gray-500 " +
    "focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 " +
    "transition-all duration-150";

const selectTriggerCls =
    "h-9 text-sm rounded-xl border-gray-200 dark:border-gray-700 " +
    "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 " +
    "focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20";

/* ── placeholder helper ──────────────────────────────────────────────────── */
const ph = (
    loading: boolean, blockOn: boolean, blockMsg: string,
    empty: boolean, emptyMsg: string, normal: string,
) => loading ? "Loading…" : blockOn ? blockMsg : empty ? emptyMsg : normal;

/* ═══════════════════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════════════════ */
export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
    const { user } = useUser();
    const [profile, setProfile]         = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading]     = useState(false);
    const [isSaving, setIsSaving]       = useState(false);

    const [phone, setPhone]             = useState("");
    const [locationName, setLocationName] = useState("");
    const [state, setState]             = useState("");
    const [district, setDistrict]       = useState("");
    const [subDistrict, setSubDistrict] = useState("");
    const [villageCity, setVillageCity] = useState("");
    const [landmark, setLandmark]       = useState("");
    const [surveyNumber, setSurveyNumber] = useState("");
    const [gatNumber, setGatNumber]     = useState("");
    const [role, setRole]               = useState<UserRole | null>(null);

    const {
        states, districts, subDistricts, villages,
        isLoading: locationsLoading, error: locationError,
    } = useIndianLocations(state, district, subDistrict);

    useEffect(() => {
        async function loadProfile() {
            if (!user?.id || !open) return;
            setIsLoading(true);
            const [data, userRole] = await Promise.all([
                getUserProfile(user.id),
                getUserRole(user.id),
            ]);
            setRole(userRole);
            if (data) {
                setProfile(data);
                setPhone(data.phone || "");
                setLocationName(data.location || "");
                setState(data.state || "");
                setDistrict(data.district || "");
                setSubDistrict(data.taluka || "");
                setVillageCity(data.village_city || "");
                setLandmark(data.landmark || "");
                setSurveyNumber(data.survey_number || "");
                setGatNumber(data.gat_number || "");
            }
            setIsLoading(false);
        }
        loadProfile();
    }, [user?.id, open]);

    const handleSave = async () => {
        if (!user?.id) return;
        setIsSaving(true);
        try {
            const computedFarmerLocation =
                [landmark, villageCity, subDistrict, district, state].filter(Boolean).join(", ") || null;
            await updateUserProfile(user.id, {
                phone:          phone || null,
                location:       role === "farmer" ? computedFarmerLocation : (locationName || null),
                state:          role === "farmer" ? state : null,
                district:       role === "farmer" ? (district || null) : null,
                taluka:         role === "farmer" ? (subDistrict || null) : null,
                village_city:   role === "farmer" ? (villageCity || null) : null,
                landmark:       landmark || null,
                survey_number:  role === "farmer" ? (surveyNumber || null) : null,
                gat_number:     role === "farmer" ? (gatNumber || null) : null,
            });
            toast.success("Profile updated successfully");
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to update profile");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-20px)] sm:max-w-lg max-h-[92vh] overflow-hidden
                flex flex-col rounded-2xl p-0 gap-0">

                {/* ── Dialog header ──────────────────────────────────────── */}
                <div className="relative overflow-hidden flex-shrink-0
                    bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800
                    dark:from-teal-800 dark:via-teal-900 dark:to-gray-900
                    rounded-t-2xl px-5 py-5">
                    <div className="absolute inset-0 opacity-10
                        bg-[radial-gradient(circle_at_70%_20%,white_1px,transparent_1px)]
                        bg-[size:16px_16px] pointer-events-none" />
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center
                                bg-white/15 border border-white/20 text-white flex-shrink-0">
                                <User size={16} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white leading-tight">Edit Profile</h2>
                                <p className="text-teal-100/70 text-xs mt-0.5">
                                    {role === "farmer" ? "Farmer details & land records" : "Contact & location info"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20
                                text-white/80 hover:text-white transition-colors">
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* ── Body ───────────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                            <div className="w-9 h-9 rounded-full border-[3px]
                                border-gray-200 dark:border-gray-700 border-t-teal-500 animate-spin" />
                            <p className="text-xs text-gray-400 dark:text-gray-500">Loading profile…</p>
                        </div>
                    ) : (
                        <div className="space-y-4">

                            {/* ── Contact ──────────────────────────────── */}
                            <SectionHead title="Contact" />

                            <Field label="Phone Number" icon={Phone}>
                                <Input
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    className={inputCls}
                                />
                            </Field>

                            {/* ── Non-farmer address ───────────────────── */}
                            {role !== "farmer" && (
                                <>
                                    <SectionHead title="Location" />
                                    <Field label="Address / Location" icon={MapPin}>
                                        <Input
                                            value={locationName}
                                            onChange={e => setLocationName(e.target.value)}
                                            placeholder="City, State"
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field label="Landmark" icon={Landmark}>
                                        <Input
                                            value={landmark}
                                            onChange={e => setLandmark(e.target.value)}
                                            placeholder="Near temple / school / main road"
                                            className={inputCls}
                                        />
                                    </Field>
                                </>
                            )}

                            {/* ── Farmer fields ────────────────────────── */}
                            {role === "farmer" && (
                                <>
                                    <SectionHead title="Location" subtitle="State → District → Taluka → Village" />

                                    {/* Location error */}
                                    {locationError && (
                                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl
                                            bg-red-50 dark:bg-red-950/30
                                            border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                                            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                                            {locationError}
                                        </div>
                                    )}

                                    {/* State + District */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Field label="State" icon={MapPin}>
                                            <Select value={state} disabled={locationsLoading}
                                                onValueChange={v => { setState(v); setDistrict(""); setSubDistrict(""); setVillageCity(""); }}>
                                                <SelectTrigger className={selectTriggerCls}>
                                                    <SelectValue placeholder={locationsLoading ? "Loading…" : "Select state"} />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-56">
                                                    {states.map(s => <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </Field>

                                        <Field label="District">
                                            <Select value={district}
                                                disabled={!state || districts.length === 0 || locationsLoading}
                                                onValueChange={v => { setDistrict(v); setSubDistrict(""); setVillageCity(""); }}>
                                                <SelectTrigger className={selectTriggerCls}>
                                                    <SelectValue placeholder={ph(locationsLoading, !state, "State first", districts.length === 0, "No districts", "Select district")} />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-56">
                                                    {districts.map(d => <SelectItem key={d} value={d} className="text-sm">{d}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    </div>

                                    {/* Sub-district + Village */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Field label="Sub-District">
                                            <Select value={subDistrict}
                                                disabled={!district || subDistricts.length === 0 || locationsLoading}
                                                onValueChange={v => { setSubDistrict(v); setVillageCity(""); }}>
                                                <SelectTrigger className={selectTriggerCls}>
                                                    <SelectValue placeholder={ph(locationsLoading, !district, "District first", subDistricts.length === 0, "No sub-districts", "Select sub-district")} />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-56">
                                                    {subDistricts.map(sd => <SelectItem key={sd} value={sd} className="text-sm">{sd}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </Field>

                                        <Field label="Village / City">
                                            <Select value={villageCity}
                                                disabled={!subDistrict || villages.length === 0 || locationsLoading}
                                                onValueChange={setVillageCity}>
                                                <SelectTrigger className={selectTriggerCls}>
                                                    <SelectValue placeholder={ph(locationsLoading, !subDistrict, "Sub-district first", villages.length === 0, "No villages", "Select village")} />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-56">
                                                    {villages.map(v => <SelectItem key={v} value={v} className="text-sm">{v}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    </div>

                                    {/* Landmark */}
                                    <Field label="Landmark" icon={Landmark}
                                        hint="Helps locate your farm precisely">
                                        <Input
                                            value={landmark}
                                            onChange={e => setLandmark(e.target.value)}
                                            placeholder="Near temple / school / main road"
                                            className={inputCls}
                                        />
                                    </Field>

                                    {/* Land records */}
                                    <SectionHead title="Land Records" subtitle="Optional — used for verification" />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Field label="Survey Number" icon={Hash}>
                                            <Input
                                                value={surveyNumber}
                                                onChange={e => setSurveyNumber(e.target.value)}
                                                placeholder="e.g. 123/4"
                                                className={inputCls}
                                            />
                                        </Field>
                                        <Field label="Gat Number" icon={Hash}>
                                            <Input
                                                value={gatNumber}
                                                onChange={e => setGatNumber(e.target.value)}
                                                placeholder="e.g. 56"
                                                className={inputCls}
                                            />
                                        </Field>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────────── */}
                {!isLoading && (
                    <div className="flex-shrink-0 flex items-center justify-end gap-2.5
                        px-5 py-4 border-t border-gray-100 dark:border-gray-800
                        bg-gray-50/60 dark:bg-gray-900/60 rounded-b-2xl">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
                                text-gray-600 dark:text-gray-300
                                border border-gray-200 dark:border-gray-700
                                bg-white dark:bg-gray-900
                                hover:bg-gray-50 dark:hover:bg-gray-800
                                transition-all duration-150">
                            <X size={13} /> Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold
                                bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                dark:bg-teal-500 dark:hover:bg-teal-600
                                shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-150">
                            {isSaving
                                ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                                : <><Save size={13} /> Save Changes</>}
                        </button>
                    </div>
                )}

            </DialogContent>
        </Dialog>
    );
}