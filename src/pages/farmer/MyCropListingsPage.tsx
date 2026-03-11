import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useCropListings, useCreateCropListing, useDeleteCropListing } from "@/hooks/useCropListings";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Store } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";

const MyCropListingsPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: listings, isLoading } = useCropListings(profileId ? { farmer_id: profileId } : undefined);
    const createMutation = useCreateCropListing();
    const deleteMutation = useDeleteCropListing();

    const [cropName, setCropName] = useState("");
    const [quantity, setQuantity] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredListings = listings?.filter((item: any) =>
        item.crop_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreate = () => {
        if (!profileId || !cropName || !quantity || !price) {
            toast.error("Please fill all required fields");
            return;
        }
        createMutation.mutate(
            { farmer_id: profileId, crop_name: cropName, quantity_kg: parseFloat(quantity), price_per_kg: parseFloat(price), description, status: "available" },
            {
                onSuccess: () => { toast.success("Listing created!"); setShowCreate(false); setCropName(""); setQuantity(""); setPrice(""); setDescription(""); },
                onError: () => toast.error("Failed to create listing"),
            }
        );
    };

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id, {
            onSuccess: () => toast.success("Listing deleted"),
            onError: () => toast.error("Failed to delete"),
        });
    };

    return (
        <DashboardLayout subtitle="Manage your crop listings for direct sale.">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold">My Crop Listings</h2>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <SearchBar placeholder="Search your listings..." onSearch={setSearchQuery} />
                        <Button onClick={() => setShowCreate(true)} className="whitespace-nowrap"><Plus className="mr-2 h-4 w-4" /> New Listing</Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !filteredListings?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                        {searchQuery ? "No listings match your search." : "No crop listings yet. Click \"New Listing\" to add your first one."}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredListings.map((item: any) => (
                            <div key={item.id} className="bg-card rounded-xl border border-border p-6 relative">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Store className="h-5 w-5 text-primary" /></div>
                                    <div>
                                        <h3 className="font-semibold">{item.crop_name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === "available" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{item.status}</span>
                                    </div>
                                </div>
                                <p className="text-sm">Qty: <strong>{item.quantity_kg} kg</strong></p>
                                <p className="text-sm">Price: <strong>₹{item.price_per_kg}/kg</strong></p>
                                {item.description && <p className="text-sm text-muted-foreground mt-2">{item.description}</p>}
                                <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create Crop Listing</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Crop Name *</Label><Input value={cropName} onChange={e => setCropName(e.target.value)} placeholder="e.g. Wheat" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Quantity (kg) *</Label><Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                            <div className="space-y-2"><Label>Price per kg (₹) *</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} /></div>
                        </div>
                        <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details" /></div>
                        <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Listing
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default MyCropListingsPage;
