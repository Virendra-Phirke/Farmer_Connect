import { Store, MapPin, ClipboardList, Truck, Receipt } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfileId } from "@/lib/supabase-auth";
import DashboardLayout from "@/components/DashboardLayout";

const HotelRestaurantDashboard = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then(setProfileId);
        }
    }, [user?.id]);

    const cards = [
        { icon: Store, title: "Browse Produce", description: "Find fresh crops from local farmers by location, crop type, and quantity", path: "/hotel/browse-produce" },
        { icon: ClipboardList, title: "My Crop Demands", description: "Post specific crop requirements for farmers to fulfill", path: "/hotel/my-requirements" },
        { icon: Truck, title: "Delivery Tracking", description: "Track your upcoming and past deliveries from farmers", path: "/hotel/delivery-tracking" },
        { icon: Receipt, title: "Billing Center", description: "View, print, and download all purchase and contract bills", path: "/hotel/billing" },
        { icon: MapPin, title: "My Profile", description: "Update your restaurant/hotel details and preferences", path: "/profile" },
    ];

    return (
        <DashboardLayout subtitle="Source fresh produce directly from local farmers and manage deliveries.">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div
                        key={card.title}
                        onClick={() => navigate(card.path)}
                        className="group bg-card rounded-xl p-8 border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
                    >
                        <div className="w-14 h-14 rounded-lg bg-orange-500/10 flex items-center justify-center mb-6 group-hover:bg-orange-500/20 transition-colors">
                            <card.icon className="h-7 w-7 text-orange-600" />
                        </div>
                        <h3 className="font-display text-xl font-semibold text-foreground mb-2">{card.title}</h3>
                        <p className="text-muted-foreground">{card.description}</p>
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
};

export default HotelRestaurantDashboard;
