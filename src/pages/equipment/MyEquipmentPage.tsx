import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId, getUserProfile, updateUserProfile } from "@/lib/supabase-auth";
import { useEquipmentListings, useCreateEquipmentListing, useDeleteEquipmentListing, useUpdateEquipmentListing } from "@/hooks/useEquipmentListings";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Tractor, Edit2 } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";

const MyEquipmentPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: equipment, isLoading } = useEquipmentListings(
        profileId ? { owner_id: profileId } : undefined,
        { enabled: !!profileId }
    );
    const createMutation = useCreateEquipmentListing();
    const updateMutation = useUpdateEquipmentListing();
    const deleteMutation = useDeleteEquipmentListing();

    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [pricePerDay, setPricePerDay] = useState("");
    const [quantity, setQuantity] = useState("");
    const [location, setLocation] = useState("");
    const [description, setDescription] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const ensureSellerMobile = async () => {
        if (!user?.id) return false;

        const existing = await getUserProfile(user.id);
        if (existing?.phone) return true;

        const clerkPhone = user.phoneNumbers?.[0]?.phoneNumber;
        if (clerkPhone) {
            await updateUserProfile(user.id, { phone: clerkPhone });
            return true;
        }

        toast.error("Add your mobile number in Profile first to list equipment.");
        return false;
    };

    const filteredEquipment = equipment?.filter((item: any) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreate = async () => {
        if (!profileId || !name || !category || !pricePerDay || !location || !quantity) {
            toast.error("Please fill all required fields");
            return;
        }

        const hasMobile = await ensureSellerMobile();
        if (!hasMobile) return;

        createMutation.mutate(
            { owner_id: profileId, name, category, price_per_day: parseFloat(pricePerDay), location, description, quantity: parseInt(quantity), image_url: null },
            {
                onSuccess: () => { toast.success("Equipment listed!"); setShowCreate(false); setName(""); setCategory(""); setPricePerDay(""); setQuantity(""); setLocation(""); setDescription(""); },
                onError: () => toast.error("Failed to create listing"),
            }
        );
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setName(item.name);
        setCategory(item.category);
        setPricePerDay(item.price_per_day.toString());
        setQuantity(item.quantity?.toString() || "1");
        setLocation(item.location);
        setDescription(item.description || "");
        setShowEdit(true);
    };

    const handleUpdate = async () => {
        if (!editingItem || !name || !category || !pricePerDay || !location || !quantity) {
            toast.error("Please fill all required fields");
            return;
        }

        const hasMobile = await ensureSellerMobile();
        if (!hasMobile) return;

        const quantityNum = parseInt(quantity);
        updateMutation.mutate(
            { 
                id: editingItem.id, 
                updates: { 
                    name, 
                    category, 
                    price_per_day: parseFloat(pricePerDay), 
                    location, 
                    description, 
                    quantity: quantityNum 
                } 
            },
            {
                onSuccess: () => { 
                    toast.success("Equipment updated!"); 
                    setShowEdit(false); 
                    setEditingItem(null);
                    setName(""); 
                    setCategory(""); 
                    setPricePerDay(""); 
                    setQuantity(""); 
                    setLocation(""); 
                    setDescription(""); 
                },
                onError: () => toast.error("Failed to update listing"),
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
                        <Button
                            onClick={async () => {
                                const hasMobile = await ensureSellerMobile();
                                if (!hasMobile) return;
                                setShowCreate(true);
                                setName("");
                                setCategory("");
                                setPricePerDay("");
                                setQuantity("");
                                setLocation("");
                                setDescription("");
                            }}
                            className="whitespace-nowrap"
                        >
                            <Plus className="mr-2 h-4 w-4" /> List Equipment
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !filteredEquipment?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                        {searchQuery ? "No equipment matches your search." : "No equipment listed yet. Click \"List Equipment\" to add your first one."}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                        {filteredEquipment.map((item: any) => {
                            const isUnavailable = item.quantity === 0;
                            return (
                                <div key={item.id} className="bg-card rounded-xl border border-border p-3 md:p-6 relative">
                                    <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-accent/10 flex items-center justify-center"><Tractor className="h-4 w-4 md:h-5 md:w-5 text-accent" /></div>
                                        <div>
                                            <h3 className="font-semibold text-sm md:text-base leading-tight">{item.name}</h3>
                                            <span className="text-[11px] md:text-xs text-muted-foreground capitalize">{item.category}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs md:text-sm mb-1">₹{item.price_per_day}/day</p>
                                    <p className="text-xs md:text-sm text-muted-foreground mb-2 truncate">📍 {item.location}</p>
                                    <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm mb-1 md:mb-3">
                                        <span className={isUnavailable ? "text-red-500 font-semibold" : "text-green-600 font-semibold"}>{isUnavailable ? "Unavailable" : "Available"}</span>
                                        <span className="text-muted-foreground">• Qty: {item.quantity}</span>
                                    </div>
                                    <div className="absolute top-2 right-2 md:top-4 md:right-4 flex gap-1 md:gap-2">
                                        <Button variant="ghost" size="icon" className="text-primary" onClick={() => handleEdit(item)}><Edit2 className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(item.id, { onSuccess: () => toast.success("Deleted"), onError: () => toast.error("Failed") })}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader><DialogTitle>List New Equipment</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Equipment Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Deere Tractor" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Category *</Label><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Tractor" /></div>
                            <div className="space-y-2"><Label>Quantity *</Label><Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 5" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Price/Day (₹) *</Label><Input type="number" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)} /></div>
                            <div className="space-y-2"><Label>Location *</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City/District" /></div>
                        </div>
                        <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" /></div>
                        <Button className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
                            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} List Equipment
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={showEdit} onOpenChange={setShowEdit}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Equipment</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Equipment Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Deere Tractor" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Category *</Label><Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Tractor" /></div>
                            <div className="space-y-2"><Label>Quantity *</Label><Input type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 5" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Price/Day (₹) *</Label><Input type="number" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)} /></div>
                            <div className="space-y-2"><Label>Location *</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City/District" /></div>
                        </div>
                        <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" /></div>
                        {parseInt(quantity) === 0 && <p className="text-sm text-amber-600">⚠️ Equipment will be marked as unavailable</p>}
                        <Button className="w-full" onClick={handleUpdate} disabled={updateMutation.isPending}>
                            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update Equipment
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default MyEquipmentPage;
