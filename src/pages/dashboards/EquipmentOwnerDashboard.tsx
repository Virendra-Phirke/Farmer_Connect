import {
    Tractor, Store, Users, MapPin, IndianRupee, TrendingUp,
    Package, Activity, ArrowUpRight, BarChart3, Calendar,
    Wrench, CheckCircle, Clock
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getProfileId } from "@/lib/supabase-auth";
import { useEquipmentListings } from "@/hooks/useEquipmentListings";
import { useOwnerBookings } from "@/hooks/useEquipmentBookings";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import DashboardLayout from "@/components/DashboardLayout";

const rupee = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

const EquipmentOwnerDashboard = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then(setProfileId);
        }
    }, [user?.id]);

    /* ── Data Hooks ─────────────────────────────────────────────────── */
    const { data: equipments } = useEquipmentListings(
        profileId ? { owner_id: profileId } : undefined,
        { enabled: !!profileId }
    );
    const { data: bookings } = useOwnerBookings(profileId || "", { enabled: !!profileId });

    /* ── Computed Analytics ──────────────────────────────────────────── */
    const analytics = useMemo(() => {
        const allEquipments = equipments || [];
        const allBookings = bookings || [];

        // Equipment stats
        const totalEquipment = allEquipments.length;
        const availableEquipment = allEquipments.filter((e: any) => e.is_available).length;
        const unavailableEquipment = totalEquipment - availableEquipment;

        // Booking stats
        const pendingBookings = allBookings.filter((b: any) => b.status === "pending").length;
        const confirmedBookings = allBookings.filter((b: any) => b.status === "confirmed").length;
        const completedBookings = allBookings.filter((b: any) => b.status === "completed").length;
        const cancelledBookings = allBookings.filter((b: any) => b.status === "cancelled").length;

        // Revenue
        const confirmedAndCompleted = allBookings.filter((b: any) => b.status === "confirmed" || b.status === "completed");
        const totalRevenue = confirmedAndCompleted.reduce((s: number, b: any) => s + (b.total_price || 0), 0);
        const paidRevenue = confirmedAndCompleted.filter((b: any) => getEquipmentPaymentStatus(b) === "paid")
            .reduce((s: number, b: any) => s + (b.total_price || 0), 0);
        const unpaidRevenue = totalRevenue - paidRevenue;

        // Category distribution
        const categoryMap: Record<string, { count: number; revenue: number; available: number }> = {};
        allEquipments.forEach((e: any) => {
            const cat = e.category || "Other";
            if (!categoryMap[cat]) categoryMap[cat] = { count: 0, revenue: 0, available: 0 };
            categoryMap[cat].count += 1;
            if (e.is_available) categoryMap[cat].available += 1;
        });
        confirmedAndCompleted.forEach((b: any) => {
            const cat = b.equipment?.category || "Other";
            if (!categoryMap[cat]) categoryMap[cat] = { count: 0, revenue: 0, available: 0 };
            categoryMap[cat].revenue += b.total_price || 0;
        });
        const categoryDistribution = Object.entries(categoryMap)
            .map(([name, d]) => ({ name, ...d }))
            .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
            .slice(0, 5);

        // Recent bookings
        const recentBookings = allBookings.slice(0, 4);

        return {
            totalEquipment,
            availableEquipment,
            unavailableEquipment,
            pendingBookings,
            confirmedBookings,
            completedBookings,
            cancelledBookings,
            totalBookings: allBookings.length,
            totalRevenue,
            paidRevenue,
            unpaidRevenue,
            categoryDistribution,
            recentBookings,
        };
    }, [equipments, bookings]);

    /* ── Quick Actions ──────────────────────────────────────────────── */
    const quickActions = [
        { icon: Tractor, title: "My Equipment", path: "/equipment/my-equipment", accent: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
        { icon: Clock, title: "Rental Requests", path: "/equipment/rental-requests", accent: "bg-amber-500/15 text-amber-600 dark:text-amber-400", badge: analytics.pendingBookings > 0 ? `${analytics.pendingBookings} new` : undefined },
        { icon: Calendar, title: "Booking Calendar", path: "/equipment/bookings", accent: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
        { icon: MapPin, title: "My Profile", path: "/profile", accent: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
    ];

    // Category bar chart
    const maxCatRevenue = Math.max(...analytics.categoryDistribution.map(c => c.revenue), 1);
    const barColors = [
        "bg-slate-500 dark:bg-slate-400",
        "bg-sky-500 dark:bg-sky-400",
        "bg-amber-500 dark:bg-amber-400",
        "bg-violet-500 dark:bg-violet-400",
        "bg-rose-500 dark:bg-rose-400",
    ];

    return (
        <DashboardLayout subtitle="Manage your equipment listings and rental activity.">
            {/* ── KPI Cards ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {/* Total Revenue */}
                <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-slate-500/10 blur-xl" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-500/15 flex items-center justify-center">
                            <IndianRupee className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{rupee(analytics.totalRevenue)}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-slate-500" />
                        <span className="text-[11px] text-muted-foreground">
                            Paid {rupee(analytics.paidRevenue)} • Due {rupee(analytics.unpaidRevenue)}
                        </span>
                    </div>
                </div>

                {/* Equipment Listed */}
                <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-sky-500/10 blur-xl" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
                            <Wrench className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Equipment</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.totalEquipment}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <ArrowUpRight className="h-3 w-3 text-sky-500" />
                        <span className="text-[11px] text-muted-foreground">
                            {analytics.availableEquipment} available • {analytics.unavailableEquipment} rented
                        </span>
                    </div>
                </div>

                {/* Active Bookings */}
                <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-violet-500/10 blur-xl" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bookings</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.confirmedBookings}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <Activity className="h-3 w-3 text-violet-500" />
                        <span className="text-[11px] text-muted-foreground">
                            {analytics.pendingBookings} pending • {analytics.completedBookings} done
                        </span>
                    </div>
                </div>

                {/* Total Rentals */}
                <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-amber-500/10 blur-xl" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                            <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Rentals</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.totalBookings}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <CheckCircle className="h-3 w-3 text-amber-500" />
                        <span className="text-[11px] text-muted-foreground">
                            {analytics.completedBookings} completed • {analytics.cancelledBookings} cancelled
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Analytics Panels ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                {/* Category Breakdown */}
                <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Equipment by Category</h3>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{analytics.totalEquipment} total</span>
                    </div>
                    {analytics.categoryDistribution.length > 0 ? (
                        <div className="space-y-3">
                            {analytics.categoryDistribution.map((cat, i) => (
                                <div key={cat.name}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <Tractor className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-sm font-medium text-foreground">{cat.name}</span>
                                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                                                {cat.count} item{cat.count !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                        <span className="text-xs font-semibold text-muted-foreground">{rupee(cat.revenue)}</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${barColors[i % barColors.length]} transition-all duration-700`}
                                            style={{ width: `${Math.max((cat.revenue / maxCatRevenue) * 100, 4)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                        {cat.available} available
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Tractor className="h-8 w-8 mb-2 opacity-40" />
                            <p className="text-sm">No equipment listed yet</p>
                            <button onClick={() => navigate("/equipment/my-equipment")} className="text-xs text-primary mt-1 hover:underline">
                                List your first equipment →
                            </button>
                        </div>
                    )}
                </div>

                {/* Recent Bookings */}
                <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Recent Bookings</h3>
                        </div>
                        <button onClick={() => navigate("/equipment/bookings")} className="text-[11px] text-primary hover:underline">
                            View all →
                        </button>
                    </div>
                    {analytics.recentBookings.length > 0 ? (
                        <div className="space-y-3">
                            {analytics.recentBookings.map((booking: any) => {
                                const statusColors: Record<string, string> = {
                                    confirmed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                                    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                                    completed: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
                                    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                                };
                                const isPaid = getEquipmentPaymentStatus(booking) === "paid";
                                return (
                                    <div
                                        key={booking.id}
                                        onClick={() => navigate("/equipment/rental-requests")}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center flex-shrink-0">
                                            <Tractor className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-foreground truncate">{booking.equipment?.name || "Equipment"}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[booking.status] || "bg-muted text-muted-foreground"}`}>
                                                    {booking.status}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {booking.renter?.full_name || "Renter"} • {new Date(booking.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {new Date(booking.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-semibold text-foreground">{rupee(booking.total_price || 0)}</p>
                                            <p className={`text-[10px] ${isPaid ? "text-slate-600 dark:text-slate-400" : "text-amber-600 dark:text-amber-400"}`}>
                                                {isPaid ? "Paid" : "Unpaid"}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Calendar className="h-8 w-8 mb-2 opacity-40" />
                            <p className="text-sm">No bookings yet</p>
                        </div>
                    )}

                    {/* Booking stats bar */}
                    {analytics.totalBookings > 0 && (
                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                                    <span className="text-[11px] text-muted-foreground">{analytics.confirmedBookings} Active</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-[11px] text-muted-foreground">{analytics.pendingBookings} Pending</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                                    <span className="text-[11px] text-muted-foreground">{analytics.completedBookings} Done</span>
                                </div>
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground">{analytics.totalBookings} total</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Quick Actions ─────────────────────────────────────────── */}
            <div className="mb-2">
                <h2 className="font-display text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {quickActions.map((action) => (
                        <div
                            key={action.title}
                            onClick={() => navigate(action.path)}
                            className="group bg-card rounded-xl p-3 sm:p-4 border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative"
                        >
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${action.accent} flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform`}>
                                <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <h4 className="text-xs sm:text-sm font-medium text-foreground leading-tight">{action.title}</h4>
                            {action.badge && (
                                <span className="absolute top-3 right-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                    {action.badge}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default EquipmentOwnerDashboard;
