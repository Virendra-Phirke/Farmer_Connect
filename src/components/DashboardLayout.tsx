import { UserButton, useUser } from "@clerk/clerk-react";
import { Tractor, Bell, ArrowLeft, Home, Moon, Sun, ChevronRight } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect, useState } from "react";
import { getProfileId, getUserProfile, updateUserProfile } from "@/lib/supabase-auth";
import { usePurchaseRequests, useFarmerPurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useOwnerBookings, useEquipmentBookings } from "@/hooks/useEquipmentBookings";
import { useSupplyContracts } from "@/hooks/useSupplyContracts";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useTheme } from "@/hooks/useTheme";

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

type DashboardLayoutProps = {
    children: React.ReactNode;
    subtitle: string;
    hidePageActions?: boolean;
    hideWelcomeSection?: boolean;
};

const DashboardLayout = ({
    children,
    subtitle,
    hidePageActions = false,
    hideWelcomeSection = false,
}: DashboardLayoutProps) => {
    const { user } = useUser();
    const { role } = useUserRole();
    const navigate = useNavigate();
    const location = useLocation();
    const notificationsInitializedRef = useRef(false);
    const profilePhoneSyncInitializedRef = useRef(false);
    const hotelPurchasesRef = useRef<Record<string, string>>({});
    const farmerRentalsRef = useRef<Record<string, string>>({});
    const farmerContractsRef = useRef<Record<string, string>>({});
    const equipmentRequestsRef = useRef<Record<string, string>>({});
    const farmerCropRequestsRef = useRef<Record<string, string>>({});
    const notifiedReceiptKeysRef = useRef<Set<string>>(new Set());

    // Check if we are on one of the main dashboard pages
    const isDashboardRoot = location.pathname.includes("-dashboard");

    const [profileId, setProfileId] = useState<string | null>(null);
    const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const { isDark, toggleTheme } = useTheme();
    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    useEffect(() => {
        const syncProfilePhone = async () => {
            if (!user?.id || profilePhoneSyncInitializedRef.current) return;
            profilePhoneSyncInitializedRef.current = true;
            try {
                const clerkPhone = user.phoneNumbers?.[0]?.phoneNumber;
                if (!clerkPhone) return;
                const profile = await getUserProfile(user.id);
                if (!profile?.phone) {
                    await updateUserProfile(user.id, { phone: clerkPhone });
                }
            } catch (e) {
                console.warn("Could not auto-sync profile phone:", e);
            }
        };
        void syncProfilePhone();
    }, [user?.id, user?.phoneNumbers]);

    // Farmers: get pending purchase requests (incoming)
    const { data: cropRequests } = useFarmerPurchaseRequests(
        (role === "farmer" && profileId) ? profileId : "",
        { enabled: role === "farmer" && !!profileId, refetchInterval: 15000 }
    );
    // Tool Owners: get pending equipment rentals (incoming)
    const { data: equipmentRequests } = useOwnerBookings(
        (role === "equipment_owner" && profileId) ? profileId : "",
        { enabled: role === "equipment_owner" && !!profileId, refetchInterval: 15000 }
    );
    // Hotels: get purchase history (outgoing) to check for accepted/rejected
    const { data: hotelPurchases } = usePurchaseRequests(
        (role === "hotel_restaurant_manager" && profileId) ? { buyer_id: profileId } : undefined,
        { enabled: role === "hotel_restaurant_manager" && !!profileId, refetchInterval: 15000 }
    );
    // Farmers: get rental history (outgoing)
    const { data: farmerRentals } = useEquipmentBookings(
        (role === "farmer" && profileId) ? { renter_id: profileId } : undefined,
        { enabled: role === "farmer" && !!profileId, refetchInterval: 15000 }
    );
    // Hotels: get incoming supply contracts (incoming)
    const { data: hotelContracts } = useSupplyContracts(
        (role === "hotel_restaurant_manager" && profileId) ? { buyer_id: profileId } : undefined,
        { enabled: role === "hotel_restaurant_manager" && !!profileId, refetchInterval: 15000 }
    );
    // Farmers: get outgoing supply contracts (outgoing) to check for active/cancelled
    const { data: farmerContracts } = useSupplyContracts(
        (role === "farmer" && profileId) ? { farmer_id: profileId } : undefined,
        { enabled: role === "farmer" && !!profileId, refetchInterval: 15000 }
    );

    const pendingCropRequests = cropRequests?.filter((r: any) => r.status === "pending").length || 0;
    const pendingEquipmentRequests = equipmentRequests?.filter((b: any) => b.status === "pending").length || 0;
    const pendingFarmerRentals = farmerRentals?.filter((r: any) => r.status === "pending" || r.status === "awaiting_confirmation").length || 0;
    const pendingSupplyContracts = hotelContracts?.filter((c: any) => c.status === "pending").length || 0;
    const pendingFarmerContracts = farmerContracts?.filter((c: any) => c.status === "pending").length || 0;

    const pendingFarmerReceiptConfirmations =
        (cropRequests?.filter((request: any) => {
            const hasReceipt = !!parsePaymentReceiptReference(request);
            const isPaid = String(request?.payment_status || "").toLowerCase() === "paid";
            return hasReceipt && !isPaid;
        }).length || 0) +
        (farmerContracts?.filter((contract: any) => {
            const hasReceipt = !!parsePaymentReceiptReference(contract);
            const isPaid = String(contract?.payment_status || "").toLowerCase() === "paid";
            return hasReceipt && !isPaid;
        }).length || 0);

    const pendingEquipmentReceiptConfirmations =
        equipmentRequests?.filter((booking: any) => {
            const hasReceipt = !!parsePaymentReceiptReference(booking);
            const isPaid = getEquipmentPaymentStatus(booking) === "paid";
            return hasReceipt && !isPaid;
        }).length || 0;

    useEffect(() => {
        if (!role || !profileId) return;

        const getSignature = (item: any) => {
            const receiptRef = parsePaymentReceiptReference(item);
            return `${item.status || "unknown"}|${item.payment_status || getEquipmentPaymentStatus(item) || "na"}|receipt:${receiptRef}`;
        };

        const getReceiptFromSignature = (value: string | undefined) => String(value || "").split("|receipt:")[1] || "";
        const shouldNotifyReceipt = (scope: string, itemId: string, receiptRef: string) => {
            if (!receiptRef) return false;
            const key = `${scope}:${itemId}:${receiptRef}`;
            if (notifiedReceiptKeysRef.current.has(key)) return false;
            notifiedReceiptKeysRef.current.add(key);
            return true;
        };

        const notifyPurchaseReceipt = (request: any) => {
            const cropName = request?.crop_listing?.crop_name || "Crop";
            const qty = Number(request?.quantity_kg || 0);
            const amount = Number(request?.total_amount ?? (Number(request?.quantity_kg || 0) * Number(request?.offered_price || 0)));
            const requestRef = String(request?.billing_id || request?.id || "").slice(0, 8).toUpperCase();
            toast.info(`Payment receipt uploaded for purchase ${cropName}${qty > 0 ? ` (${qty} kg)` : ""}${amount > 0 ? `, amount Rs.${amount}` : ""}${requestRef ? ` [${requestRef}]` : ""}.`);
        };

        const notifyContractReceipt = (contract: any) => {
            const cropName = contract?.crop_name || "Contract crop";
            const qty = Number(contract?.quantity_kg_per_delivery || 0);
            const amount = Number(contract?.total_amount ?? (qty * Number(contract?.price_per_kg || 0)));
            const contractRef = String(contract?.billing_id || contract?.id || "").slice(0, 8).toUpperCase();
            toast.info(`Payment receipt uploaded for contract ${cropName}${qty > 0 ? ` (${qty} kg)` : ""}${amount > 0 ? `, amount Rs.${amount}` : ""}${contractRef ? ` [${contractRef}]` : ""}.`);
        };

        const notifyRentalReceipt = (booking: any) => {
            const equipmentName = booking?.equipment?.name || "Equipment rental";
            const amount = Number(booking?.total_price || 0);
            const bookingRef = String(booking?.billing_id || booking?.id || "").slice(0, 8).toUpperCase();
            toast.info(`Payment receipt uploaded for rental ${equipmentName}${amount > 0 ? `, amount Rs.${amount}` : ""}${bookingRef ? ` [${bookingRef}]` : ""}.`);
        };

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
            const cropRequestMap: Record<string, string> = {};
            (cropRequests || []).forEach((request: any) => {
                cropRequestMap[request.id] = getSignature(request);
            });

            if (!notificationsInitializedRef.current) {
                const pendingReceiptCount = (cropRequests || []).filter((request: any) => {
                    const receipt = parsePaymentReceiptReference(request);
                    const paid = String(request?.payment_status || "").toLowerCase() === "paid";
                    return !!receipt && !paid;
                }).length;
                if (pendingReceiptCount > 0) {
                    toast.info(`You have ${pendingReceiptCount} payment receipt${pendingReceiptCount > 1 ? "s" : ""} awaiting confirmation.`);
                }
            }

            (cropRequests || []).forEach((request: any) => {
                const receiptRef = parsePaymentReceiptReference(request);
                const paid = String(request?.payment_status || "").toLowerCase() === "paid";
                if (!paid && shouldNotifyReceipt("farmer-purchase", String(request?.id || ""), receiptRef)) {
                    notifyPurchaseReceipt(request);
                }
            });

            if (notificationsInitializedRef.current) {
                (cropRequests || []).forEach((request: any) => {
                    const prev = farmerCropRequestsRef.current[request.id];
                    const curr = cropRequestMap[request.id];
                    if (!prev && request.status === "pending") {
                        toast.info("New crop purchase request received.");
                    }
                    if (prev && prev !== curr) {
                        const prevReceipt = getReceiptFromSignature(prev);
                        const currReceipt = getReceiptFromSignature(curr);
                        if (!prevReceipt && currReceipt) {
                            // Detailed receipt toast is handled by shouldNotifyReceipt() block.
                        }
                        if (request.status === "accepted") {
                            toast.success("A purchase request was accepted and billing is available.");
                        } else if (request.status === "rejected") {
                            toast.error("A purchase request was rejected.");
                        }
                        if (request.payment_status === "paid") {
                            toast.success("Purchase payment was marked as paid.");
                        }
                    }
                });
            }

            farmerCropRequestsRef.current = cropRequestMap;

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

            if (!notificationsInitializedRef.current) {
                const pendingContractReceiptCount = (farmerContracts || []).filter((contract: any) => {
                    const receipt = parsePaymentReceiptReference(contract);
                    const paid = String(contract?.payment_status || "").toLowerCase() === "paid";
                    return !!receipt && !paid;
                }).length;
                if (pendingContractReceiptCount > 0) {
                    toast.info(`You have ${pendingContractReceiptCount} contract payment receipt${pendingContractReceiptCount > 1 ? "s" : ""} awaiting confirmation.`);
                }
            }

            (farmerContracts || []).forEach((contract: any) => {
                const receiptRef = parsePaymentReceiptReference(contract);
                const paid = String(contract?.payment_status || "").toLowerCase() === "paid";
                if (!paid && shouldNotifyReceipt("farmer-contract", String(contract?.id || ""), receiptRef)) {
                    notifyContractReceipt(contract);
                }
            });

            if (notificationsInitializedRef.current) {
                (farmerContracts || []).forEach((contract: any) => {
                    const prev = farmerContractsRef.current[contract.id];
                    const curr = contractMap[contract.id];
                    if (prev && prev !== curr) {
                        const prevReceipt = getReceiptFromSignature(prev);
                        const currReceipt = getReceiptFromSignature(curr);
                        if (!prevReceipt && currReceipt) {
                            // Detailed receipt toast is handled by shouldNotifyReceipt() block.
                        }
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

            if (!notificationsInitializedRef.current) {
                const pendingRentalReceiptCount = (equipmentRequests || []).filter((booking: any) => {
                    const receipt = parsePaymentReceiptReference(booking);
                    const paid = getEquipmentPaymentStatus(booking) === "paid";
                    return !!receipt && !paid;
                }).length;
                if (pendingRentalReceiptCount > 0) {
                    toast.info(`You have ${pendingRentalReceiptCount} rental payment receipt${pendingRentalReceiptCount > 1 ? "s" : ""} awaiting confirmation.`);
                }
            }

            (equipmentRequests || []).forEach((booking: any) => {
                const receiptRef = parsePaymentReceiptReference(booking);
                const paid = getEquipmentPaymentStatus(booking) === "paid";
                if (!paid && shouldNotifyReceipt("equipment-rental", String(booking?.id || ""), receiptRef)) {
                    notifyRentalReceipt(booking);
                }
            });

            if (notificationsInitializedRef.current) {
                (equipmentRequests || []).forEach((booking: any) => {
                    const prev = equipmentRequestsRef.current[booking.id];
                    const curr = bookingMap[booking.id];
                    if (prev && prev !== curr) {
                        const prevReceipt = getReceiptFromSignature(prev);
                        const currReceipt = getReceiptFromSignature(curr);
                        if (!prevReceipt && currReceipt) {
                            // Detailed receipt toast is handled by shouldNotifyReceipt() block.
                        }
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
        cropRequests,
        hotelPurchases,
        farmerRentals,
        farmerContracts,
        equipmentRequests,
    ]);

    return (
        <div className="min-h-screen bg-background">
            <nav className="border-b border-border bg-card">
                <div className="container mx-auto flex items-center justify-between h-16 px-4">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center gap-2">
                            <Tractor className="h-7 w-7 text-primary" />
                            <span className="font-display text-xl font-bold text-foreground">
                                Farmer's Connect
                            </span>
                        </Link>

                        {location.pathname !== '/' && (
                            <nav className="hidden md:flex items-center ml-3 space-x-1 text-sm text-muted-foreground mt-0.5">
                                {(() => {
                                    const pathSegments = location.pathname.split('/').filter(Boolean);
                                    const firstSegment = pathSegments[0];
                                    const shouldPrefixDashboard =
                                        !!rolePaths[role || ""] &&
                                        !isDashboardRoot &&
                                        firstSegment !== "farmer" &&
                                        firstSegment !== "equipment" &&
                                        firstSegment !== "hotel";

                                    return (
                                        <>
                                            {shouldPrefixDashboard && (
                                                <div className="flex items-center space-x-1">
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                                                    <Link to={rolePaths[role || ""]} className="hover:text-foreground transition-colors">
                                                        Dashboard
                                                    </Link>
                                                </div>
                                            )}

                                            {pathSegments.map((path, index, array) => {
                                    const isLast = index === array.length - 1;
                                    
                                    // Handle proper routing back to dashboards
                                    let to = `/${array.slice(0, index + 1).join('/')}`;
                                    if (index === 0) {
                                        if (path === 'farmer') to = '/farmer-dashboard';
                                        if (path === 'equipment') to = '/equipment-dashboard';
                                        if (path === 'hotel') to = '/hotel-dashboard';
                                    }
                                    
                                    let title = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
                                    if (title === 'Farmer') title = 'Dashboard';
                                    if (title === 'Equipment') title = 'Dashboard';
                                    if (title === 'Hotel') title = 'Dashboard';
                                    if (title === 'Farmer dashboard' || title === 'Equipment dashboard' || title === 'Hotel dashboard') title = 'Dashboard';
                                    
                                    return (
                                        <div key={path} className="flex items-center space-x-1">
                                            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                                            {isLast ? (
                                                <span className="font-medium text-foreground">{title}</span>
                                            ) : (
                                                <Link to={to} className="hover:text-foreground transition-colors">
                                                    {title}
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                                        </>
                                    );
                                })()}
                            </nav>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={toggleTheme}
                            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </Button>
                        {role && (
                            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" onClick={() => setNotificationCenterOpen(true)}>
                                <Bell className="h-5 w-5" />
                                {unreadNotificationCount > 0 && (
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
                {!hideWelcomeSection && (
                    <div className={isDashboardRoot ? "mb-10" : "mb-6"}>
                        {isDashboardRoot && (
                            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                                Welcome, {user?.firstName || "User"}
                            </h1>
                        )}
                        <p className={isDashboardRoot ? "text-muted-foreground" : "text-xl font-medium text-foreground"}>
                            {subtitle}
                        </p>
                    </div>
                )}
                {children}
            </main>

            <NotificationCenter
                open={notificationCenterOpen}
                onOpenChange={setNotificationCenterOpen}
                onUnreadCountChange={setUnreadNotificationCount}
            />
        </div>
    );
};

export default DashboardLayout;
