import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId, getUserProfile } from "@/lib/supabase-auth";
import { UserProfile } from "@/lib/supabase-auth";
import { searchFarmersByLocationAndGat } from "@/lib/api/farmers";
import { useIndianLocations } from "@/hooks/useIndianLocations";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from "@/components/PaginationControls";
import { Loader2, User, MapPin, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const FindNearbyFarmersPage = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    const [state, setState] = useState("");
    const [district, setDistrict] = useState("");
    const [subDistrict, setSubDistrict] = useState("");
    const [villageCity, setVillageCity] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<UserProfile[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const PAGE_SIZE = 8;

    // Load user's profile info
    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then((id) => {
                setProfileId(id);
                if (id) getUserProfile(id).then(setUserProfile);
            });
        }
    }, [user?.id]);

    // Use Indian Locations Hook
    const { states, districts, subDistricts, villages, isLoading: locationsLoading } = useIndianLocations(state, district, subDistrict);

    const handleSearch = async () => {
        if (!state || !district || !subDistrict) {
            toast.error("Please select state, district, and sub-district.");
            return;
        }

        setIsLoading(true);
        setHasSearched(true);
        try {
            const data = await searchFarmersByLocationAndGat({
                district: district || undefined,
                taluka: subDistrict || undefined,
                villageCity: villageCity || undefined,
            });

            // Filter to exclude current user
            const filtered = data.filter(farmer => farmer.id !== profileId);

            setResults(filtered);
            setCurrentPage(1);
            if (filtered.length === 0) {
                toast.info("No farmers found in this location.");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to search farmers.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setState("");
        setDistrict("");
        setSubDistrict("");
        setVillageCity("");
        setResults([]);
        setHasSearched(false);
        setCurrentPage(1);
    };

    const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const paginatedResults = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const handleContactFarmer = (farmer: UserProfile) => {
        if (!profileId || !farmer?.id) return;
        navigate(`/farmer/groups/direct?tab=chats&peer=${farmer.id}&name=${encodeURIComponent(farmer.full_name || "Farmer")}`);
    };

    return (
        <DashboardLayout subtitle="Find nearby farmers using location specifics and land records.">
            <div className="max-w-4xl mx-auto space-y-8">
                <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Search Criteria
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        {/* State Dropdown */}
                        <div className="space-y-2">
                            <Label htmlFor="state">State <span className="text-red-500">*</span></Label>
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
                            <Label htmlFor="district">District <span className="text-red-500">*</span></Label>
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

                        {/* Sub-District Dropdown */}
                        <div className="space-y-2">
                            <Label htmlFor="subDistrict">Sub-District <span className="text-red-500">*</span></Label>
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

                        {/* Village Dropdown */}
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

                    <div className="flex justify-end gap-3 flex-wrap">
                        <Button variant="outline" onClick={handleClear} disabled={isLoading}>
                            Clear Search
                        </Button>
                        <Button onClick={handleSearch} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Find Farmers
                        </Button>
                    </div>
                </section>

                {hasSearched && (
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold">
                            Search Results ({results.length})
                        </h3>

                        {isLoading ? (
                            <div className="flex justify-center p-10 bg-card rounded-xl border border-border">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-center p-10 bg-card rounded-xl border border-border text-muted-foreground">
                                No farmers found matching your criteria.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {paginatedResults.map((farmer) => (
                                    <div key={farmer.id} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3 transition-colors hover:border-primary/50">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary uppercase overflow-hidden">
                                                {farmer.avatar_url ? (
                                                    <img src={farmer.avatar_url} alt={farmer.full_name || "Farmer"} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="h-6 w-6" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{farmer.full_name || "Unknown Farmer"}</h4>
                                                <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                                                    {(farmer.village_city || farmer.taluka || farmer.district) ? (
                                                        <p>
                                                            {[farmer.village_city, farmer.taluka, farmer.district]
                                                                .filter(Boolean)
                                                                .join(", ")}
                                                        </p>
                                                    ) : (
                                                        <p>Location not specified</p>
                                                    )}
                                                    {(farmer.survey_number || farmer.gat_number) && (
                                                        <p className="text-xs font-medium text-foreground bg-accent/50 inline-block px-2 py-0.5 rounded mt-1">
                                                            {farmer.gat_number ? `Gat: ${farmer.gat_number}` : ''}
                                                            {farmer.gat_number && farmer.survey_number ? ' | ' : ''}
                                                            {farmer.survey_number ? `Survey: ${farmer.survey_number}` : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-sm pt-3 border-t">
                                            <span className="text-muted-foreground">Land Size:</span>
                                            <span className="font-medium">{farmer.land_size_acres ? `${farmer.land_size_acres} Acres` : '-'}</span>

                                            <span className="text-muted-foreground">Soil Type:</span>
                                            <span className="font-medium capitalize">{farmer.soil_type || '-'}</span>

                                            <span className="text-muted-foreground">Farming Type:</span>
                                            <span className="font-medium capitalize">{farmer.farming_type || '-'}</span>
                                        </div>

                                        <div className="pt-3">
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => handleContactFarmer(farmer)}
                                                disabled={false}
                                            >
                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                Contact Farmer
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                </div>
                                <PaginationControls
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                    totalItems={results.length}
                                    pageSize={PAGE_SIZE}
                                />
                            </div>
                        )}
                    </section>
                )}
            </div>
        </DashboardLayout>
    );
};

export default FindNearbyFarmersPage;
