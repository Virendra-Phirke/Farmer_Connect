import { UserButton, useUser } from "@clerk/clerk-react";
import { Tractor, Bell, ArrowLeft, Home } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect, useState } from "react";
import { getProfileId } from "@/lib/supabase-auth";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useOwnerBookings, useEquipmentBookings } from "@/hooks/useEquipmentBookings";
import { useSupplyContracts } from "@/hooks/useSupplyContracts";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { NotificationCenter } from "@/components/NotificationCenter";

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
    const location = useLocation();
    const notificationsInitializedRef = useRef(false);
    const hotelPurchasesRef = useRef<Record<string, string>>({});
    const farmerRentalsRef = useRef<Record<string, string>>({});
    const farmerContractsRef = useRef<Record<string, string>>({});
    const equipmentRequestsRef = useRef<Record<string, string>>({});

    // Check if we are on one of the main dashboard pages
    const isDashboardRoot = location.pathname.includes("-dashboard");

    const [profileId, setProfileId] = useState<string | null>(null);
    const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
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
    const pendingFarmerRentals = farmerRentals?.filter((r: any) => r.status === "pending" || r.status === "awaiting_confirmation").length || 0;
    const pendingSupplyContracts = hotelContracts?.filter((c: any) => c.status === "pending").length || 0;
    const pendingFarmerContracts = farmerContracts?.filter((c: any) => c.status === "pending").length || 0;

    // Only count PENDING notifications for the badge
    const totalNotifications = role === "farmer"
        ? pendingCropRequests + pendingFarmerRentals + pendingFarmerContracts
        : role === "equipment_owner"
            ? pendingEquipmentRequests
            : pendingSupplyContracts;

    useEffect(() => {
        if (!role || !profileId) return;

        const getSignature = (item: any) => `${item.status || "unknown"}|${item.payment_status || getEquipmentPaymentStatus(item) || "na"}`;

        if (role === "hotel_restaurant_manager") {
            const currentMap: Record<string, string> = {};
            (hotelPurchases || []).forEach((req: any) => {
                currentMap[req.id] = getSignature(req);
            });

            if (notificationsInitializedRef.current) {
                (hotelPurchases || []).forEach((req: any) => {
                    const prev = hotelPurchasesRef.current[req.id];
                    const curr = currentMap[req.id];
                    if (prev && prev !== curr) {
                        if (req.status === "accepted") {
                            toast.success("Your purchase request was accepted. Bill is now available in Purchase History.");
                        } else if (req.status === "rejected") {
                            toast.error("A purchase request was rejected by the seller.");
                        }
                        if (req.payment_status === "paid") {
                            toast.success("Payment received confirmation for one of your purchase requests.");
                        }
                    }
                });
            }

            hotelPurchasesRef.current = currentMap;
        }

        if (role === "farmer") {
            const rentalMap: Record<string, string> = {};
            (farmerRentals || []).forEach((booking: any) => {
                rentalMap[booking.id] = getSignature(booking);
            });

            if (notificationsInitializedRef.current) {
                (farmerRentals || []).forEach((booking: any) => {
                    const prev = farmerRentalsRef.current[booking.id];
                    const curr = rentalMap[booking.id];
                    if (prev && prev !== curr) {
                        if (booking.status === "confirmed") {
                            toast.success("Your equipment rental request was confirmed. Billing is available in Rental History and My Contracts.");
                        } else if (booking.status === "cancelled") {
                            toast.error("An equipment rental request was declined.");
                        }
                        if (getEquipmentPaymentStatus(booking) === "paid") {
                            toast.success("Rental payment marked as paid.");
                        }
                    }
                });
            }

            farmerRentalsRef.current = rentalMap;

            const contractMap: Record<string, string> = {};
            (farmerContracts || []).forEach((contract: any) => {
                contractMap[contract.id] = getSignature(contract);
            });

            if (notificationsInitializedRef.current) {
                (farmerContracts || []).forEach((contract: any) => {
                    const prev = farmerContractsRef.current[contract.id];
                    const curr = contractMap[contract.id];
                    if (prev && prev !== curr) {
                        if (contract.status === "active") {
                            toast.success("A supply contract was activated. Billing is available in My Contracts.");
                        } else if (contract.status === "cancelled") {
                            toast.error("A supply contract was cancelled.");
                        }
                        if (contract.payment_status === "paid") {
                            toast.success("A supply contract payment was marked as paid.");
                        }
                    }
                });
            }

            farmerContractsRef.current = contractMap;
        }

        if (role === "equipment_owner") {
            const bookingMap: Record<string, string> = {};
            (equipmentRequests || []).forEach((booking: any) => {
                bookingMap[booking.id] = getSignature(booking);
            });

            if (notificationsInitializedRef.current) {
                (equipmentRequests || []).forEach((booking: any) => {
                    const prev = equipmentRequestsRef.current[booking.id];
                    const curr = bookingMap[booking.id];
                    if (prev && prev !== curr) {
                        if (booking.status === "pending") {
                            toast.info("New equipment rental request received.");
                        }
                        if (getEquipmentPaymentStatus(booking) === "paid") {
                            toast.success("Rental payment received and marked as paid.");
                        }
                    }
                });
            }

            equipmentRequestsRef.current = bookingMap;
        }

        if (!notificationsInitializedRef.current) {
            notificationsInitializedRef.current = true;
        }
    }, [
        role,
        profileId,
        hotelPurchases,
        farmerRentals,
        farmerContracts,
        equipmentRequests,
    ]);

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
                            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" onClick={() => setNotificationCenterOpen(true)}>
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

            <main className="container mx-auto px-4 py-8">
                <div className="flex items-center gap-3 mb-6">
                    {!isDashboardRoot && (
                        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => navigate(role ? rolePaths[role] : "/")} className="text-muted-foreground">
                        <Home className="h-4 w-4 mr-2" /> Home
                    </Button>
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                    Welcome, {user?.firstName || "User"}
                </h1>
                <p className="text-muted-foreground mb-10">{subtitle}</p>
                {children}
            </main>

            <NotificationCenter open={notificationCenterOpen} onOpenChange={setNotificationCenterOpen} />
        </div>
    );
};

export default DashboardLayout;
