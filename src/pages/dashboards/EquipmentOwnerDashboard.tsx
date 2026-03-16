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
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {cards.map((card) => (
                    <div
                        key={card.title}
                        onClick={() => navigate(card.path)}
                        className="group bg-card rounded-lg sm:rounded-xl p-3 sm:p-5 md:p-8 border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer relative min-h-[148px] sm:min-h-[190px]"
                    >
                        <div className="w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg bg-accent/20 flex items-center justify-center mb-2 sm:mb-4 md:mb-6 group-hover:bg-accent/30 transition-colors">
                            <card.icon className="h-4 w-4 sm:h-6 sm:w-6 md:h-7 md:w-7 text-accent" />
                        </div>
                        <h3 className="font-display text-sm sm:text-lg md:text-xl font-semibold text-foreground mb-1 sm:mb-2 leading-snug">{card.title}</h3>
                        <p className="hidden sm:block text-xs md:text-sm text-muted-foreground">{card.description}</p>
                        {card.stat && (
                            <div className="absolute top-3 right-3 sm:top-5 sm:right-5 md:top-8 md:right-8 bg-accent/10 text-accent px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold">
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
