import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { getUserProfile, updateUserProfile, getUserRole, UserProfile, UserRole } from "@/lib/supabase-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Save } from "lucide-react";
// @ts-expect-error - The package's index.d.ts is malformed and not a module
import data from "data-for-india";

const STATES = Array.from(new Set(data.districts.map((d: any) => d.state))).sort() as string[];

const ProfilePage = () => {
    const { user } = useUser();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [landSize, setLandSize] = useState("");
    const [soilType, setSoilType] = useState("");
    const [farmingType, setFarmingType] = useState("");
    const [locationName, setLocationName] = useState("");
    const [availableEquipment, setAvailableEquipment] = useState("");

    // New Farm Details
    const [state, setState] = useState("Maharashtra");
    const [district, setDistrict] = useState("");
    const [taluka, setTaluka] = useState("");
    const [villageCity, setVillageCity] = useState("");
    const [surveyNumber, setSurveyNumber] = useState("");
    const [gatNumber, setGatNumber] = useState("");

    const availableDistricts = data.districts
        .filter((d: any) => d.state === state)
        .map((d: any) => d.district as string)
        .sort();

    useEffect(() => {
        async function load() {
            if (!user?.id) return;
            setIsLoading(true);

            // Fetch profile and role in parallel
            const [profileData, userRole] = await Promise.all([
                getUserProfile(user.id),
                getUserRole(user.id)
            ]);

            setRole(userRole);

            if (profileData) {
                setProfile(profileData);
                setFullName(profileData.full_name || user.fullName || "");
                setEmail(profileData.email || user.primaryEmailAddress?.emailAddress || "");
                setPhone(profileData.phone || "");
                setLandSize(profileData.land_size_acres ? String(profileData.land_size_acres) : "");
                setSoilType(profileData.soil_type || "");
                setFarmingType(profileData.farming_type || "");
                setLocationName(profileData.location || "");
                setAvailableEquipment(profileData.available_equipment || "");

                setState(profileData.state || "Maharashtra");
                setDistrict(profileData.district || "");
                setTaluka(profileData.taluka || "");
                setVillageCity(profileData.village_city || "");
                setSurveyNumber(profileData.survey_number || "");
                setGatNumber(profileData.gat_number || "");
            }
            setIsLoading(false);
        }
        load();
    }, [user?.id]);

    const handleSave = async () => {
        if (!user?.id) return;
        setIsSaving(true);
        try {
            await updateUserProfile(user.id, {
                full_name: fullName || null,
                phone: phone || null,
                // Only save farmer-specific fields if they are a farmer. Otherwise null out.
                land_size_acres: role === "farmer" && landSize ? parseFloat(landSize) : null,
                soil_type: role === "farmer" ? (soilType || null) : null,
                farming_type: role === "farmer" ? (farmingType || null) : null,
                // Save available equipment for farmer and equipment owners. Otherwise null out.
                available_equipment: (role === "farmer" || role === "equipment_owner") ? (availableEquipment || null) : null,
                // Location is now string name for non-farmers
                location: role !== "farmer" ? (locationName || null) : null,

                // Farmer specific location
                state: role === "farmer" ? state : null,
                district: role === "farmer" ? (district || null) : null,
                taluka: role === "farmer" ? (taluka || null) : null,
                village_city: role === "farmer" ? (villageCity || null) : null,
                survey_number: role === "farmer" ? (surveyNumber || null) : null,
                gat_number: role === "farmer" ? (gatNumber || null) : null,
            });
            toast.success("Profile saved successfully!");
        } catch {
            toast.error("Failed to save profile");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout subtitle="Manage your profile">
                <div className="flex justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout subtitle="Manage your personal information and location.">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Personal Info - Appears for all roles */}
                <section className="bg-card rounded-xl border border-border p-6 space-y-4">
                    <h2 className="font-display text-xl font-semibold">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={email} disabled className="opacity-60" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..." />
                        </div>
                        {role !== "farmer" && (
                            <div className="space-y-2">
                                <Label htmlFor="locationName">Location (City/Village)</Label>
                                <Input id="locationName" value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="e.g. Pune, Maharashtra" />
                            </div>
                        )}
                    </div>
                </section>

                {/* Farm Details - ONLY for Farmers */}
                {role === "farmer" && (
                    <section className="bg-card rounded-xl border border-border p-6 space-y-4">
                        <h2 className="font-display text-xl font-semibold">Farm Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="landSize">Land Size (Acres)</Label>
                                <Input id="landSize" type="number" value={landSize} onChange={e => setLandSize(e.target.value)} placeholder="e.g. 5" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="soilType">Soil Type</Label>
                                <Select value={soilType} onValueChange={setSoilType}>
                                    <SelectTrigger><SelectValue placeholder="Select soil type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="loamy">Loamy</SelectItem>
                                        <SelectItem value="clay">Clay</SelectItem>
                                        <SelectItem value="sandy">Sandy</SelectItem>
                                        <SelectItem value="black">Black Soil</SelectItem>
                                        <SelectItem value="red">Red Soil</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="farmingType">Farming Type</Label>
                                <Select value={farmingType} onValueChange={setFarmingType}>
                                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="organic">Organic</SelectItem>
                                        <SelectItem value="conventional">Conventional</SelectItem>
                                        <SelectItem value="hydroponic">Hydroponic</SelectItem>
                                        <SelectItem value="greenhouse">Greenhouse</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="equipment">Available Equipment</Label>
                                <Input id="equipment" value={availableEquipment} onChange={e => setAvailableEquipment(e.target.value)} placeholder="e.g. Tractor, Plough" />
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4 space-y-4">
                            <h3 className="font-display text-lg font-semibold text-muted-foreground">Location Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="state">State</Label>
                                    <Select
                                        value={state}
                                        onValueChange={(v) => { setState(v); setDistrict(""); }}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                                        <SelectContent>
                                            {STATES.map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="district">District</Label>
                                    <Select
                                        value={district}
                                        onValueChange={setDistrict}
                                        disabled={!state}
                                    >
                                        <SelectTrigger><SelectValue placeholder={state ? "Select district" : "Select state first"} /></SelectTrigger>
                                        <SelectContent>
                                            {availableDistricts.map(d => (
                                                <SelectItem key={d} value={d}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="taluka">Taluka</Label>
                                    <Input id="taluka" value={taluka} onChange={e => setTaluka(e.target.value)} placeholder="e.g. Haveli" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="villageCity">Village / City</Label>
                                    <Input id="villageCity" value={villageCity} onChange={e => setVillageCity(e.target.value)} placeholder="e.g. Loni Kalbhor" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="surveyNumber">Survey Number</Label>
                                    <Input id="surveyNumber" value={surveyNumber} onChange={e => setSurveyNumber(e.target.value)} placeholder="e.g. 123/4" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gatNumber">Gat Number</Label>
                                    <Input id="gatNumber" value={gatNumber} onChange={e => setGatNumber(e.target.value)} placeholder="e.g. 56" />
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Equipment Details - ONLY for Equipment Owners */}
                {role === "equipment_owner" && (
                    <section className="bg-card rounded-xl border border-border p-6 space-y-4">
                        <h2 className="font-display text-xl font-semibold">Business Details</h2>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="equipment">General Available Equipment Description</Label>
                                <Input id="equipment" value={availableEquipment} onChange={e => setAvailableEquipment(e.target.value)} placeholder="e.g. Fleet of 5 Tractors" />
                                <p className="text-xs text-muted-foreground mt-1">Use the 'My Equipment' dashboard page to list individual items for rent.</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Save */}
                <div className="flex justify-end pt-4">
                    <Button size="lg" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Profile
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default ProfilePage;
