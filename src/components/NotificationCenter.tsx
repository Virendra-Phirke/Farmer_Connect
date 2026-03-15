import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, CalendarCheck, FileText, AlertCircle } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";
import { getProfileId } from "@/lib/supabase-auth";
import { useUser } from "@clerk/clerk-react";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useOwnerBookings, useEquipmentBookings } from "@/hooks/useEquipmentBookings";
import { useSupplyContracts } from "@/hooks/useSupplyContracts";
import { useNavigate } from "react-router-dom";

interface NotificationCenterProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const NotificationCenter = ({ open, onOpenChange }: NotificationCenterProps) => {
    const { user } = useUser();
    const { role } = useUserRole();
    const navigate = useNavigate();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    // Farmers: get pending purchase requests (incoming) - requests from hotels
    const { data: cropRequests, isLoading: cropRequestsLoading } = usePurchaseRequests(
        (role === "farmer" && profileId) ? { status: "pending", farmer_id: profileId } : undefined
    );
    
    // Tool Owners: get pending equipment rentals (incoming)
    const { data: equipmentRequests, isLoading: equipmentRequestsLoading } = useOwnerBookings(
        (role === "equipment_owner" && profileId) ? profileId : ""
    );

    // Hotels: get purchase requests
    const { data: hotelPurchases, isLoading: hotelPurchasesLoading } = usePurchaseRequests(
        (role === "hotel_restaurant_manager" && profileId) ? { buyer_id: profileId } : undefined
    );

    // Farmers: get rental history (outgoing)
    const { data: farmerRentals, isLoading: farmerRentalsLoading } = useEquipmentBookings(
        (role === "farmer" && profileId) ? { renter_id: profileId } : undefined
    );

    // Hotels: get incoming supply contracts (incoming)
    const { data: hotelContracts, isLoading: hotelContractsLoading } = useSupplyContracts(
        (role === "hotel_restaurant_manager" && profileId) ? { buyer_id: profileId } : undefined
    );

    // Farmers: get outgoing supply contracts
    const { data: farmerContracts, isLoading: farmerContractsLoading } = useSupplyContracts(
        (role === "farmer" && profileId) ? { farmer_id: profileId } : undefined
    );

    // Calculate pending and history for each role
    const isLoading = cropRequestsLoading || equipmentRequestsLoading || hotelPurchasesLoading || farmerRentalsLoading || hotelContractsLoading || farmerContractsLoading;

    const getPendingNotifications = () => {
        if (role === "farmer") {
            const pending = [
                ...(cropRequests || []),
                ...(farmerRentals?.filter((r: any) => r.status === "pending" || r.status === "awaiting_confirmation") || []),
                ...(farmerContracts?.filter((c: any) => c.status === "pending") || []),
            ];
            return pending;
        } else if (role === "equipment_owner") {
            return (equipmentRequests || []).filter((b: any) => b.status === "pending");
        } else if (role === "hotel_restaurant_manager") {
            const pending = [
                ...(hotelContracts?.filter((c: any) => c.status === "pending") || []),
            ];
            return pending;
        }
        return [];
    };

    const getHistoryNotifications = () => {
        if (role === "farmer") {
            const history = [
                ...(farmerRentals?.filter((r: any) => r.status === "confirmed" || r.status === "cancelled" || r.status === "completed") || []),
                ...(farmerContracts?.filter((c: any) => c.status === "active" || c.status === "cancelled" || c.status === "completed") || []),
            ];
            return history;
        } else if (role === "equipment_owner") {
            return (equipmentRequests || []).filter((b: any) => b.status !== "pending");
        } else if (role === "hotel_restaurant_manager") {
            const history = [
                ...(hotelPurchases?.filter((r: any) => r.status === "accepted" || r.status === "rejected") || []),
                ...(hotelContracts?.filter((c: any) => c.status === "active" || c.status === "cancelled" || c.status === "completed") || []),
            ];
            return history;
        }
        return [];
    };

    const pending = getPendingNotifications();
    const history = getHistoryNotifications();

    const getNotificationPath = (item: any, notificationType: string): string => {
        switch (notificationType) {
            case "crop":
                // Farmer receiving crop purchase request from hotel
                return "/farmer/purchase-requests";
            case "rental":
                // Farmer's equipment rental
                return "/farmer/rental-history";
            case "equipment":
                // Equipment owner's rental request
                return "/equipment/rental-requests";
            case "contract":
                // Supply contract
                return role === "farmer" ? "/farmer/contracts" : "/hotel/contracts";
            case "purchase":
                // Purchase request
                return role === "farmer" ? "/farmer/purchase-requests" : "/hotel/purchase-history";
            default:
                return "/";
        }
    };

    const NotificationItem = ({ item, type, onNavigate }: { item: any; type: "crop" | "rental" | "equipment" | "contract" | "purchase"; onNavigate: () => void }) => {
        const getStatusColor = (status: string) => {
            switch (status) {
                case "pending":
                case "awaiting_confirmation":
                    return "text-yellow-600 bg-yellow-50";
                case "confirmed":
                case "accepted":
                case "active":
                    return "text-green-600 bg-green-50";
                case "cancelled":
                case "rejected":
                    return "text-red-600 bg-red-50";
                default:
                    return "text-gray-600 bg-gray-50";
            }
        };

        const renderContent = () => {
            switch (type) {
                case "crop":
                    return (
                        <div className="flex items-start gap-3">
                            <ShoppingCart className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{item.crop_listing?.crop_name || "Crop"} Purchase Request</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {item.quantity_kg || item.required_quantity_kg} kg @ ₹{item.offered_price || item.price_per_kg}/kg
                                </p>
                                <p className="text-xs text-muted-foreground">Total: ₹{(item.quantity_kg || item.required_quantity_kg) * (item.offered_price || item.price_per_kg)}</p>
                                <p className="text-xs text-muted-foreground mt-1">From: {item.buyer?.full_name || item.hotel?.full_name || "Hotel"}</p>
                            </div>
                        </div>
                    );
                case "rental":
                    return (
                        <div className="flex items-start gap-3">
                            <CalendarCheck className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{item.equipment?.name || "Equipment"} Rental</p>
                                <p className="text-xs text-muted-foreground">{item.start_date} → {item.end_date}</p>
                                <p className="text-xs text-muted-foreground mt-1">₹{item.total_price}</p>
                            </div>
                        </div>
                    );
                case "equipment":
                    return (
                        <div className="flex items-start gap-3">
                            <CalendarCheck className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">Rental Request: {item.equipment?.name || "Equipment"}</p>
                                <p className="text-xs text-muted-foreground">Qty: {item.quantity || 1} unit{(item.quantity || 1) > 1 ? 's' : ''} @ ₹{item.equipment?.price_per_day || 0}/day</p>
                                <p className="text-xs text-muted-foreground">Total: ₹{item.total_price}</p>
                                <p className="text-xs text-muted-foreground mt-1">{item.start_date} → {item.end_date}</p>
                                <p className="text-xs text-muted-foreground mt-1">From: {item.renter?.full_name || "Unknown"}</p>
                            </div>
                        </div>
                    );
                case "contract":
                    return (
                        <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{item.crop_name || "Supply"} Contract</p>
                                <p className="text-xs text-muted-foreground">{item.quantity_kg_per_delivery} kg @ ₹{item.price_per_kg}/kg</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {item.farmer ? `From: ${item.farmer.full_name}` : item.buyer ? `To: ${item.buyer.full_name}` : ""}
                                </p>
                            </div>
                        </div>
                    );
                case "purchase":
                    return (
                        <div className="flex items-start gap-3">
                            <ShoppingCart className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">Purchase Request</p>
                                <p className="text-xs text-muted-foreground">₹{item.total_price}</p>
                                <p className="text-xs text-muted-foreground mt-1">Status: {item.status}</p>
                            </div>
                        </div>
                    );
                default:
                    return null;
            }
        };

        return (
            <div 
                className="bg-card rounded-lg border border-border p-4 space-y-2 cursor-pointer hover:bg-accent transition-colors"
                onClick={onNavigate}
            >
                {renderContent()}
                <div className="flex items-center justify-between pt-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(item.status)}`}>
                        {item.status?.charAt(0).toUpperCase() + item.status?.slice(1) || "Unknown"}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Notifications</SheetTitle>
                </SheetHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : pending.length === 0 && history.length === 0 ? (
                    <div className="mt-6 text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No notifications</p>
                    </div>
                ) : (
                    <Tabs defaultValue="pending" className="mt-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
                            <TabsTrigger value="history">History ({history.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending" className="space-y-3 mt-4">
                            {pending.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No pending notifications</div>
                            ) : (
                                pending.map((item: any) => {
                                    const notificationType = item.crop_listing ? "crop"
                                        : item.equipment ? (item.renter_id ? "rental" : "equipment")
                                        : item.crop_name ? "contract"
                                        : "purchase";
                                    return (
                                        <NotificationItem
                                            key={item.id}
                                            item={item}
                                            type={notificationType as any}
                                            onNavigate={() => {
                                                onOpenChange(false);
                                                navigate(getNotificationPath(item, notificationType));
                                            }}
                                        />
                                    );
                                })
                            )}
                        </TabsContent>

                        <TabsContent value="history" className="space-y-3 mt-4">
                            {history.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No history</div>
                            ) : (
                                history.map((item: any) => {
                                    const notificationType = item.crop_listing ? "crop"
                                        : item.equipment ? (item.renter_id ? "rental" : "equipment")
                                        : item.crop_name ? "contract"
                                        : "purchase";
                                    return (
                                        <NotificationItem
                                            key={item.id}
                                            item={item}
                                            type={notificationType as any}
                                            onNavigate={() => {
                                                onOpenChange(false);
                                                navigate(getNotificationPath(item, notificationType));
                                            }}
                                        />
                                    );
                                })
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </SheetContent>
        </Sheet>
    );
};

export default NotificationCenter;
