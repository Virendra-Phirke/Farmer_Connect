import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useOwnerBookings, useUpdateEquipmentBooking } from "@/hooks/useEquipmentBookings";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarCheck, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RentalRequestsPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: bookings, isLoading } = useOwnerBookings(profileId || "");
    const updateMutation = useUpdateEquipmentBooking();

    const pendingBookings = bookings?.filter((b: any) => b.status === "pending") || [];
    const historyBookings = bookings?.filter((b: any) => b.status !== "pending") || [];

    return (
        <DashboardLayout subtitle="View and respond to rental requests for your equipment.">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><CalendarCheck className="h-6 w-6" /> Rental Requests</h2>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <Tabs defaultValue="pending" className="w-full">
                        <TabsList className="mb-6 grid w-full grid-cols-2 md:w-[400px]">
                            <TabsTrigger value="pending">Pending ({pendingBookings.length})</TabsTrigger>
                            <TabsTrigger value="history">History ({historyBookings.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending">
                            {!pendingBookings.length ? (
                                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No pending rental requests.</div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingBookings.map((booking: any) => (
                                        <div key={booking.id} className="bg-card rounded-xl border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <p className="font-semibold">{booking.start_date} → {booking.end_date}</p>
                                                <p className="text-sm text-muted-foreground">Total: ₹{booking.total_price}</p>
                                                {booking.notes && <p className="text-sm mt-1">{booking.notes}</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => updateMutation.mutate({ id: booking.id, updates: { status: "confirmed" } }, { onSuccess: () => toast.success("Confirmed!") })}><Check className="mr-1 h-4 w-4" /> Confirm</Button>
                                                <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: booking.id, updates: { status: "cancelled" } }, { onSuccess: () => toast.success("Cancelled") })}><X className="mr-1 h-4 w-4" /> Decline</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="history">
                            {!historyBookings.length ? (
                                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No rental history found.</div>
                            ) : (
                                <div className="space-y-4">
                                    {historyBookings.map((booking: any) => (
                                        <div key={booking.id} className="bg-card border border-border p-6 flex justify-between gap-4 opacity-75">
                                            <div>
                                                <p className="font-semibold">{booking.start_date} → {booking.end_date}</p>
                                                <p className="text-sm text-muted-foreground">Total: ₹{booking.total_price}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {booking.status === "confirmed" && <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Confirmed</span>}
                                                {booking.status === "cancelled" && <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-sm font-medium"><X className="h-4 w-4" /> Declined</span>}
                                                {booking.status === "completed" && <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Completed</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </DashboardLayout>
    );
};

export default RentalRequestsPage;
