import { useUser } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile, updateUserProfile, getUserRole, UserProfile, UserRole, getProfileId } from "@/lib/supabase-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowLeft, Loader2, QrCode, Save, Upload, X } from "lucide-react";
import { useFarms } from "@/hooks/useFarms";
import { FarmsList } from "@/components/FarmsList";
import { useFarmerEquipment } from "@/hooks/useFarmerEquipment";
import { EquipmentList } from "@/components/EquipmentList";
import { useIndianLocations } from "@/hooks/useIndianLocations";

const ProfilePage = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [profileId, setProfileId] = useState<string | null>(null);

    const [phone, setPhone] = useState("");
    const [availableEquipment, setAvailableEquipment] = useState("");
    const [paymentQrUrl, setPaymentQrUrl] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

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

    const dashboardPath = role === "farmer"
        ? "/farmer-dashboard"
        : role === "equipment_owner"
            ? "/equipment-dashboard"
            : role === "hotel_restaurant_manager"
                ? "/hotel-dashboard"
                : "/";

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
                setPaymentQrUrl(profileData.payment_qr_url || "");

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

    const validateForm = () => {
        const nextErrors: Record<string, string> = {};
        const phoneDigits = phone.replace(/\D/g, "");

        if (!phone.trim()) {
            nextErrors.phone = "Phone is required";
        } else if (!(phoneDigits.length === 10 || (phoneDigits.length === 12 && phoneDigits.startsWith("91")))) {
            nextErrors.phone = "Enter a valid 10-digit Indian mobile number";
        }

        if (!state.trim()) nextErrors.state = "State is required";
        if (!district.trim()) nextErrors.district = "District is required";
        if (!subDistrict.trim()) nextErrors.subDistrict = "Taluka is required";
        if (!villageCity.trim()) nextErrors.villageCity = "Village / City is required";
        if (!landmark.trim()) nextErrors.landmark = "Landmark is required";

        if (role === "equipment_owner" && !availableEquipment.trim()) {
            nextErrors.availableEquipment = "Available equipment is required";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSave = async () => {
        if (!user?.id) return;
        if (!validateForm()) {
            toast.error("Please fill all required fields with valid values");
            return;
        }
        setIsSaving(true);
        try {
            // Build updates object - ONLY include fields that actually changed
            // CRITICAL: Use undefined to skip fields, NOT null!
            const updates: Record<string, any> = {};
            const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
            
            // Only update phone if it actually changed
            if (normalizedPhone !== ((profile?.phone || "").replace(/\D/g, "").slice(-10))) {
                // Only send phone if it has a value; otherwise skip
                if (normalizedPhone) {
                    updates.phone = normalizedPhone;
                } else {
                    // Don't update phone if user cleared it (keep existing value)
                    // Only set to explicit value if different and non-empty
                }
            }
            
            // Only update location fields if they changed
            if (state !== (profile?.state || "")) {
                if (state.trim()) updates.state = state;
            }
            if (district !== (profile?.district || "")) {
                if (district.trim()) updates.district = district;
            }
            if (subDistrict !== (profile?.taluka || "")) {
                if (subDistrict.trim()) updates.taluka = subDistrict;
            }
            if (villageCity !== (profile?.village_city || "")) {
                if (villageCity.trim()) updates.village_city = villageCity;
            }
            if (landmark !== (profile?.landmark || "")) {
                if (landmark.trim()) updates.landmark = landmark;
            }
            
            // Only update location composite if location fields changed
            const newLocation = [landmark, villageCity, subDistrict, district, state].filter(Boolean).join(', ');
            if (newLocation !== (profile?.location || "")) {
                updates.location = newLocation;
            }
            
            // Only update equipment if it changed
            const equipmentValue = role === "equipment_owner" ? availableEquipment : undefined;
            if (equipmentValue !== (profile?.available_equipment || "")) {
                if (equipmentValue) {
                    updates.available_equipment = equipmentValue;
                }
            }

            if (paymentQrUrl !== (profile?.payment_qr_url || "")) {
                updates.payment_qr_url = paymentQrUrl || null;
            }
            
            // Only send update if something actually changed
            if (Object.keys(updates).length === 0) {
                toast.info("No changes to save");
                setIsSaving(false);
                return;
            }
            
            await updateUserProfile(user.id, updates);
            
            // Refresh the profile data from database to ensure all changes persisted
            const updatedProfile = await getUserProfile(user.id);
            if (updatedProfile) {
                setProfile(updatedProfile);
                setPhone(updatedProfile.phone || "");
                setAvailableEquipment(updatedProfile.available_equipment || "");
                setPaymentQrUrl(updatedProfile.payment_qr_url || "");
            }
            
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
            <DashboardLayout subtitle="">
                <div className="flex justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const handlePaymentQrUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("QR image size should be less than 5MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setPaymentQrUrl(String(reader.result || ""));
            toast.success("Payment QR uploaded. Click Save Profile to publish.");
        };
        reader.onerror = () => toast.error("Failed to read QR image");
        reader.readAsDataURL(file);
    };

    return (
        <DashboardLayout subtitle="">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex justify-start">
                    <Button type="button" variant="outline" onClick={() => navigate(dashboardPath)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go to Dashboard
                    </Button>
                </div>

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
                            <Input id="phone" value={phone} onChange={e => { setPhone(e.target.value); setErrors(prev => ({ ...prev, phone: "" })); }} placeholder="Enter 10-digit mobile number" maxLength={14} />
                            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                        </div>
                    </div>
                </section>

                {/* Detailed Location Section - for all roles */}
                <section className="bg-card rounded-xl border border-border p-6 space-y-4">
                    <h2 className="font-display text-xl font-semibold">Detailed Location Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Select value={state} onValueChange={(value) => {
                                setState(value);
                                setDistrict("");
                                setSubDistrict("");
                                setVillageCity("");
                                setErrors(prev => ({ ...prev, state: "" }));
                            }}>
                                <SelectTrigger id="state">
                                    <SelectValue placeholder="Select State" />
                                </SelectTrigger>
                                <SelectContent>
                                    {states.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="district">District</Label>
                            <Select value={district} onValueChange={(value) => {
                                setDistrict(value);
                                setSubDistrict("");
                                setVillageCity("");
                                setErrors(prev => ({ ...prev, district: "" }));
                            }} disabled={!state || locationsLoading}>
                                <SelectTrigger id="district">
                                    <SelectValue placeholder="Select District" />
                                </SelectTrigger>
                                <SelectContent>
                                    {districts.map(d => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.district && <p className="text-xs text-destructive">{errors.district}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subdistrict">Taluka / Sub-District</Label>
                            <Select value={subDistrict} onValueChange={(value) => {
                                setSubDistrict(value);
                                setVillageCity("");
                                setErrors(prev => ({ ...prev, subDistrict: "" }));
                            }} disabled={!district || locationsLoading}>
                                <SelectTrigger id="subdistrict">
                                    <SelectValue placeholder="Select Taluka" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subDistricts.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.subDistrict && <p className="text-xs text-destructive">{errors.subDistrict}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="village">Village / City</Label>
                            <Select value={villageCity} onValueChange={(value) => {
                                setVillageCity(value);
                                setErrors(prev => ({ ...prev, villageCity: "" }));
                            }} disabled={!subDistrict || locationsLoading}>
                                <SelectTrigger id="village">
                                    <SelectValue placeholder="Select Village / City" />
                                </SelectTrigger>
                                <SelectContent>
                                    {villages.map(v => (
                                        <SelectItem key={v} value={v}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.villageCity && <p className="text-xs text-destructive">{errors.villageCity}</p>}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="landmark">Landmark</Label>
                            <Input id="landmark" value={landmark} onChange={e => { setLandmark(e.target.value); setErrors(prev => ({ ...prev, landmark: "" })); }} placeholder="Near temple / school / main road" />
                            {errors.landmark && <p className="text-xs text-destructive">{errors.landmark}</p>}
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
                                <Input id="equipmentDesc" value={availableEquipment} onChange={e => { setAvailableEquipment(e.target.value); setErrors(prev => ({ ...prev, availableEquipment: "" })); }} placeholder="e.g. Fleet of 5 Tractors" />
                                {errors.availableEquipment && <p className="text-xs text-destructive">{errors.availableEquipment}</p>}
                                <p className="text-xs text-muted-foreground mt-1">Use the 'My Equipment' dashboard page to list individual items for rent.</p>
                            </div>
                        </div>
                    </section>
                )}

                {(role === "farmer" || role === "equipment_owner") && (
                    <section className="bg-card rounded-xl border border-border p-6 space-y-4">
                        <h2 className="font-display text-xl font-semibold">Payment QR Code</h2>
                        <p className="text-sm text-muted-foreground">
                            Buyers will see this QR during payment and can download it with your name.
                        </p>

                        {paymentQrUrl ? (
                            <div className="space-y-3">
                                <div className="w-full max-w-sm rounded-lg border border-border bg-muted/30 p-3">
                                    <img
                                        src={paymentQrUrl}
                                        alt="Your payment QR"
                                        className="w-full h-auto max-h-72 object-contain rounded-md bg-white"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" asChild>
                                        <label htmlFor="profilePaymentQrUpload" className="cursor-pointer">
                                            <Upload className="mr-2 h-4 w-4" />
                                            Replace QR
                                        </label>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setPaymentQrUrl("")}
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Remove QR
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Button type="button" variant="outline" asChild>
                                <label htmlFor="profilePaymentQrUpload" className="cursor-pointer">
                                    <QrCode className="mr-2 h-4 w-4" />
                                    Upload Payment QR
                                </label>
                            </Button>
                        )}

                        <input
                            id="profilePaymentQrUpload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePaymentQrUpload}
                        />
                    </section>
                )}

                {role === "hotel_restaurant_manager" && (
                    <section className="bg-card rounded-xl border border-border p-6 space-y-2">
                        <h2 className="font-display text-xl font-semibold">Hotel / Restaurant Details</h2>
                        <p className="text-sm text-muted-foreground">Please ensure phone and all location fields are completed before saving.</p>
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
