import { useState } from "react";
import { Farm } from "@/lib/api/farms";
import { useCreateFarm } from "@/hooks/useFarms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useIndianLocations } from "@/hooks/useIndianLocations";

interface FarmListProps {
    profileId: string;
    farms: Farm[];
    isLoading: boolean;
}

export const FarmsList = ({ profileId, farms, isLoading }: FarmListProps) => {
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [farmName, setFarmName] = useState("");
    const [farmState, setFarmState] = useState("");
    const [farmDistrict, setFarmDistrict] = useState("");
    const [farmSubDistrict, setFarmSubDistrict] = useState("");
    const [farmVillageCity, setFarmVillageCity] = useState("");
    const [farmSurveyNumber, setFarmSurveyNumber] = useState("");
    const [farmGatNumber, setFarmGatNumber] = useState("");
    const [farmLandSize, setFarmLandSize] = useState("");
    const [farmSoilType, setFarmSoilType] = useState("");
    const [farmFarmingType, setFarmFarmingType] = useState("");

    const { states, districts, subDistricts, villages, isLoading: locationsLoading } = useIndianLocations(farmState, farmDistrict, farmSubDistrict);

    const createMutation = useCreateFarm();

    const resetForm = () => {
        setFarmName("");
        setFarmState("");
        setFarmDistrict("");
        setFarmSubDistrict("");
        setFarmVillageCity("");
        setFarmSurveyNumber("");
        setFarmGatNumber("");
        setFarmLandSize("");
        setFarmSoilType("");
        setFarmFarmingType("");
    };

    const handleAddFarm = async () => {
        if (!farmName.trim()) {
            toast.error("Farm name is required");
            return;
        }
        if (!farmState || !farmDistrict || !farmSubDistrict) {
            toast.error("State, district, and sub-district are required");
            return;
        }

        try {
            await createMutation.mutateAsync({
                profileId,
                farm: {
                    farm_name: farmName,
                    state: farmState,
                    district: farmDistrict,
                    taluka: farmSubDistrict,
                    village_city: farmVillageCity || undefined,
                    survey_number: farmSurveyNumber || undefined,
                    gat_number: farmGatNumber || undefined,
                    land_size_acres: farmLandSize ? parseFloat(farmLandSize) : undefined,
                    soil_type: farmSoilType || undefined,
                    farming_type: farmFarmingType || undefined,
                },
            });
            toast.success("Farm added successfully");
            resetForm();
            setShowAddDialog(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to add farm");
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">My Farms</h2>
                <Button onClick={() => setShowAddDialog(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Farm
                </Button>
            </div>

            {farms.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg">
                    No farms added yet. Click "Add Farm" to get started.
                </div>
            ) : (
                <div className="space-y-2">
                    {farms.map((farm) => (
                        <div
                            key={farm.id}
                            className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                            onClick={() => {
                                setSelectedFarm(farm);
                                setShowDetailModal(true);
                            }}
                            onMouseEnter={() => {
                                setSelectedFarm(farm);
                                setShowDetailModal(true);
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold">{farm.farm_name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {farm.district}, {farm.state}
                                    </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Farm Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add New Farm</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="farmName">Farm Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="farmName"
                                value={farmName}
                                onChange={(e) => setFarmName(e.target.value)}
                                placeholder="e.g. North Field, Mango Orchard"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="state">State <span className="text-red-500">*</span></Label>
                            <Select
                                value={farmState}
                                onValueChange={(v) => { setFarmState(v); setFarmDistrict(""); setFarmSubDistrict(""); setFarmVillageCity(""); }}
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

                        <div className="space-y-2">
                            <Label htmlFor="district">District <span className="text-red-500">*</span></Label>
                            <Select
                                value={farmDistrict}
                                onValueChange={(v) => { setFarmDistrict(v); setFarmSubDistrict(""); setFarmVillageCity(""); }}
                                disabled={!farmState || districts.length === 0 || locationsLoading}
                            >
                                <SelectTrigger id="district">
                                    <SelectValue placeholder={
                                        locationsLoading ? "Loading..." :
                                        !farmState ? "Select state first" :
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

                        <div className="space-y-2">
                            <Label htmlFor="subDistrict">Sub-District (Taluka) <span className="text-red-500">*</span></Label>
                            <Select
                                value={farmSubDistrict}
                                onValueChange={(v) => { setFarmSubDistrict(v); setFarmVillageCity(""); }}
                                disabled={!farmDistrict || subDistricts.length === 0 || locationsLoading}
                            >
                                <SelectTrigger id="subDistrict">
                                    <SelectValue placeholder={
                                        locationsLoading ? "Loading..." :
                                        !farmDistrict ? "Select district first" :
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

                        <div className="space-y-2">
                            <Label htmlFor="villageCity">Village / City</Label>
                            <Select
                                value={farmVillageCity}
                                onValueChange={setFarmVillageCity}
                                disabled={!farmSubDistrict || villages.length === 0 || locationsLoading}
                            >
                                <SelectTrigger id="villageCity">
                                    <SelectValue placeholder={
                                        locationsLoading ? "Loading..." :
                                        !farmSubDistrict ? "Select sub-district first" :
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

                        <div className="space-y-2">
                            <Label htmlFor="surveyNumber">Survey Number</Label>
                            <Input
                                id="surveyNumber"
                                value={farmSurveyNumber}
                                onChange={(e) => setFarmSurveyNumber(e.target.value)}
                                placeholder="e.g. 123/4"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gatNumber">Gat Number</Label>
                            <Input
                                id="gatNumber"
                                value={farmGatNumber}
                                onChange={(e) => setFarmGatNumber(e.target.value)}
                                placeholder="e.g. 56"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="landSize">Land Size (Acres)</Label>
                            <Input
                                id="landSize"
                                type="number"
                                value={farmLandSize}
                                onChange={(e) => setFarmLandSize(e.target.value)}
                                placeholder="e.g. 5.5"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="soilType">Soil Type</Label>
                            <Input
                                id="soilType"
                                value={farmSoilType}
                                onChange={(e) => setFarmSoilType(e.target.value)}
                                placeholder="e.g. Black soil, Clay"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="farmingType">Farming Type</Label>
                            <Input
                                id="farmingType"
                                value={farmFarmingType}
                                onChange={(e) => setFarmFarmingType(e.target.value)}
                                placeholder="e.g. Organic, Conventional"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={createMutation.isPending}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddFarm} disabled={createMutation.isPending}>
                            {createMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Add Farm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Farm Details Modal - Shows on hover/click */}
            {selectedFarm && (
                <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{selectedFarm.farm_name}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Location</p>
                                <p className="text-sm">{selectedFarm.village_city}, {selectedFarm.taluka}</p>
                                <p className="text-sm">{selectedFarm.district}, {selectedFarm.state}</p>
                            </div>

                            {selectedFarm.survey_number && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Survey Number</p>
                                    <p className="text-sm">{selectedFarm.survey_number}</p>
                                </div>
                            )}

                            {selectedFarm.gat_number && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Gat Number</p>
                                    <p className="text-sm">{selectedFarm.gat_number}</p>
                                </div>
                            )}

                            {selectedFarm.land_size_acres && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Land Size</p>
                                    <p className="text-sm">{selectedFarm.land_size_acres} acres</p>
                                </div>
                            )}

                            {selectedFarm.soil_type && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Soil Type</p>
                                    <p className="text-sm">{selectedFarm.soil_type}</p>
                                </div>
                            )}

                            {selectedFarm.farming_type && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Farming Type</p>
                                    <p className="text-sm">{selectedFarm.farming_type}</p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </section>
    );
};

// Simple ChevronRight icon
function ChevronRight({ className }: { className: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
    );
}
