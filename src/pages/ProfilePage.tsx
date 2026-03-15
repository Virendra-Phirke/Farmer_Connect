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

const ProfilePage = () => {
    const { user } = useUser();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profileId, setProfileId] = useState<string | null>(null);

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [locationName, setLocationName] = useState("");
    const [availableEquipment, setAvailableEquipment] = useState("");

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
                setFullName(profileData.full_name || user.fullName || "");
                setEmail(profileData.email || user.primaryEmailAddress?.emailAddress || "");
                setPhone(profileData.phone || "");
                setLocationName(profileData.location || "");
                setAvailableEquipment(profileData.available_equipment || "");
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
                // Location is now string name for non-farmers
                location: role !== "farmer" ? (locationName || null) : null,
                // Equipment for farmer and equipment owners
                available_equipment: (role === "farmer" || role === "equipment_owner") ? (availableEquipment || null) : null,
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
