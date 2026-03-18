import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShoppingCart, CalendarCheck, FileText, AlertCircle } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";
import { getProfileId } from "@/lib/supabase-auth";
import { useUser } from "@clerk/clerk-react";
import { usePurchaseRequests, useFarmerPurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useOwnerBookings, useEquipmentBookings } from "@/hooks/useEquipmentBookings";
import { useSupplyContracts } from "@/hooks/useSupplyContracts";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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
    const { data: cropRequests, isLoading: cropRequestsLoading } = useFarmerPurchaseRequests(
        (role === "farmer" && profileId) ? profileId : "",
        { enabled: role === "farmer" && !!profileId, refetchInterval: 15000 }
    );

    // Tool Owners: get pending equipment rentals (incoming)
    const { data: equipmentRequests, isLoading: equipmentRequestsLoading } = useOwnerBookings(
        (role === "equipment_owner" && profileId) ? profileId : "",
        { enabled: role === "equipment_owner" && !!profileId, refetchInterval: 15000 }
    );

    // Hotels: get purchase requests
    const { data: hotelPurchases, isLoading: hotelPurchasesLoading } = usePurchaseRequests(
        (role === "hotel_restaurant_manager" && profileId) ? { buyer_id: profileId } : undefined,
        { enabled: role === "hotel_restaurant_manager" && !!profileId, refetchInterval: 15000 }
    );

    // Farmers: get rental history (outgoing)
    const { data: farmerRentals, isLoading: farmerRentalsLoading } = useEquipmentBookings(
        (role === "farmer" && profileId) ? { renter_id: profileId } : undefined,
        { enabled: role === "farmer" && !!profileId, refetchInterval: 15000 }
    );

    // Hotels: get incoming supply contracts
    const { data: hotelContracts, isLoading: hotelContractsLoading } = useSupplyContracts(
        (role === "hotel_restaurant_manager" && profileId) ? { buyer_id: profileId } : undefined,
        { enabled: role === "hotel_restaurant_manager" && !!profileId, refetchInterval: 15000 }
    );

    // Farmers: get outgoing supply contracts
    const { data: farmerContracts, isLoading: farmerContractsLoading } = useSupplyContracts(
        (role === "farmer" && profileId) ? { farmer_id: profileId } : undefined,
        { enabled: role === "farmer" && !!profileId, refetchInterval: 15000 }
    );

    const isLoading = cropRequestsLoading || equipmentRequestsLoading || hotelPurchasesLoading || farmerRentalsLoading || hotelContractsLoading || farmerContractsLoading;

    const getPendingNotifications = () => {
        if (role === "farmer") {
            return [
                ...(cropRequests?.filter((r: any) => r.status === "pending") || []),
                ...(farmerRentals?.filter((r: any) => r.status === "pending" || r.status === "awaiting_confirmation") || []),
                ...(farmerContracts?.filter((c: any) => c.status === "pending") || []),
            ];
        } else if (role === "equipment_owner") {
            return (equipmentRequests || []).filter((b: any) => b.status === "pending");
        } else if (role === "hotel_restaurant_manager") {
            return [...(hotelContracts?.filter((c: any) => c.status === "pending") || [])];
        }
        return [];
    };

    const getHistoryNotifications = () => {
        if (role === "farmer") {
            return [
                ...(cropRequests?.filter((r: any) => r.status !== "pending") || []),
                ...(farmerRentals?.filter((r: any) => ["confirmed", "cancelled", "completed"].includes(r.status)) || []),
                ...(farmerContracts?.filter((c: any) => ["active", "cancelled", "completed"].includes(c.status)) || []),
            ];
        } else if (role === "equipment_owner") {
            return (equipmentRequests || []).filter((b: any) => b.status !== "pending");
        } else if (role === "hotel_restaurant_manager") {
            return [
                ...(hotelPurchases?.filter((r: any) => ["accepted", "rejected"].includes(r.status)) || []),
                ...(hotelContracts?.filter((c: any) => ["active", "cancelled", "completed"].includes(c.status)) || []),
            ];
        }
        return [];
    };

    const pending = getPendingNotifications();
    const history = getHistoryNotifications();

    const detectNotificationType = (item: any): "crop" | "rental" | "equipment" | "contract" | "purchase" => {
        if (item.crop_listing) return "crop";
        if (item.crop_name) return "contract";
        if (item.equipment) return role === "equipment_owner" ? "equipment" : "rental";
        return "purchase";
    };

    const getNotificationPath = (item: any, notificationType: string): string => {
        switch (notificationType) {
            case "crop": return "/farmer/purchase-requests";
            case "rental": return "/farmer/rental-history";
            case "equipment": return "/equipment/rental-requests";
            case "contract": return role === "farmer" ? "/farmer/contracts" : "/hotel/contracts";
            case "purchase": return role === "farmer" ? "/farmer/purchase-requests" : "/hotel/purchase-history";
            default: return "/";
        }
    };

    const NotificationItem = ({
        item,
        type,
        onNavigate,
    }: {
        item: any;
        type: "crop" | "rental" | "equipment" | "contract" | "purchase";
        onNavigate: () => void;
    }) => {
        const getStatusColor = (status: string) => {
            switch (status) {
                case "pending":
                case "awaiting_confirmation":
                    return "text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/40";
                case "confirmed":
                case "accepted":
                case "active":
                    return "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/40";
                case "cancelled":
                case "rejected":
                    return "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/40";
                default:
                    return "text-muted-foreground bg-muted";
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
                                <p className="text-xs text-muted-foreground">
                                    Total: ₹{(item.quantity_kg || item.required_quantity_kg) * (item.offered_price || item.price_per_kg)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    From: {item.buyer?.full_name || item.hotel?.full_name || "Hotel"}
                                </p>
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
                                <p className="text-xs text-muted-foreground">
                                    Qty: {item.quantity || 1} unit{(item.quantity || 1) > 1 ? "s" : ""} @ ₹{item.equipment?.price_per_day || 0}/day
                                </p>
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
                                <p className="text-xs text-muted-foreground">
                                    {item.quantity_kg_per_delivery} kg @ ₹{item.price_per_kg}/kg
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {item.farmer ? `From: ${item.farmer.full_name}` : item.buyer ? `To: ${item.buyer.full_name}` : ""}
                                </p>
                            </div>
                        </div>
                    );
                case "purchase": {
                    const total = item.total_amount ?? item.total_price ?? ((item.quantity_kg || 0) * (item.offered_price || 0));
                    return (
                        <div className="flex items-start gap-3">
                            <ShoppingCart className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">Purchase Request</p>
                                <p className="text-xs text-muted-foreground">₹{total}</p>
                                <p className="text-xs text-muted-foreground mt-1">Status: {item.status}</p>
                            </div>
                        </div>
                    );
                }
                default:
                    return null;
            }
        };

        return (
            <div
                className={cn(
                    // Base
                    "rounded-lg border border-border p-4 space-y-2 cursor-pointer",
                    "bg-card text-card-foreground",
                    // Smooth transition
                    "transition-colors duration-150",
                    // Hover: uses theme-aware muted background + slightly more visible border
                    "hover:bg-muted/60 hover:border-border/80",
                    "dark:hover:bg-muted/30 dark:hover:border-border/60",
                    // Active press feedback
                    "active:scale-[0.99]"
                )}
                onClick={onNavigate}
            >
                {renderContent()}
                <div className="flex items-center justify-between pt-2">
                    <span className={cn("text-xs font-medium px-2 py-1 rounded-full", getStatusColor(item.status))}>
                        {item.status
                            ? item.status.charAt(0).toUpperCase() + item.status.slice(1).replace(/_/g, " ")
                            : "Unknown"}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            {/* 
              SheetContent is set to flex-col so we can give the tab content area
              a fixed height and let it scroll independently.
            */}
            <SheetContent className="w-full sm:max-w-md flex flex-col h-full overflow-hidden">
                <SheetHeader className="flex-shrink-0">
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
                    /* 
                      Tabs wrapper takes remaining height.
                      TabsContent panels get overflow-y-auto so only the list scrolls,
                      not the entire sheet — the tab bar stays pinned at the top.
                    */
                    <Tabs defaultValue="pending" className="mt-6 flex flex-col flex-1 min-h-0">
                        {/* Tab bar — never scrolls away */}
                        <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
                            <TabsTrigger value="history">History ({history.length})</TabsTrigger>
                        </TabsList>

                        {/* Pending tab — scrollable list */}
                        <TabsContent
                            value="pending"
                            className="flex-1 min-h-0 overflow-y-auto mt-4 pr-1 space-y-3
                                       scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                        >
                            {pending.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No pending notifications
                                </div>
                            ) : (
                                pending.map((item: any) => {
                                    const notificationType = detectNotificationType(item);
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

                        {/* History tab — scrollable list */}
                        <TabsContent
                            value="history"
                            className="flex-1 min-h-0 overflow-y-auto mt-4 pr-1 space-y-3
                                       scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                        >
                            {history.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No history
                                </div>
                            ) : (
                                history.map((item: any) => {
                                    const notificationType = detectNotificationType(item);
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