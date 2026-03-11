import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useEquipmentListings, useCreateEquipmentListing, useDeleteEquipmentListing } from "@/hooks/useEquipmentListings";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Tractor } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";

const MyEquipmentPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: equipment, isLoading } = useEquipmentListings(profileId ? { owner_id: profileId } : undefined);
    const createMutation = useCreateEquipmentListing();
    const deleteMutation = useDeleteEquipmentListing();

    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [pricePerDay, setPricePerDay] = useState("");
    const [location, setLocation] = useState("");
    const [description, setDescription] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredEquipment = equipment?.filter((item: any) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreate = () => {
        if (!profileId || !name || !category || !pricePerDay || !location) {
            toast.error("Please fill all required fields");
            return;
        }
        createMutation.mutate(
            { owner_id: profileId, name, category, price_per_day: parseFloat(pricePerDay), location, description, is_available: true },
            {
                onSuccess: () => { toast.success("Equipment listed!"); setShowCreate(false); setName(""); setCategory(""); setPricePerDay(""); setLocation(""); setDescription(""); },
                onError: () => toast.error("Failed to create listing"),
            }
        );
    };

    return (
        <DashboardLayout subtitle="Manage your listed agricultural equipment.">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold">My Equipment</h2>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <SearchBar placeholder="Search equipment..." onSearch={setSearchQuery} />
                        <Button onClick={() => setShowCreate(true)} className="whitespace-nowrap"><Plus className="mr-2 h-4 w-4" /> List Equipment</Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !filteredEquipment?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                        {searchQuery ? "No equipment matches your search." : "No equipment listed yet. Click \"List Equipment\" to add your first one."}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEquipment.map((item: any) => (
                            <div key={item.id} className="bg-card rounded-xl border border-border p-6 relative">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"><Tractor className="h-5 w-5 text-accent" /></div>
                                    <div>
                                        <h3 className="font-semibold">{item.name}</h3>
                                        <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
                                    </div>
                                </div>
                                <p className="text-sm mb-1">₹{item.price_per_day}/day</p>
                                <p className="text-sm text-muted-foreground mb-2">📍 {item.location}</p>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className={item.is_available ? "text-green-600" : "text-red-500"}>{item.is_available ? "Available" : "Unavailable"}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-destructive" onClick={() => deleteMutation.mutate(item.id, { onSuccess: () => toast.success("Deleted"), onError: () => toast.error("Failed") })}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader><DialogTitle>List New Equipment</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Equipment Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Deere Tractor" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Category *</Label><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Tractor" /></div>
                            <div className="space-y-2"><Label>Price/Day (₹) *</Label><Input type="number" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)} /></div>
                        </div>
                        <div className="space-y-2"><Label>Location *</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City/District" /></div>
                        <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" /></div>
                        <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} List Equipment
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default MyEquipmentPage;
