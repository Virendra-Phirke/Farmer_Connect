import { useState } from "react";
import { UserProfile } from "@/lib/supabase-auth";
import { searchFarmersByLocationAndGat } from "@/lib/api/farmers";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, User, MapPin } from "lucide-react";
import { toast } from "sonner";

const FindNearbyFarmersPage = () => {
    const [district, setDistrict] = useState("");
    const [taluka, setTaluka] = useState("");
    const [villageCity, setVillageCity] = useState("");
    const [surveyNumber, setSurveyNumber] = useState("");
    const [gatNumber, setGatNumber] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<UserProfile[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!district && !taluka && !villageCity && !surveyNumber && !gatNumber) {
            toast.error("Please provide at least one search criteria.");
            return;
        }

        setIsLoading(true);
        setHasSearched(true);
        try {
            const data = await searchFarmersByLocationAndGat({
                district: district || undefined,
                taluka: taluka || undefined,
                villageCity: villageCity || undefined,
                surveyNumber: surveyNumber || undefined,
                gatNumber: gatNumber || undefined,
            });
            setResults(data);
        } catch (error: any) {
            toast.error(error.message || "Failed to search farmers.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setDistrict("");
        setTaluka("");
        setVillageCity("");
        setSurveyNumber("");
        setGatNumber("");
        setResults([]);
        setHasSearched(false);
    };

    return (
        <DashboardLayout subtitle="Find nearby farmers using location specifics and land records.">
            <div className="max-w-4xl mx-auto space-y-8">
                <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Search Criteria
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="space-y-2">
                            <Label htmlFor="district">District</Label>
                            <Input
                                id="district"
                                value={district}
                                onChange={(e) => setDistrict(e.target.value)}
                                placeholder="E.g. Pune"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="taluka">Taluka</Label>
                            <Input
                                id="taluka"
                                value={taluka}
                                onChange={(e) => setTaluka(e.target.value)}
                                placeholder="E.g. Haveli"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="villageCity">Village / City</Label>
                            <Input
                                id="villageCity"
                                value={villageCity}
                                onChange={(e) => setVillageCity(e.target.value)}
                                placeholder="E.g. Loni Kalbhor"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="surveyNumber">Survey Number</Label>
                            <Input
                                id="surveyNumber"
                                value={surveyNumber}
                                onChange={(e) => setSurveyNumber(e.target.value)}
                                placeholder="E.g. 123/4"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gatNumber">Gat Number</Label>
                            <Input
                                id="gatNumber"
                                value={gatNumber}
                                onChange={(e) => setGatNumber(e.target.value)}
                                placeholder="E.g. 56"
                            />
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {results.map((farmer) => (
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
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </DashboardLayout>
    );
};

export default FindNearbyFarmersPage;
