import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getUserProfile } from "@/lib/supabase-auth";
import { getCropRecommendations } from "@/lib/api/crop-recommendations";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Sprout } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SearchBar } from "@/components/SearchBar";

const CropGuidancePage = () => {
    const { user } = useUser();
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [soilFilter, setSoilFilter] = useState<string>("");
    const [seasonFilter, setSeasonFilter] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        async function load() {
            setLoading(true);
            // Try to get user's soil type as default filter
            if (user?.id && !soilFilter) {
                const profile = await getUserProfile(user.id);
                if (profile?.soil_type) setSoilFilter(profile.soil_type);
            }
            const filters: any = {};
            if (soilFilter) filters.soil_type = soilFilter;
            if (seasonFilter) filters.season = seasonFilter;
            const data = await getCropRecommendations(filters);
            setRecommendations(data);
            setLoading(false);
        }
        load();
    }, [user?.id, soilFilter, seasonFilter]);

    // Filter recommendations by search query
    const filteredRecommendations = recommendations.filter((rec: any) =>
        rec.crop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.seed_variety?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <DashboardLayout subtitle="Personalized crop recommendations based on your soil type and season.">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex flex-wrap gap-4 flex-1">
                        <div className="space-y-1 min-w-[180px]">
                            <Label>Soil Type</Label>
                            <Select value={soilFilter} onValueChange={setSoilFilter}>
                                <SelectTrigger><SelectValue placeholder="All soils" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="loamy">Loamy</SelectItem>
                                    <SelectItem value="clay">Clay</SelectItem>
                                    <SelectItem value="sandy">Sandy</SelectItem>
                                    <SelectItem value="black">Black Soil</SelectItem>
                                    <SelectItem value="red">Red Soil</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1 min-w-[180px]">
                            <Label>Season</Label>
                            <Select value={seasonFilter} onValueChange={setSeasonFilter}>
                                <SelectTrigger><SelectValue placeholder="All seasons" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kharif">Kharif</SelectItem>
                                    <SelectItem value="rabi">Rabi</SelectItem>
                                    <SelectItem value="zaid">Zaid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <SearchBar 
                    placeholder="Search by crop name, variety, or notes..." 
                    onSearch={setSearchQuery} 
                />

                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : recommendations.length === 0 ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No recommendations found for the selected filters.</div>
                ) : !filteredRecommendations.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No crops match your search.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRecommendations.map((rec: any) => (
                            <div key={rec.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Sprout className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{rec.crop_name}</h3>
                                        <p className="text-xs text-muted-foreground capitalize">{rec.soil_type} · {rec.season}</p>
                                    </div>
                                </div>
                                {rec.seed_variety && <p className="text-sm mb-1"><span className="font-medium">Seed:</span> {rec.seed_variety}</p>}
                                {rec.fertilizer_info && <p className="text-sm mb-1"><span className="font-medium">Fertilizer:</span> {rec.fertilizer_info}</p>}
                                {rec.expected_yield && <p className="text-sm mb-1"><span className="font-medium">Yield:</span> {rec.expected_yield}</p>}
                                {rec.notes && <p className="text-sm text-muted-foreground mt-2">{rec.notes}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default CropGuidancePage;
