import { Tractor, Store, Users, MapPin } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProfileId } from "@/lib/supabase-auth";
import { useEquipmentListings } from "@/hooks/useEquipmentListings";
import { useOwnerBookings } from "@/hooks/useEquipmentBookings";
import DashboardLayout from "@/components/DashboardLayout";

const EquipmentOwnerDashboard = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then(setProfileId);
        }
    }, [user?.id]);

    const { data: equipments } = useEquipmentListings(
        profileId ? { owner_id: profileId } : undefined,
        { enabled: !!profileId }
    );
    const activeEquipmentsCount = equipments?.filter(e => e.is_available)?.length || 0;

    const { data: bookings } = useOwnerBookings(profileId || "");
    const pendingBookings = bookings?.filter(b => b.status === "pending")?.length || 0;

    const cards = [
        { icon: Tractor, title: "My Equipment", description: "Manage your listed agricultural equipment", stat: activeEquipmentsCount ? `${activeEquipmentsCount} listed` : undefined, path: "/equipment/my-equipment" },
        { icon: Store, title: "Rental Requests", description: "View and respond to rental requests", stat: pendingBookings > 0 ? `${pendingBookings} new` : undefined, path: "/equipment/rental-requests" },
        { icon: Users, title: "My Renters", description: "Track active rentals and history", path: "/equipment/bookings" },
        { icon: MapPin, title: "My Profile", description: "Update your business and equipment details", path: "/profile" },
    ];

    return (
        <DashboardLayout subtitle="Manage your equipment listings and rental activity.">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div
                        key={card.title}
                        onClick={() => navigate(card.path)}
                        className="group bg-card rounded-xl p-8 border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer relative"
                    >
                        <div className="w-14 h-14 rounded-lg bg-accent/20 flex items-center justify-center mb-6 group-hover:bg-accent/30 transition-colors">
                            <card.icon className="h-7 w-7 text-accent" />
                        </div>
                        <h3 className="font-display text-xl font-semibold text-foreground mb-2">{card.title}</h3>
                        <p className="text-muted-foreground">{card.description}</p>
                        {card.stat && (
                            <div className="absolute top-8 right-8 bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-semibold">
                                {card.stat}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
};

export default EquipmentOwnerDashboard;
