import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useOwnerBookings } from "@/hooks/useEquipmentBookings";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, CalendarCheck } from "lucide-react";

const BookingCalendarPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: bookings, isLoading } = useOwnerBookings(profileId || "");
    const confirmedBookings = bookings?.filter((b: any) => b.status === "confirmed" || b.status === "completed") || [];

    return (
        <DashboardLayout subtitle="Track your active and completed equipment bookings.">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><CalendarCheck className="h-6 w-6" /> Booking Schedule</h2>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !confirmedBookings.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No confirmed bookings yet.</div>
                ) : (
                    <div className="space-y-4">
                        {confirmedBookings.map((booking: any) => (
                            <div key={booking.id} className="bg-card rounded-xl border border-border p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">📅 {booking.start_date} → {booking.end_date}</p>
                                        <p className="text-sm text-muted-foreground">Total: ₹{booking.total_price}</p>
                                        {booking.notes && <p className="text-sm mt-1">{booking.notes}</p>}
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${booking.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{booking.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default BookingCalendarPage;
