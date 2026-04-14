import { useState } from "react";
import { Farm } from "@/lib/api/farms";
import { useCreateFarm, useDeleteFarm, useUpdateFarm } from "@/hooks/useFarms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Plus, Loader2, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useIndianLocations } from "@/hooks/useIndianLocations";

interface FarmListProps {
    profileId: string;
    farms: Farm[];
    isLoading: boolean;
}

export const FarmsList = ({ profileId, farms, isLoading }: FarmListProps) => {
    const SOIL_TYPE_OPTIONS = ["Alluvial", "Black", "Clay", "Laterite", "Loamy", "Red", "Sandy"];
    const FARMING_TYPE_OPTIONS = ["Organic", "Traditional", "Mixed", "Natural", "Hydroponic", "Precision"];

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingFarm, setEditingFarm] = useState<Farm | null>(null);

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
    const updateMutation = useUpdateFarm();
    const deleteMutation = useDeleteFarm();

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

    const fillFormFromFarm = (farm: Farm) => {
        setFarmName(farm.farm_name || "");
        setFarmState(farm.state || "");
        setFarmDistrict(farm.district || "");
        setFarmSubDistrict(farm.taluka || "");
        setFarmVillageCity(farm.village_city || "");
        setFarmSurveyNumber(farm.survey_number || "");
        setFarmGatNumber(farm.gat_number || "");
        setFarmLandSize(farm.land_size_acres?.toString() || "");
        setFarmSoilType(farm.soil_type || "");
        setFarmFarmingType(farm.farming_type || "");
    };

    const handleAddFarm = async () => {
        if (!farmName.trim()) {
            toast.error("Farm name is required");
            return;
        }
        if (!farmState || !farmDistrict || !farmSubDistrict || !farmVillageCity) {
            toast.error("State, district, sub-district and village/city are required");
            return;
        }
        if (!farmSurveyNumber.trim() || !farmGatNumber.trim()) {
            toast.error("Survey number and gat number are required");
            return;
        }
        if (!farmLandSize.trim() || Number.isNaN(Number(farmLandSize)) || Number(farmLandSize) <= 0) {
            toast.error("Valid land size is required");
            return;
        }
        if (!farmSoilType || !farmFarmingType) {
            toast.error("Soil type and farming type are required");
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
                    village_city: farmVillageCity,
                    survey_number: farmSurveyNumber,
                    gat_number: farmGatNumber,
                    land_size_acres: parseFloat(farmLandSize),
                    soil_type: farmSoilType,
                    farming_type: farmFarmingType,
                },
            });
            toast.success("Farm added successfully");
            resetForm();
            setShowAddDialog(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to add farm");
        }
    };

    const handleStartEdit = (farm: Farm) => {
        setEditingFarm(farm);
        fillFormFromFarm(farm);
        setShowEditDialog(true);
    };

    const handleUpdateFarm = async () => {
        if (!editingFarm) return;

        if (!farmName.trim()) {
            toast.error("Farm name is required");
            return;
        }
        if (!farmState || !farmDistrict || !farmSubDistrict || !farmVillageCity) {
            toast.error("State, district, sub-district and village/city are required");
            return;
        }
        if (!farmSurveyNumber.trim() || !farmGatNumber.trim()) {
            toast.error("Survey number and gat number are required");
            return;
        }
        if (!farmLandSize.trim() || Number.isNaN(Number(farmLandSize)) || Number(farmLandSize) <= 0) {
            toast.error("Valid land size is required");
            return;
        }
        if (!farmSoilType || !farmFarmingType) {
            toast.error("Soil type and farming type are required");
            return;
        }

        try {
            await updateMutation.mutateAsync({
                farmId: editingFarm.id,
                updates: {
                    farm_name: farmName,
                    state: farmState,
                    district: farmDistrict,
                    taluka: farmSubDistrict,
                    village_city: farmVillageCity,
                    survey_number: farmSurveyNumber,
                    gat_number: farmGatNumber,
                    land_size_acres: parseFloat(farmLandSize),
                    soil_type: farmSoilType,
                    farming_type: farmFarmingType,
                },
            });

            toast.success("Farm updated successfully");
            setShowEditDialog(false);
            setEditingFarm(null);
            resetForm();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to update farm");
        }
    };

    const handleDeleteFarm = async (farmId: string) => {
        const confirmed = window.confirm("Delete this farm?");
        if (!confirmed) return;

        try {
            await deleteMutation.mutateAsync(farmId);
            toast.success("Farm deleted");
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to delete farm");
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
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                    {farms.map((farm) => (
                        <HoverCard key={farm.id} openDelay={120} closeDelay={120}>
                            <HoverCardTrigger asChild>
                                <div className="relative p-3 md:p-4 border rounded-lg hover:bg-accent cursor-default transition-colors">
                                    <div className="pr-14">
                                        <h3 className="font-semibold text-sm md:text-base text-wrap-safe leading-snug">{farm.farm_name}</h3>
                                        <p className="text-xs md:text-sm text-muted-foreground text-wrap-safe leading-snug">
                                            {farm.district}, {farm.state}
                                        </p>
                                    </div>
                                    <div className="absolute top-2 right-2 flex items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartEdit(farm);
                                            }}
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void handleDeleteFarm(farm.id);
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent align="start" className="w-80">
                                <div className="space-y-2">
                                    <p className="font-semibold">{farm.farm_name}</p>
                                    <div className="text-sm text-muted-foreground">
                                        <p>{farm.village_city || "-"}, {farm.taluka || "-"}</p>
                                        <p>{farm.district}, {farm.state}</p>
                                    </div>
                                    {!!farm.survey_number && <p className="text-sm">Survey: {farm.survey_number}</p>}
                                    {!!farm.gat_number && <p className="text-sm">Gat: {farm.gat_number}</p>}
                                    {!!farm.land_size_acres && <p className="text-sm">Land: {farm.land_size_acres} acres</p>}
                                    {!!farm.soil_type && <p className="text-sm">Soil: {farm.soil_type}</p>}
                                    {!!farm.farming_type && <p className="text-sm">Farming: {farm.farming_type}</p>}
                                </div>
                            </HoverCardContent>
                        </HoverCard>
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
                            <Label htmlFor="villageCity">Village / City <span className="text-red-500">*</span></Label>
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
                            <Label htmlFor="surveyNumber">Survey Number <span className="text-red-500">*</span></Label>
                            <Input
                                id="surveyNumber"
                                value={farmSurveyNumber}
                                onChange={(e) => setFarmSurveyNumber(e.target.value)}
                                placeholder="e.g. 123/4"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gatNumber">Gat Number <span className="text-red-500">*</span></Label>
                            <Input
                                id="gatNumber"
                                value={farmGatNumber}
                                onChange={(e) => setFarmGatNumber(e.target.value)}
                                placeholder="e.g. 56"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="landSize">Land Size (Acres) <span className="text-red-500">*</span></Label>
                            <Input
                                id="landSize"
                                type="number"
                                value={farmLandSize}
                                onChange={(e) => setFarmLandSize(e.target.value)}
                                placeholder="e.g. 5.5"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="soilType">Soil Type <span className="text-red-500">*</span></Label>
                            <Select value={farmSoilType} onValueChange={setFarmSoilType}>
                                <SelectTrigger id="soilType">
                                    <SelectValue placeholder="Select soil type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SOIL_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="farmingType">Farming Type <span className="text-red-500">*</span></Label>
                            <Select value={farmFarmingType} onValueChange={setFarmFarmingType}>
                                <SelectTrigger id="farmingType">
                                    <SelectValue placeholder="Select farming type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {FARMING_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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

            {/* Edit Farm Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Farm</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="editFarmName">Farm Name <span className="text-red-500">*</span></Label>
                            <Input
                                id="editFarmName"
                                value={farmName}
                                onChange={(e) => setFarmName(e.target.value)}
                                placeholder="e.g. North Field"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="editState">State <span className="text-red-500">*</span></Label>
                            <Select
                                value={farmState}
                                onValueChange={(v) => { setFarmState(v); setFarmDistrict(""); setFarmSubDistrict(""); setFarmVillageCity(""); }}
                                disabled={locationsLoading}
                            >
                                <SelectTrigger id="editState">
                                    <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {states.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="editDistrict">District <span className="text-red-500">*</span></Label>
                            <Select
                                value={farmDistrict}
                                onValueChange={(v) => { setFarmDistrict(v); setFarmSubDistrict(""); setFarmVillageCity(""); }}
                                disabled={!farmState || districts.length === 0 || locationsLoading}
                            >
                                <SelectTrigger id="editDistrict">
                                    <SelectValue placeholder="Select district" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {districts.map(d => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="editSubDistrict">Sub-District (Taluka) <span className="text-red-500">*</span></Label>
                            <Select
                                value={farmSubDistrict}
                                onValueChange={(v) => { setFarmSubDistrict(v); setFarmVillageCity(""); }}
                                disabled={!farmDistrict || subDistricts.length === 0 || locationsLoading}
                            >
                                <SelectTrigger id="editSubDistrict">
                                    <SelectValue placeholder="Select sub-district" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {subDistricts.map(sd => (
                                        <SelectItem key={sd} value={sd}>{sd}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="editVillageCity">Village / City <span className="text-red-500">*</span></Label>
                            <Select
                                value={farmVillageCity}
                                onValueChange={setFarmVillageCity}
                                disabled={!farmSubDistrict || villages.length === 0 || locationsLoading}
                            >
                                <SelectTrigger id="editVillageCity">
                                    <SelectValue placeholder="Select village" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {villages.map(v => (
                                        <SelectItem key={v} value={v}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="editSurveyNumber">Survey Number <span className="text-red-500">*</span></Label>
                            <Input id="editSurveyNumber" value={farmSurveyNumber} onChange={(e) => setFarmSurveyNumber(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="editGatNumber">Gat Number <span className="text-red-500">*</span></Label>
                            <Input id="editGatNumber" value={farmGatNumber} onChange={(e) => setFarmGatNumber(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="editLandSize">Land Size (Acres) <span className="text-red-500">*</span></Label>
                            <Input id="editLandSize" type="number" value={farmLandSize} onChange={(e) => setFarmLandSize(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="editSoilType">Soil Type <span className="text-red-500">*</span></Label>
                            <Select value={farmSoilType} onValueChange={setFarmSoilType}>
                                <SelectTrigger id="editSoilType">
                                    <SelectValue placeholder="Select soil type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SOIL_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="editFarmingType">Farming Type <span className="text-red-500">*</span></Label>
                            <Select value={farmFarmingType} onValueChange={setFarmFarmingType}>
                                <SelectTrigger id="editFarmingType">
                                    <SelectValue placeholder="Select farming type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {FARMING_TYPE_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={updateMutation.isPending}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateFarm} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
};
