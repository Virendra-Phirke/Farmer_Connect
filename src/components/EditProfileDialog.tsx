import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { getUserProfile, updateUserProfile, getUserRole, UserProfile, UserRole } from "@/lib/supabase-auth";
import { useIndianLocations } from "@/hooks/useIndianLocations";
import { Loader2, AlertCircle } from "lucide-react";

interface EditProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
    const { user } = useUser();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [phone, setPhone] = useState("");
    const [locationName, setLocationName] = useState("");

    // New structured location/land fields 
    const [state, setState] = useState("");
    const [district, setDistrict] = useState("");
    const [subDistrict, setSubDistrict] = useState("");
    const [villageCity, setVillageCity] = useState("");
    const [landmark, setLandmark] = useState("");
    const [surveyNumber, setSurveyNumber] = useState("");
    const [gatNumber, setGatNumber] = useState("");

    const [role, setRole] = useState<UserRole | null>(null);

    // Use Indian Locations Hook
    const { states, districts, subDistricts, villages, isLoading: locationsLoading, error: locationError } = useIndianLocations(state, district, subDistrict);

    useEffect(() => {
        async function loadProfile() {
            if (!user?.id || !open) return;
            setIsLoading(true);
            const [data, userRole] = await Promise.all([
                getUserProfile(user.id),
                getUserRole(user.id)
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
            const computedFarmerLocation = [landmark, villageCity, subDistrict, district, state].filter(Boolean).join(", ") || null;
            await updateUserProfile(user.id, {
                phone: phone || null,
                location: role === "farmer" ? computedFarmerLocation : (locationName || null),
                state: role === "farmer" ? state : null,
                district: role === "farmer" ? (district || null) : null,
                taluka: role === "farmer" ? (subDistrict || null) : null,
                village_city: role === "farmer" ? (villageCity || null) : null,
                landmark: landmark || null,
                survey_number: role === "farmer" ? (surveyNumber || null) : null,
                gat_number: role === "farmer" ? (gatNumber || null) : null,
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Mobile & Address</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
                                </div>
                            </div>

                            {role !== "farmer" && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="locationName">Address / Location</Label>
                                        <Input id="locationName" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="City, State" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="landmark">Landmark</Label>
                                        <Input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near temple / school / main road" />
                                    </div>
                                </>
                            )}

                            {role === "farmer" && (
                                <>
                                    {locationError && (
                                        <Alert variant="destructive" className="mb-4">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{locationError}</AlertDescription>
                                        </Alert>
                                    )}
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* State Dropdown */}
                                        <div className="space-y-2">
                                            <Label htmlFor="state">State</Label>
                                            <Select
                                                value={state}
                                                onValueChange={(v) => { setState(v); setDistrict(""); setSubDistrict(""); setVillageCity(""); }}
                                                disabled={locationsLoading}
                                            >
                                                <SelectTrigger id="state">
                                                    <SelectValue placeholder={locationsLoading ? "Loading..." : "Select state"} />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {states.map(s => (
                                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* District Dropdown */}
                                        <div className="space-y-2">
                                            <Label htmlFor="district">District</Label>
                                            <Select
                                                value={district}
                                                onValueChange={(v) => { setDistrict(v); setSubDistrict(""); setVillageCity(""); }}
                                                disabled={!state || districts.length === 0 || locationsLoading}
                                            >
                                                <SelectTrigger id="district">
                                                    <SelectValue placeholder={
                                                        locationsLoading ? "Loading..." :
                                                        !state ? "Select state first" :
                                                        districts.length === 0 ? "No districts" :
                                                        "Select district"
                                                    } />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {districts.map(d => (
                                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Sub-District Dropdown */}
                                        <div className="space-y-2">
                                            <Label htmlFor="subDistrict">Sub-District</Label>
                                            <Select
                                                value={subDistrict}
                                                onValueChange={(v) => { setSubDistrict(v); setVillageCity(""); }}
                                                disabled={!district || subDistricts.length === 0 || locationsLoading}
                                            >
                                                <SelectTrigger id="subDistrict">
                                                    <SelectValue placeholder={
                                                        locationsLoading ? "Loading..." :
                                                        !district ? "Select district first" :
                                                        subDistricts.length === 0 ? "No sub-districts" :
                                                        "Select sub-district"
                                                    } />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {subDistricts.map(sd => (
                                                        <SelectItem key={sd} value={sd}>{sd}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Village / City Dropdown */}
                                        <div className="space-y-2">
                                            <Label htmlFor="villageCity">Village / City</Label>
                                            <Select
                                                value={villageCity}
                                                onValueChange={setVillageCity}
                                                disabled={!subDistrict || villages.length === 0 || locationsLoading}
                                            >
                                                <SelectTrigger id="villageCity">
                                                    <SelectValue placeholder={
                                                        locationsLoading ? "Loading..." :
                                                        !subDistrict ? "Select sub-district first" :
                                                        villages.length === 0 ? "No villages" :
                                                        "Select village"
                                                    } />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {villages.map(v => (
                                                        <SelectItem key={v} value={v}>{v}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="surveyNumber">Survey Number</Label>
                                            <Input id="surveyNumber" value={surveyNumber} onChange={(e) => setSurveyNumber(e.target.value)} placeholder="e.g. 123/4" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="gatNumber">Gat Number</Label>
                                            <Input id="gatNumber" value={gatNumber} onChange={(e) => setGatNumber(e.target.value)} placeholder="e.g. 56" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="farmerLandmark">Landmark</Label>
                                        <Input id="farmerLandmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near temple / school / main road" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
