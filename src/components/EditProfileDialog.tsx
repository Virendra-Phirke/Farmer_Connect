import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getUserProfile, updateUserProfile, getUserRole, UserProfile, UserRole } from "@/lib/supabase-auth";
import { Loader2 } from "lucide-react";

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
    const [landSize, setLandSize] = useState("");
    const [soilType, setSoilType] = useState("");
    const [locationName, setLocationName] = useState("");

    // New structured location/land fields 
    const [state, setState] = useState("Maharashtra");
    const [district, setDistrict] = useState("");
    const [taluka, setTaluka] = useState("");
    const [villageCity, setVillageCity] = useState("");
    const [surveyNumber, setSurveyNumber] = useState("");
    const [gatNumber, setGatNumber] = useState("");

    const [role, setRole] = useState<UserRole | null>(null);

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
                setLandSize(data.land_size_acres ? data.land_size_acres.toString() : "");
                setSoilType(data.soil_type || "");
                setLocationName(data.location || "");

                setState(data.state || "Maharashtra");
                setDistrict(data.district || "");
                setTaluka(data.taluka || "");
                setVillageCity(data.village_city || "");
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
            await updateUserProfile(user.id, {
                phone: phone || null,
                land_size_acres: landSize ? parseFloat(landSize) : null,
                soil_type: soilType || null,
                location: role !== "farmer" ? (locationName || null) : null,
                state: role === "farmer" ? state : null,
                district: role === "farmer" ? (district || null) : null,
                taluka: role === "farmer" ? (taluka || null) : null,
                village_city: role === "farmer" ? (villageCity || null) : null,
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
                    <DialogTitle>Edit Profile & Location</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="landSize">Land Size (Acres)</Label>
                                    <Input id="landSize" type="number" value={landSize} onChange={(e) => setLandSize(e.target.value)} placeholder="e.g. 5" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="soilType">Soil Type</Label>
                                    <Select value={soilType} onValueChange={setSoilType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select soil type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="loamy">Loamy</SelectItem>
                                            <SelectItem value="clay">Clay</SelectItem>
                                            <SelectItem value="sandy">Sandy</SelectItem>
                                            <SelectItem value="black">Black Soil</SelectItem>
                                            <SelectItem value="red">Red Soil</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {role !== "farmer" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="locationName">Location (Text)</Label>
                                        <Input id="locationName" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="City, State" />
                                    </div>
                                )}
                            </div>

                            {role === "farmer" && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="state">State</Label>
                                            <Input id="state" value={state} onChange={(e) => setState(e.target.value)} disabled placeholder="Maharashtra" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="district">District</Label>
                                            <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Pune" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="taluka">Taluka</Label>
                                            <Input id="taluka" value={taluka} onChange={(e) => setTaluka(e.target.value)} placeholder="e.g. Haveli" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="villageCity">Village / City</Label>
                                            <Input id="villageCity" value={villageCity} onChange={(e) => setVillageCity(e.target.value)} placeholder="e.g. Loni Kalbhor" />
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
