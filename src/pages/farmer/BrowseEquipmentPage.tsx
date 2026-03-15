import { useState, useEffect } from "react";
import { useEquipmentListings } from "@/hooks/useEquipmentListings";
import { useCreateEquipmentBooking } from "@/hooks/useEquipmentBookings";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Tractor, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { differenceInDays, parseISO } from "date-fns";

const BrowseEquipmentPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then(setProfileId);
        }
    }, [user?.id]);

    const { data: equipment, isLoading } = useEquipmentListings();
    const createBooking = useCreateEquipmentBooking();

    // Filter out equipment with 0 quantity - show equipment even if previously rented until unavailable
    const availableEquipment = equipment?.filter((item: any) => item.quantity > 0) || [];

    const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [notes, setNotes] = useState("");
    const [quantity, setQuantity] = useState("1");

    const handleRequest = () => {
        if (!selectedEquipment || !startDate || !endDate || !profileId || !quantity) {
            toast.error("Please fill in all required fields");
            return;
        }

        const start = parseISO(startDate);
        const end = parseISO(endDate);
        const days = Math.max(0, differenceInDays(end, start)) + 1;
        const qty = parseInt(quantity);
        const totalPrice = days * selectedEquipment.price_per_day * qty;

        createBooking.mutate({
            equipment_id: selectedEquipment.id,
            renter_id: profileId,
            start_date: startDate,
            end_date: endDate,
            total_price: totalPrice,
            status: "pending",
            notes: notes,
            quantity: qty
        }, {
            onSuccess: () => {
                toast.success(`Rental request sent for ${selectedEquipment.name}`);
                setSelectedEquipment(null);
                setStartDate("");
                setEndDate("");
                setNotes("");
                setQuantity("1");
            },
            onError: (error: any) => {
                console.error("Equipment booking error:", error);
                toast.error(error?.message || "Failed to send rental request. Please try again.");
            }
        });
    };

    return (
        <DashboardLayout subtitle="Browse available agricultural equipment for rent.">
            <div className="space-y-6">
                <h2 className="text-xl font-bold">Available Equipment</h2>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !availableEquipment?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No equipment available right now. Check back later!</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availableEquipment.map((item: any) => {
                            const isLowStock = item.quantity <= 2;
                            return (
                            <div key={item.id} className={`bg-card rounded-xl border ${isLowStock ? 'border-orange-300' : 'border-border'} p-6 hover:shadow-md transition-shadow`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center"><Tractor className="h-5 w-5 text-accent" /></div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold">{item.name}</h3>
                                        <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
                                    </div>
                                    {item.quantity === 1 && <span className="bg-red-500/10 text-red-600 px-2 py-1 text-xs font-semibold rounded-full">Only 1 Left</span>}
                                    {item.quantity === 2 && <span className="bg-orange-500/10 text-orange-600 px-2 py-1 text-xs font-semibold rounded-full">Limited</span>}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2"><MapPin className="h-3 w-3" /> {item.location || "Not specified"}</div>
                                <p className="text-lg font-bold text-primary mb-2">₹{item.price_per_day}/day</p>
                                <p className={`text-sm mb-2 ${isLowStock ? 'text-orange-600 font-semibold' : 'text-muted-foreground'}`}>Available Units: <span className="font-semibold text-foreground">{item.quantity}</span></p>
                                {item.description && <p className="text-sm text-muted-foreground mb-4">{item.description}</p>}
                                <Button className="w-full" onClick={() => setSelectedEquipment(item)}>Request Rental</Button>
                            </div>
                            );
                        })}
                    </div>
                )}

                {/* Rental Request Dialog */}
                <Dialog open={!!selectedEquipment} onOpenChange={(open) => !open && setSelectedEquipment(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Request Rental for {selectedEquipment?.name}</DialogTitle>
                            <DialogDescription>
                                Enter the dates you would like to rent this equipment.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            {selectedEquipment?.quantity && (
                                <div className={`p-3 rounded-lg ${selectedEquipment.quantity <= 2 ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
                                    <p className={`text-sm font-semibold ${selectedEquipment.quantity <= 2 ? 'text-orange-700' : 'text-blue-700'}`}>
                                        Available: {selectedEquipment.quantity} unit{selectedEquipment.quantity > 1 ? 's' : ''}
                                    </p>
                                </div>
                            )}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="quantity" className="text-right">Quantity</Label>
                                <Input id="quantity" type="number" className="col-span-3" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" max={selectedEquipment?.quantity} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="start-date" className="text-right">Start Date</Label>
                                <Input id="start-date" type="date" className="col-span-3" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="end-date" className="text-right">End Date</Label>
                                <Input id="end-date" type="date" className="col-span-3" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="notes" className="text-right">Notes (Optional)</Label>
                                <Input id="notes" placeholder="Any special requirements..." className="col-span-3" value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                            {startDate && endDate && quantity && (
                                <div className="text-right text-sm text-muted-foreground mt-2">
                                    Estimated Cost: <span className="font-bold text-foreground">₹{Math.max(0, differenceInDays(parseISO(endDate), parseISO(startDate)) + 1) * (selectedEquipment?.price_per_day || 0) * parseInt(quantity)}</span>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedEquipment(null)}>Cancel</Button>
                            <Button onClick={handleRequest} disabled={createBooking.isPending || !startDate || !endDate || !quantity}>
                                {createBooking.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Request
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
};

export default BrowseEquipmentPage;
