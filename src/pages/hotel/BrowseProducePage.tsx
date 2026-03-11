import { useState, useEffect } from "react";
import { useCropListings } from "@/hooks/useCropListings";
import { useCreatePurchaseRequest } from "@/hooks/usePurchaseRequests";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Store, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SearchBar } from "@/components/SearchBar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BrowseProducePage = () => {
    const { data: listings, isLoading } = useCropListings({ status: "available" });
    const createRequest = useCreatePurchaseRequest();

    const [searchQuery, setSearchQuery] = useState("");
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [favoriteFarmers, setFavoriteFarmers] = useState<string[]>([]);

    const [selectedCrop, setSelectedCrop] = useState<any | null>(null);
    const [requestQuantity, setRequestQuantity] = useState("");
    const [offeredPrice, setOfferedPrice] = useState("");
    const [message, setMessage] = useState("");

    // User profile id retrieval
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
        // Load favorites from local storage
        const savedFavorites = localStorage.getItem("favoriteFarmers");
        if (savedFavorites) {
            try {
                setFavoriteFarmers(JSON.parse(savedFavorites));
            } catch (e) {
                console.error("Could not parse favorites");
            }
        }
    }, []);

    const toggleFavorite = (farmerId: string) => {
        setFavoriteFarmers(prev => {
            const newFavorites = prev.includes(farmerId)
                ? prev.filter(id => id !== farmerId)
                : [...prev, farmerId];

            // Persist
            localStorage.setItem("favoriteFarmers", JSON.stringify(newFavorites));
            return newFavorites;
        });
    };

    // Filter listings based on search and optional favorites only toggle
    const filteredListings = listings?.filter((item: any) => {
        const matchesSearch = item.crop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.farmer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFavorites = showFavoritesOnly ? favoriteFarmers.includes(item.farmer_id) : true;

        return matchesSearch && matchesFavorites;
    });

    const handleSendRequest = () => {
        if (!profileId || !selectedCrop || !requestQuantity || !offeredPrice) {
            toast.error("Please fill in quantity and offered price.");
            return;
        }

        const qty = parseFloat(requestQuantity);
        const price = parseFloat(offeredPrice);

        if (qty <= 0 || price <= 0) {
            toast.error("Values must be greater than zero.");
            return;
        }
        if (qty > selectedCrop.quantity_kg) {
            toast.error(`Only ${selectedCrop.quantity_kg}kg available.`);
            return;
        }

        createRequest.mutate({
            crop_listing_id: selectedCrop.id,
            buyer_id: profileId,
            quantity_kg: qty,
            offered_price: price,
            request_type: "single",
            status: "pending",
            message: message || undefined
        }, {
            onSuccess: () => {
                toast.success("Purchase request sent to farmer!");
                setSelectedCrop(null);
                setRequestQuantity("");
                setOfferedPrice("");
                setMessage("");
            },
            onError: () => toast.error("Failed to send request")
        });
    };

    return (
        <DashboardLayout subtitle="Browse fresh produce from local farmers.">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold">Available Produce</h2>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                        <Button
                            variant={showFavoritesOnly ? "default" : "outline"}
                            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                            className="w-full sm:w-auto flex items-center gap-2"
                        >
                            <Heart className={`h-4 w-4 ${showFavoritesOnly ? "fill-white" : ""}`} />
                            {showFavoritesOnly ? "Show All" : "Favorites Only"}
                        </Button>
                        <SearchBar
                            placeholder="Search crops or farmers..."
                            onSearch={setSearchQuery}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !filteredListings?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                        {searchQuery || showFavoritesOnly
                            ? "No produce matches your current filters."
                            : "No produce available right now. Check back later!"}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredListings.map((item: any) => {
                            const isFavorite = favoriteFarmers.includes(item.farmer_id);

                            return (
                                <div key={item.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow relative">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                                <Store className="h-5 w-5 text-orange-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{item.crop_name}</h3>
                                                <span className="text-xs text-muted-foreground">{item.quantity_kg} kg available</span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => toggleFavorite(item.farmer_id)}
                                            className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                            title={isFavorite ? "Unfavorite Farmer" : "Favorite Farmer"}
                                        >
                                            <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                                            <span className="sr-only">Toggle favorite</span>
                                        </Button>
                                    </div>
                                    <p className="text-lg font-bold text-primary mb-2">₹{item.price_per_kg}/kg</p>
                                    {item.description && <p className="text-sm text-muted-foreground mb-4">{item.description}</p>}
                                    <Button className="w-full mt-auto" onClick={() => setSelectedCrop(item)}>Send Purchase Request</Button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Purchase Request Dialog */}
                <Dialog open={!!selectedCrop} onOpenChange={(open) => !open && setSelectedCrop(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Request to Buy {selectedCrop?.crop_name}</DialogTitle>
                            <DialogDescription>
                                Offer a price and specify how much you need. The farmer ({selectedCrop?.farmer?.full_name || "Unknown"}) will be able to accept or reject.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-md mb-2">
                                <div>
                                    <p className="font-semibold">Listed Price:</p>
                                    <p className="text-muted-foreground">₹{selectedCrop?.price_per_kg} / kg</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-right">Available:</p>
                                    <p className="text-muted-foreground">{selectedCrop?.quantity_kg} kg</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="quantity" className="text-right">Quantity (kg)</Label>
                                <Input id="quantity" type="number" min="1" max={selectedCrop?.quantity_kg} className="col-span-3" value={requestQuantity} onChange={e => setRequestQuantity(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="price" className="text-right">Your Offer (₹/kg)</Label>
                                <Input id="price" type="number" min="1" className="col-span-3" value={offeredPrice} onChange={e => setOfferedPrice(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="message" className="text-right">Message</Label>
                                <Input id="message" placeholder="Optional details..." className="col-span-3" value={message} onChange={e => setMessage(e.target.value)} />
                            </div>
                            {requestQuantity && offeredPrice && (
                                <div className="text-right text-sm text-muted-foreground mt-2">
                                    Total Offer: <span className="font-bold text-foreground">₹{(parseFloat(requestQuantity) * parseFloat(offeredPrice)) || 0}</span>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedCrop(null)}>Cancel</Button>
                            <Button onClick={handleSendRequest} disabled={createRequest.isPending || !requestQuantity || !offeredPrice}>
                                {createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Offer
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};

export default BrowseProducePage;
