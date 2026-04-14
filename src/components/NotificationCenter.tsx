import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, CalendarCheck, FileText, AlertCircle, Receipt } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useEffect } from "react";
import { getProfileId } from "@/lib/supabase-auth";
import { useUser } from "@clerk/clerk-react";
import { usePurchaseRequests, useFarmerPurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useOwnerBookings, useEquipmentBookings } from "@/hooks/useEquipmentBookings";
import { useSupplyContracts } from "@/hooks/useSupplyContracts";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PAYMENT_RECEIPT_MARKER = "[payment_receipt_url]";

const parsePaymentReceiptReference = (record: any): string => {
    const direct = String(record?.payment_receipt_url || "").trim();
    if (direct) return direct;

    const text = `${String(record?.notes || "")}\n${String(record?.message || "")}`;
    const line = text
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith(PAYMENT_RECEIPT_MARKER));

    return line?.replace(PAYMENT_RECEIPT_MARKER, "").trim() || "";
};

type NotificationKind = "default" | "receipt";

type NotificationEntry = {
    id: string;
    item: any;
    type: "crop" | "rental" | "equipment" | "contract" | "purchase";
    kind: NotificationKind;
    createdAt?: string;
    rawStatus?: string;
};

interface NotificationCenterProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUnreadCountChange?: (count: number) => void;
}

export const NotificationCenter = ({ open, onOpenChange, onUnreadCountChange }: NotificationCenterProps) => {
    const { user } = useUser();
    const { role } = useUserRole();
    const navigate = useNavigate();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [hiddenNotificationIds, setHiddenNotificationIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem("fc_hidden_notifications");
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    useEffect(() => {
        localStorage.setItem("fc_hidden_notifications", JSON.stringify(hiddenNotificationIds));
    }, [hiddenNotificationIds]);

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

    const isRecentAndVisible = (entry: NotificationEntry) => {
        if (!entry) return false;
        
        // Hide if marked as read
        if (hiddenNotificationIds.includes(entry.id)) return false;
        
        // Hide if older than 24 hours
        if (entry.createdAt) {
            const dateStr = entry.createdAt;
            const hours = differenceInHours(new Date(), new Date(dateStr));
            if (hours >= 24) return false;
        }
        
        return true;
    };

    function detectNotificationType(item: any): "crop" | "rental" | "equipment" | "contract" | "purchase" {
        if (item.crop_listing) return "crop";
        if (item.crop_name) return "contract";
        if (item.equipment) return role === "equipment_owner" ? "equipment" : "rental";
        return "purchase";
    }

    const toDefaultEntry = (item: any): NotificationEntry => {
        const type = detectNotificationType(item);
        return {
            id: `${type}:${item.id}`,
            item,
            type,
            kind: "default",
            createdAt: item.created_at || item.updated_at,
            rawStatus: item.status,
        };
    };

    const toReceiptEntry = (item: any, type: NotificationEntry["type"]): NotificationEntry | null => {
        const receiptRef = parsePaymentReceiptReference(item);
        if (!receiptRef) return null;

        const paid = type === "equipment"
            ? getEquipmentPaymentStatus(item) === "paid"
            : item.payment_status === "paid";
        if (paid) return null;

        return {
            id: `${type}:${item.id}:receipt:${receiptRef}`,
            item,
            type,
            kind: "receipt",
            createdAt: item.updated_at || item.created_at,
            rawStatus: item.status,
        };
    };

    const getPendingNotifications = () => {
        let entries: NotificationEntry[] = [];
        if (role === "farmer") {
            entries = [
                ...(cropRequests?.filter((r: any) => r.status === "pending" || r.payment_status === "paid").map(toDefaultEntry) || []),
                ...(farmerRentals?.filter((r: any) => r.status === "pending" || r.status === "awaiting_confirmation" || r.payment_status === "paid").map(toDefaultEntry) || []),
                ...(farmerContracts?.filter((c: any) => c.status === "pending" || c.status === "active" || c.payment_status === "paid").map(toDefaultEntry) || []),
                ...(cropRequests?.map((r: any) => toReceiptEntry(r, "crop")).filter(Boolean) as NotificationEntry[] || []),
                ...(farmerContracts?.map((c: any) => toReceiptEntry(c, "contract")).filter(Boolean) as NotificationEntry[] || []),
            ];
        } else if (role === "equipment_owner") {
            entries = [
                ...(equipmentRequests || []).filter((b: any) => b.status === "pending" || b.payment_status === "paid").map(toDefaultEntry),
                ...((equipmentRequests || []).map((b: any) => toReceiptEntry(b, "equipment")).filter(Boolean) as NotificationEntry[]),
            ];
        } else if (role === "hotel_restaurant_manager") {
            entries = [
                ...(hotelContracts?.filter((c: any) => c.status === "pending" || c.status === "active" || c.payment_status === "paid").map(toDefaultEntry) || []),
                ...(hotelPurchases?.filter((r: any) => r.status === "accepted" || r.payment_status === "paid").map(toDefaultEntry) || []),
            ];
        }
        const uniqueEntries = Array.from(new Map(entries.map((entry) => [entry.id, entry])).values());
        return uniqueEntries.filter(isRecentAndVisible);
    };

    const getHistoryNotifications = () => {
        let entries: NotificationEntry[] = [];
        if (role === "farmer") {
            entries = [
                ...(cropRequests?.filter((r: any) => r.status !== "pending").map(toDefaultEntry) || []),
                ...(farmerRentals?.filter((r: any) => ["confirmed", "cancelled", "completed"].includes(r.status)).map(toDefaultEntry) || []),
                ...(farmerContracts?.filter((c: any) => ["active", "cancelled", "completed"].includes(c.status)).map(toDefaultEntry) || []),
            ];
        } else if (role === "equipment_owner") {
            entries = (equipmentRequests || []).filter((b: any) => b.status !== "pending").map(toDefaultEntry);
        } else if (role === "hotel_restaurant_manager") {
            entries = [
                ...(hotelPurchases?.filter((r: any) => ["accepted", "rejected"].includes(r.status)).map(toDefaultEntry) || []),
                ...(hotelContracts?.filter((c: any) => ["active", "cancelled", "completed"].includes(c.status)).map(toDefaultEntry) || []),
            ];
        }
        const uniqueEntries = Array.from(new Map(entries.map((entry) => [entry.id, entry])).values());
        return uniqueEntries.filter(isRecentAndVisible);
    };

    const pending = getPendingNotifications();
    const pendingIds = new Set(pending.map((i) => i.id));
    const history = getHistoryNotifications().filter(i => !pendingIds.has(i.id));

    useEffect(() => {
        onUnreadCountChange?.(pending.length + history.length);
    }, [pending.length, history.length, onUnreadCountChange]);

    const markNotificationAsRead = (id: string) => {
        setHiddenNotificationIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };

    const getNotificationPath = (entry: NotificationEntry): string => {
        const notificationType = entry.type;
        switch (notificationType) {
            case "crop": return "/farmer/purchase-requests";
            case "rental": return "/farmer/rental-history";
            case "equipment": return "/equipment/rental-requests";
            case "contract": return role === "farmer" ? "/farmer/contracts" : "/hotel/contracts";
            case "purchase": return role === "farmer" ? "/farmer/purchase-requests" : "/hotel/purchase-history";
            default: return "/";
        }
    };

    const getNotificationNavigateState = (entry: NotificationEntry) => {
        const item = entry.item;

        if (entry.kind !== "receipt") return undefined;

        if (entry.type === "crop") {
            return { openBillId: item.id, openBillSource: "purchase" };
        }
        if (entry.type === "contract") {
            return { openBillId: item.id, openBillSource: "supply" };
        }
        if (entry.type === "equipment") {
            return { openBillId: item.id, openBillSource: "rental-owner" };
        }

        return undefined;
    };

    const NotificationItem = ({
        entry,
        type,
        onNavigate,
    }: {
        entry: NotificationEntry;
        type: "crop" | "rental" | "equipment" | "contract" | "purchase";
        onNavigate: () => void;
    }) => {
        const { item } = entry;
        const handleMarkAsRead = (e: React.MouseEvent) => {
            e.stopPropagation();
            markNotificationAsRead(entry.id);
        };
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
                    if (entry.kind === "receipt") {
                        const total = Number(item.total_amount ?? ((item.quantity_kg || item.required_quantity_kg || 0) * (item.offered_price || item.price_per_kg || 0)));
                        return (
                            <div className="flex items-start gap-3">
                                <Receipt className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-600" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm">Payment Receipt Uploaded</p>
                                    <p className="text-xs text-muted-foreground mt-1">{item.crop_listing?.crop_name || "Crop"} purchase request</p>
                                    <p className="text-xs text-muted-foreground">₹{total.toLocaleString("en-IN")} · Tap to open bill</p>
                                </div>
                            </div>
                        );
                    }
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
                    const isPaidRental = item.payment_status === "paid";
                    return (
                        <div className="flex items-start gap-3">
                            <CalendarCheck className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isPaidRental ? "text-green-500" : "text-primary"}`} />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">
                                    {isPaidRental ? "Payment Received for Rental" : `${item.equipment?.name || "Equipment"} Rental`}
                                </p>
                                <p className="text-xs text-muted-foreground">{item.start_date} → {item.end_date}</p>
                                <p className="text-xs text-muted-foreground mt-1">₹{item.total_price}</p>
                            </div>
                        </div>
                    );
                case "equipment":
                    if (entry.kind === "receipt") {
                        return (
                            <div className="flex items-start gap-3">
                                <Receipt className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-600" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm">Payment Receipt Uploaded</p>
                                    <p className="text-xs text-muted-foreground mt-1">{item.equipment?.name || "Equipment"} rental</p>
                                    <p className="text-xs text-muted-foreground">₹{Number(item.total_price || 0).toLocaleString("en-IN")} · Tap to open bill</p>
                                </div>
                            </div>
                        );
                    }
                    const isPaidEq = item.payment_status === "paid";
                    return (
                        <div className="flex items-start gap-3">
                            <CalendarCheck className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isPaidEq ? "text-green-500" : "text-primary"}`} />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">
                                    {isPaidEq ? "Payment Confirmed for Equipment" : `Rental Request: ${item.equipment?.name || "Equipment"}`}
                                </p>
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
                    if (entry.kind === "receipt") {
                        const total = Number(item.total_amount ?? (Number(item.price_per_kg || 0) * Number(item.quantity_kg_per_delivery || 0)));
                        return (
                            <div className="flex items-start gap-3">
                                <Receipt className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-600" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm">Payment Receipt Uploaded</p>
                                    <p className="text-xs text-muted-foreground mt-1">{item.crop_name || "Supply"} contract</p>
                                    <p className="text-xs text-muted-foreground">₹{total.toLocaleString("en-IN")} · Tap to open bill</p>
                                </div>
                            </div>
                        );
                    }
                    const isPaidContract = item.payment_status === "paid";
                    const isAcceptedOffer = item.status === "active";
                    return (
                        <div className="flex items-start gap-3">
                            <FileText className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isPaidContract || isAcceptedOffer ? "text-green-500" : "text-primary"}`} />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">
                                    {isPaidContract ? "Payment Received!" : isAcceptedOffer ? "Offer Accepted!" : `${item.crop_name || "Supply"} Contract`}
                                </p>
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
                    const isPaidPurchase = item.payment_status === "paid";
                    return (
                        <div className="flex items-start gap-3">
                            <ShoppingCart className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isPaidPurchase ? "text-green-500" : "text-primary"}`} />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">
                                    {isPaidPurchase ? "Payment Confirmed!" : "Purchase Request"}
                                </p>
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
                        {entry.kind === "receipt"
                            ? "Receipt Uploaded"
                            : item.status
                                ? item.status.charAt(0).toUpperCase() + item.status.slice(1).replace(/_/g, " ")
                                : "Unknown"}
                    </span>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground/70">
                            {entry.createdAt ? formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true }) : ""}
                        </span>
                        <div 
                            role="button"
                            tabIndex={0}
                            onClick={handleMarkAsRead}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer group px-2 py-1 rounded-md hover:bg-muted"
                            title="Mark as read"
                        >
                            <Check className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                            <span>Read</span>
                        </div>
                    </div>
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
                    <div className="mt-6 space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="rounded-lg border border-border p-4 space-y-3 bg-card">
                                <div className="flex items-start gap-3">
                                    <Skeleton className="h-5 w-5 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-2/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-5 w-24 rounded-full" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                        ))}
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
                                    const notificationType = item.type;
                                    return (
                                        <NotificationItem
                                            key={item.id}
                                            entry={item}
                                            type={notificationType as any}
                                            onNavigate={() => {
                                                markNotificationAsRead(item.id);
                                                onOpenChange(false);
                                                navigate(getNotificationPath(item), { state: getNotificationNavigateState(item) });
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
                                    const notificationType = item.type;
                                    return (
                                        <NotificationItem
                                            key={item.id}
                                            entry={item}
                                            type={notificationType as any}
                                            onNavigate={() => {
                                                markNotificationAsRead(item.id);
                                                onOpenChange(false);
                                                navigate(getNotificationPath(item), { state: getNotificationNavigateState(item) });
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