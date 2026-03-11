import { UserButton, useUser } from "@clerk/clerk-react";
import { Tractor, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect, useState } from "react";
import { getProfileId } from "@/lib/supabase-auth";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useOwnerBookings, useEquipmentBookings } from "@/hooks/useEquipmentBookings";
import { useSupplyContracts } from "@/hooks/useSupplyContracts";
import { requestFirebaseToken, onMessageListener } from "@/lib/firebase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const roleLabels: Record<string, string> = {
    farmer: "Farmer",
    equipment_owner: "Equipment Owner",
    hotel_restaurant_manager: "Hotel / Restaurant",
};

const rolePaths: Record<string, string> = {
    farmer: "/farmer-dashboard",
    equipment_owner: "/equipment-dashboard",
    hotel_restaurant_manager: "/hotel-dashboard",
};

type DashboardLayoutProps = {
    children: React.ReactNode;
    subtitle: string;
};

const DashboardLayout = ({ children, subtitle }: DashboardLayoutProps) => {
    const { user } = useUser();
    const { role } = useUserRole();
    const navigate = useNavigate();

    const [profileId, setProfileId] = useState<string | null>(null);
    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    // Farmers: get pending purchase requests (incoming)
    const { data: cropRequests } = usePurchaseRequests(
        (role === "farmer" && profileId) ? { status: "pending" } : undefined
    );
    // Tool Owners: get pending equipment rentals (incoming)
    const { data: equipmentRequests } = useOwnerBookings(
        (role === "equipment_owner" && profileId) ? profileId : ""
    );
    // Hotels: get purchase history (outgoing) to check for accepted/rejected
    const { data: hotelPurchases } = usePurchaseRequests(
        (role === "hotel_restaurant_manager" && profileId) ? { buyer_id: profileId } : undefined
    );
    // Farmers: get rental history (outgoing)
    const { data: farmerRentals } = useEquipmentBookings(
        (role === "farmer" && profileId) ? { renter_id: profileId } : undefined
    );
    // Hotels: get incoming supply contracts (incoming)
    const { data: hotelContracts } = useSupplyContracts(
        (role === "hotel_restaurant_manager" && profileId) ? { buyer_id: profileId } : undefined
    );
    // Farmers: get outgoing supply contracts (outgoing) to check for active/cancelled
    const { data: farmerContracts } = useSupplyContracts(
        (role === "farmer" && profileId) ? { farmer_id: profileId } : undefined
    );

    const pendingCropRequests = cropRequests?.length || 0;
    const pendingEquipmentRequests = equipmentRequests?.filter((b: any) => b.status === "pending").length || 0;
    const historyHotelUpdates = hotelPurchases?.filter((r: any) => r.status === "accepted" || r.status === "rejected").length || 0;
    const historyFarmerUpdates = farmerRentals?.filter((r: any) => r.status === "confirmed" || r.status === "cancelled").length || 0;
    const pendingSupplyContracts = hotelContracts?.filter((c: any) => c.status === "pending").length || 0;
    const historyFarmerContracts = farmerContracts?.filter((c: any) => c.status === "active" || c.status === "cancelled").length || 0;

    const totalNotifications = role === "farmer"
        ? pendingCropRequests + historyFarmerUpdates + historyFarmerContracts
        : role === "equipment_owner"
            ? pendingEquipmentRequests
            : historyHotelUpdates + pendingSupplyContracts;

    const handleNotificationClick = () => {
        if (role === "farmer") navigate("/farmer/contracts"); // Or /farmer/purchase-requests based on what's pending, but default to contracts
        if (role === "equipment_owner") navigate("/equipment/rental-requests");
        if (role === "hotel_restaurant_manager") navigate("/hotel/contracts"); // Or /hotel/purchase-history
    };

    useEffect(() => {
        if (user) {
            requestFirebaseToken();

            const watchMessages = async () => {
                try {
                    const payload: any = await onMessageListener();
                    if (payload?.notification) {
                        toast.info(payload.notification.title || "New Notification", {
                            description: payload.notification.body
                        });
                    }
                    // Continue watching after one message
                    watchMessages();
                } catch (err) {
                    console.log('Firebase message watch failed:', err);
                }
            };
            watchMessages();
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-background">
            <nav className="border-b border-border bg-card">
                <div className="container mx-auto flex items-center justify-between h-16 px-4">
                    <Link to="/" className="flex items-center gap-2">
                        <Tractor className="h-7 w-7 text-primary" />
                        <span className="font-display text-xl font-bold text-foreground">
                            Farmer's Connect
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        {role && (
                            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" onClick={handleNotificationClick}>
                                <Bell className="h-5 w-5" />
                                {totalNotifications > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                                )}
                            </Button>
                        )}
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full hidden sm:inline">
                            {role ? roleLabels[role] || role : ""}
                        </span>
                        <span className="text-sm text-muted-foreground hidden sm:inline">
                            {user?.firstName || "User"}
                        </span>
                        <UserButton afterSignOutUrl="/" />
                    </div>
                </div>
            </nav>

            <main className="container mx-auto px-4 py-12">
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                    Welcome, {user?.firstName || "User"}
                </h1>
                <p className="text-muted-foreground mb-10">{subtitle}</p>
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
