// Duplicate import removed
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { getProfileId } from "@/lib/supabase-auth";
import { useMyCropRequirements, useCreateCropRequirement, useUpdateCropRequirementStatus, useDeleteCropRequirement } from "@/hooks/useCropRequirements";
import { Loader2, Plus, CheckCircle, Trash2 } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";

export default function MyCropRequirementsPage() {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then(setProfileId);
        }
    }, [user?.id]);

    const { data: requirements, isLoading } = useMyCropRequirements(profileId || undefined);

    const createReq = useCreateCropRequirement();
    const updateStatus = useUpdateCropRequirementStatus();
    const deleteReq = useDeleteCropRequirement();

    const [isCreating, setIsCreating] = useState(false);
    const [newCropName, setNewCropName] = useState("");
    const [newQuantity, setNewQuantity] = useState("");
    const [newDate, setNewDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredRequirements = requirements?.filter(req =>
        req.crop_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreate = () => {
        if (!profileId || !newCropName || !newQuantity) return;
        createReq.mutate({
            hotel_id: profileId,
            crop_name: newCropName,
            quantity_kg: Number(newQuantity),
            required_by_date: newDate || undefined
        }, {
            onSuccess: () => {
                setIsCreating(false);
                setNewCropName("");
                setNewQuantity("");
                setNewDate("");
            }
        });
    };

    return (
        <DashboardLayout subtitle="Post the exact crops you need that farmers can fulfill">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-display font-semibold">My Crop Demands</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <SearchBar placeholder="Search your demands..." onSearch={setSearchQuery} />
                    <Button onClick={() => setIsCreating(true)} disabled={isCreating} className="whitespace-nowrap">
                        <Plus className="mr-2 h-4 w-4" /> Post New Demand
                    </Button>
                </div>
            </div>

            {isCreating && (
                <div className="bg-card border border-border rounded-xl p-6 mb-8 space-y-4">
                    <h3 className="font-semibold text-lg">Post New Crop Requirement</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">Crop Name *</label>
                            <Input value={newCropName} onChange={e => setNewCropName(e.target.value)} placeholder="e.g. Tomatoes" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Quantity Required (kg) *</label>
                            <Input type="number" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} placeholder="e.g. 50" />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Required By Date</label>
                            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={createReq.isPending || !newCropName || !newQuantity}>
                            {createReq.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Post Demand
                        </Button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : !filteredRequirements?.length ? (
                <div className="text-center p-12 bg-card rounded-xl border border-border text-muted-foreground">
                    {searchQuery ? "No demands match your search." : "You haven't posted any crop demands yet. Post one to let farmers know what you need."}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRequirements.map(req => (
                        <div key={req.id} className="bg-card border border-border rounded-xl p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold">{req.crop_name}</h3>
                                    <p className="text-2xl font-light text-primary">{req.quantity_kg} kg</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${req.status === 'open' ? 'bg-blue-500/10 text-blue-500' :
                                    req.status === 'fulfilled' ? 'bg-green-500/10 text-green-500' :
                                        'bg-red-500/10 text-red-500'
                                    }`}>
                                    {req.status.toUpperCase()}
                                </span>
                            </div>

                            <p className="text-sm text-muted-foreground mb-6">
                                Required By: {req.required_by_date ? new Date(req.required_by_date).toLocaleDateString() : 'No date specified'}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {req.status === 'open' && (
                                    <>
                                        <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => updateStatus.mutate({ id: req.id, status: 'fulfilled' })}>
                                            <CheckCircle className="mr-1 h-3 w-3" /> Mark Fulfilled
                                        </Button>
                                    </>
                                )}
                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 ml-auto" onClick={() => deleteReq.mutate(req.id)}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
