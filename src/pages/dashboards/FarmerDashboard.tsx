import { Sprout, Tractor, Store, CloudSun, Users, MapPin, ShoppingCart, FileText, ClipboardList } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfileId } from "@/lib/supabase-auth";
import { useCropListings } from "@/hooks/useCropListings";
import { useFarmerActiveContractsCount } from "@/hooks/useSupplyContracts";
import DashboardLayout from "@/components/DashboardLayout";

const FarmerDashboard = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then(setProfileId);
        }
    }, [user?.id]);

    const { data: listings } = useCropListings(
        profileId ? { farmer_id: profileId } : undefined,
        { enabled: !!profileId }
    );
    const activeListingsCount = listings?.filter(l => l.status === "available")?.length || 0;
    const { data: activeContractsCount } = useFarmerActiveContractsCount(profileId || "");

    const cards = [
        { icon: Sprout, title: "Crop Guidance", description: "Get soil-specific crop recommendations and seed selection", path: "/farmer/crop-guidance" },
        { icon: Store, title: "My Crop Listings", description: "List and manage your produce for direct sale", stat: activeListingsCount ? `${activeListingsCount} active` : undefined, path: "/farmer/my-listings" },
        { icon: Tractor, title: "Browse Equipment", description: "Find, rent, or buy agricultural tools and machinery", path: "/farmer/browse-equipment" },
        { icon: CloudSun, title: "Weather Alerts", description: "Check forecasts and farming alerts for your region", path: "/farmer/weather-alerts" },
        { icon: Users, title: "Farmer Groups", description: "Connect with nearby farmers in your area", path: "/farmer/groups" },
        { icon: MapPin, title: "Find Nearby Farmers", description: "Search for farmers near you using Gat or Survey Number", path: "/farmer/nearby" },
        { icon: ShoppingCart, title: "Purchase Requests", description: "View and manage purchase requests from restaurants & hotels", path: "/farmer/purchase-requests" },
        { icon: ClipboardList, title: "Hotel Crop Demands", description: "Fulfill specific crop requirements posted by local hotels", path: "/farmer/hotel-requests" },
        { icon: FileText, title: "My Contracts", description: "Manage long-term supply contracts with buyers", stat: activeContractsCount ? `${activeContractsCount} active` : undefined, path: "/farmer/contracts" },
        { icon: Store, title: "My Profile", description: "Update your farm details, soil type, and location", path: "/profile" },
    ];

    return (
        <DashboardLayout subtitle="Manage your farm, sell crops, rent equipment, and grow your profits.">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div
                        key={card.title}
                        onClick={() => navigate(card.path)}
                        className="group bg-card rounded-xl p-8 border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
                    >
                        <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                            <card.icon className="h-7 w-7 text-primary" />
                        </div>
                        <h3 className="font-display text-xl font-semibold text-foreground mb-2">{card.title}</h3>
                        <p className="text-muted-foreground">{card.description}</p>
                        {card.stat && (
                            <div className="absolute top-8 right-8 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
                                {card.stat}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
};

export default FarmerDashboard;
