import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { getUserProfile, updateUserProfile, getUserRole, UserProfile, UserRole, getProfileId } from "@/lib/supabase-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Save } from "lucide-react";
import { useFarms } from "@/hooks/useFarms";
import { FarmsList } from "@/components/FarmsList";
import { useFarmerEquipment } from "@/hooks/useFarmerEquipment";
import { EquipmentList } from "@/components/EquipmentList";
import { useIndianLocations } from "@/hooks/useIndianLocations";

const ProfilePage = () => {
    const { user } = useUser();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profileId, setProfileId] = useState<string | null>(null);

    const [phone, setPhone] = useState("");
    const [availableEquipment, setAvailableEquipment] = useState("");

    // Structured location fields (for all user types)
    const [state, setState] = useState("");
    const [district, setDistrict] = useState("");
    const [subDistrict, setSubDistrict] = useState("");
    const [villageCity, setVillageCity] = useState("");
    const [landmark, setLandmark] = useState("");

    // Use Indian Locations Hook
    const { states, districts, subDistricts, villages, isLoading: locationsLoading } = useIndianLocations(state, district, subDistrict);

    // Use Farms and Equipment Hooks
    const { data: farms, isLoading: farmsLoading } = useFarms(profileId);
    const { data: farmerEquipment, isLoading: equipmentLoading } = useFarmerEquipment(profileId);

    useEffect(() => {
        async function load() {
            if (!user?.id) return;
            setIsLoading(true);

            // Get profile ID first
            const pId = await getProfileId(user.id);
            setProfileId(pId);

            // Fetch profile and role in parallel
            const [profileData, userRole] = await Promise.all([
                getUserProfile(user.id),
                getUserRole(user.id)
            ]);

            setRole(userRole);

            if (profileData) {
                setProfile(profileData);
                setPhone(profileData.phone || "");
                setAvailableEquipment(profileData.available_equipment || "");

                // Load structured location fields
                setState(profileData.state || "");
                setDistrict(profileData.district || "");
                setSubDistrict(profileData.taluka || "");
                setVillageCity(profileData.village_city || "");
                setLandmark(profileData.landmark || "");
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
                phone: phone || null,
                // Equipment for farmer and equipment owners
                available_equipment: (role === "farmer" || role === "equipment_owner") ? (availableEquipment || null) : null,
                // Structured location for all users
                state: state || null,
                district: district || null,
                taluka: subDistrict || null,
                village_city: villageCity || null,
                landmark: landmark || null,
                location: [landmark, villageCity, subDistrict, district, state].filter(Boolean).join(', ') || null,
            });
            toast.success("Profile saved successfully!");
        } catch (error) {
            console.error("Profile save error:", error);
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
                            <Input id="fullName" value={user?.fullName || profile?.full_name || ""} disabled className="opacity-60" />
                            <p className="text-xs text-muted-foreground">Managed by Clerk</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={user?.primaryEmailAddress?.emailAddress || profile?.email || ""} disabled className="opacity-60" />
                            <p className="text-xs text-muted-foreground">Managed by Clerk</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91..." />
                        </div>
                    </div>
                </section>

                {/* Detailed Location Section - for all roles */}
                <section className="bg-card rounded-xl border border-border p-6 space-y-4">
                    <h2 className="font-display text-xl font-semibold">Detailed Location Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Select value={state} onValueChange={setState}>
                                <SelectTrigger id="state">
                                    <SelectValue placeholder="Select State" />
                                </SelectTrigger>
                                <SelectContent>
                                    {states.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="district">District</Label>
                            <Select value={district} onValueChange={setDistrict} disabled={!state || locationsLoading}>
                                <SelectTrigger id="district">
                                    <SelectValue placeholder="Select District" />
                                </SelectTrigger>
                                <SelectContent>
                                    {districts.map(d => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subdistrict">Taluka / Sub-District</Label>
                            <Select value={subDistrict} onValueChange={setSubDistrict} disabled={!district || locationsLoading}>
                                <SelectTrigger id="subdistrict">
                                    <SelectValue placeholder="Select Taluka" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subDistricts.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="village">Village / City</Label>
                            <Select value={villageCity} onValueChange={setVillageCity} disabled={!subDistrict || locationsLoading}>
                                <SelectTrigger id="village">
                                    <SelectValue placeholder="Select Village / City" />
                                </SelectTrigger>
                                <SelectContent>
                                    {villages.map(v => (
                                        <SelectItem key={v} value={v}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="landmark">Landmark</Label>
                            <Input id="landmark" value={landmark} onChange={e => setLandmark(e.target.value)} placeholder="Near temple / school / main road" />
                        </div>
                    </div>
                </section>

                {/* My Farms Section - ONLY for Farmers */}
                {role === "farmer" && profileId && (
                    <section className="bg-card rounded-xl border border-border p-6 space-y-4">
                        <FarmsList 
                            profileId={profileId} 
                            farms={farms || []} 
                            isLoading={farmsLoading}
                        />
                    </section>
                )}

                {/* My Equipment Section - ONLY for Farmers */}
                {role === "farmer" && profileId && (
                    <section className="bg-card rounded-xl border border-border p-6 space-y-4">
                        <EquipmentList 
                            profileId={profileId} 
                            equipment={farmerEquipment || []} 
                            isLoading={equipmentLoading}
                        />
                    </section>
                )}

                {/* Equipment Details - ONLY for Equipment Owners */}
                {role === "equipment_owner" && (
                    <section className="bg-card rounded-xl border border-border p-6 space-y-4">
                        <h2 className="font-display text-xl font-semibold">Business Details</h2>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="equipmentDesc">General Available Equipment Description</Label>
                                <Input id="equipmentDesc" value={availableEquipment} onChange={e => setAvailableEquipment(e.target.value)} placeholder="e.g. Fleet of 5 Tractors" />
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
