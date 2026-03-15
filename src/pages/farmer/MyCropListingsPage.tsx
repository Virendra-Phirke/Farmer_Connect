import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { getCropListings, createCropListing, deleteCropListing, updateCropListing } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Store, AlertCircle, Edit2 } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";

const MyCropListingsPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [listings, setListings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const [cropName, setCropName] = useState("");
    const [quantity, setQuantity] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Step 1: Get profileId from Clerk user
    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then((id) => {
                setProfileId(id);
            }).catch((err) => {
                console.error("Failed to get profileId:", err);
                setError("Could not load your farmer profile.");
                setIsLoading(false);
            });
        }
    }, [user?.id]);

    // Step 2: Fetch listings whenever profileId is available
    const fetchListings = async () => {
        if (!profileId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await getCropListings({ farmer_id: profileId });
            setListings(data || []);
        } catch (err: any) {
            console.error("Error fetching crop listings:", err);
            setError(err?.message || "Failed to load crop listings.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (profileId) {
            fetchListings();
        }
    }, [profileId]);

    const handleCreate = async () => {
        if (!profileId || !cropName || !quantity || !price) {
            toast.error("Please fill all required fields");
            return;
        }
        setIsSaving(true);
        try {
            await createCropListing({
                farmer_id: profileId,
                crop_name: cropName,
                quantity_kg: parseFloat(quantity),
                price_per_kg: parseFloat(price),
                description: description || null,
                status: "available",
                expected_harvest_date: null,
                image_url: null,
                location: null,
            });
            toast.success("Listing created!");
            setShowCreate(false);
            setCropName(""); setQuantity(""); setPrice(""); setDescription("");
            fetchListings(); // Refresh list
        } catch (err: any) {
            console.error("Create listing error:", err);
            toast.error(err?.message || "Failed to create listing");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        setIsDeleting(id);
        try {
            await deleteCropListing(id);
            toast.success("Listing deleted");
            setListings((prev) => prev.filter((item) => item.id !== id));
        } catch (err: any) {
            toast.error("Failed to delete listing");
        } finally {
            setIsDeleting(null);
        }
    };

    const handleEditClick = (item: any) => {
        setEditingId(item.id);
        setCropName(item.crop_name);
        setQuantity(String(item.quantity_kg));
        setPrice(String(item.price_per_kg));
        setDescription(item.description || "");
        setShowEdit(true);
    };

    const handleUpdate = async () => {
        if (!editingId || !cropName || !quantity || !price) {
            toast.error("Please fill all required fields");
            return;
        }
        setIsSaving(true);
        try {
            await updateCropListing(editingId, {
                crop_name: cropName,
                quantity_kg: parseFloat(quantity),
                price_per_kg: parseFloat(price),
                description: description || null,
            });
            toast.success("Listing updated!");
            setShowEdit(false);
            setEditingId(null);
            setCropName(""); setQuantity(""); setPrice(""); setDescription("");
            fetchListings(); // Refresh list
        } catch (err: any) {
            console.error("Update listing error:", err);
            toast.error(err?.message || "Failed to update listing");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredListings = listings.filter((item) =>
        item.crop_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderContent = () => {
        if (!profileId || isLoading) {
            return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
        }
        if (error) {
            return (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-8 text-center">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
                    <p className="text-destructive font-medium">{error}</p>
                    <Button variant="outline" className="mt-4" onClick={fetchListings}>Try Again</Button>
                </div>
            );
        }
        if (!filteredListings.length) {
            return (
                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                    {searchQuery ? "No listings match your search." : 'No crop listings yet. Click "New Listing" to add your first one.'}
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((item: any) => (
                    <div key={item.id} className="bg-card rounded-xl border border-border p-6 relative hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Store className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold">{item.crop_name}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === "available" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                    {item.status}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm">Qty: <strong>{item.quantity_kg} kg</strong></p>
                        <p className="text-sm">Price: <strong>₹{item.price_per_kg}/kg</strong></p>
                        {item.description && <p className="text-sm text-muted-foreground mt-2">{item.description}</p>}
                        <div className="absolute top-4 right-4 flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => handleEditClick(item)}
                                title="Edit listing"
                            >
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(item.id)}
                                disabled={isDeleting === item.id}
                                title="Delete listing"
                            >
                                {isDeleting === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <DashboardLayout subtitle="Manage your crop listings for direct sale.">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold">My Crop Listings</h2>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <SearchBar placeholder="Search your listings..." onSearch={setSearchQuery} />
                        <Button onClick={() => setShowCreate(true)} className="whitespace-nowrap">
                            <Plus className="mr-2 h-4 w-4" /> New Listing
                        </Button>
                    </div>
                </div>

                {renderContent()}
            </div>

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create Crop Listing</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Crop Name *</Label>
                            <Input value={cropName} onChange={e => setCropName(e.target.value)} placeholder="e.g. Wheat" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Quantity (kg) *</Label>
                                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 100" />
                            </div>
                            <div className="space-y-2">
                                <Label>Price per kg (₹) *</Label>
                                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 25" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description (optional)</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Any extra details..." />
                        </div>
                        <Button className="w-full" onClick={handleCreate} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Listing
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showEdit} onOpenChange={setShowEdit}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Crop Listing</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Crop Name *</Label>
                            <Input value={cropName} onChange={e => setCropName(e.target.value)} placeholder="e.g. Wheat" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Quantity (kg) *</Label>
                                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 100" />
                            </div>
                            <div className="space-y-2">
                                <Label>Price per kg (₹) *</Label>
                                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 25" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description (optional)</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Any extra details..." />
                        </div>
                        <Button className="w-full" onClick={handleUpdate} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update Listing
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default MyCropListingsPage;
