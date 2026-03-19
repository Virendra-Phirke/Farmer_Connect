import {
    Sprout, Tractor, Store, CloudSun, Users, MapPin, ShoppingCart,
    FileText, ClipboardList, TrendingUp, Package, IndianRupee,
    ArrowUpRight, ArrowDownRight, BarChart3, Activity, Leaf
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getProfileId } from "@/lib/supabase-auth";
import { useCropListings } from "@/hooks/useCropListings";
import { useFarmerActiveContractsCount, useSupplyContracts } from "@/hooks/useSupplyContracts";
import { useFarmerPurchaseRequests } from "@/hooks/usePurchaseRequests";
import DashboardLayout from "@/components/DashboardLayout";

/* ─── Helpers ──────────────────────────────────────────────────────────── */
const rupee = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const kg = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 }) + " kg";

/* ─── Component ────────────────────────────────────────────────────────── */
const FarmerDashboard = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then(setProfileId);
        }
    }, [user?.id]);

    /* ── Data Hooks ─────────────────────────────────────────────────── */
    const { data: listings } = useCropListings(
        profileId ? { farmer_id: profileId } : undefined,
        { enabled: !!profileId }
    );
    const { data: activeContractsCount } = useFarmerActiveContractsCount(profileId || "");
    const { data: contracts } = useSupplyContracts(
        profileId ? { farmer_id: profileId } : undefined,
        { enabled: !!profileId }
    );
    const { data: purchaseRequests } = useFarmerPurchaseRequests(
        profileId || "",
        { enabled: !!profileId }
    );

    /* ── Computed Analytics ──────────────────────────────────────────── */
    const analytics = useMemo(() => {
        const allListings = listings || [];
        const allContracts = contracts || [];
        const allRequests = purchaseRequests || [];

        // Crop analytics
        const activeListings = allListings.filter((l: any) => l.status === "available");
        const soldListings = allListings.filter((l: any) => l.status === "sold");
        const totalCropsListed = allListings.length;
        const totalQuantityKg = allListings.reduce((s: number, l: any) => s + (l.quantity_kg || 0), 0);

        // Revenue from sold listings (purchase requests that are accepted/completed)
        const completedSales = allRequests.filter((r: any) => r.status === "accepted" || r.status === "completed");
        const salesRevenue = completedSales.reduce((s: number, r: any) => s + ((r.quantity_kg || 0) * (r.offered_price || 0)), 0);

        // Revenue from contracts
        const activeContracts = allContracts.filter((c: any) => c.status === "active" || c.status === "completed");
        const contractRevenue = activeContracts.reduce((s: number, c: any) => {
            const perDelivery = (c.quantity_kg_per_delivery || 0) * (c.price_per_kg || 0);
            return s + perDelivery;
        }, 0);

        const totalRevenue = salesRevenue + contractRevenue;

        // Contract breakdown
        const pendingContracts = allContracts.filter((c: any) => c.status === "pending").length;
        const activeContractsNum = allContracts.filter((c: any) => c.status === "active").length;
        const completedContracts = allContracts.filter((c: any) => c.status === "completed").length;

        // Purchase requests breakdown
        const pendingRequests = allRequests.filter((r: any) => r.status === "pending").length;
        const acceptedRequests = allRequests.filter((r: any) => r.status === "accepted").length;

        // Crop-wise distribution
        const cropMap: Record<string, { qty: number; revenue: number; count: number }> = {};
        allListings.forEach((l: any) => {
            const name = l.crop_name || "Other";
            if (!cropMap[name]) cropMap[name] = { qty: 0, revenue: 0, count: 0 };
            cropMap[name].qty += l.quantity_kg || 0;
            cropMap[name].count += 1;
        });
        completedSales.forEach((r: any) => {
            const name = r.crop_listing?.crop_name || "Other";
            if (!cropMap[name]) cropMap[name] = { qty: 0, revenue: 0, count: 0 };
            cropMap[name].revenue += (r.quantity_kg || 0) * (r.offered_price || 0);
        });
        const cropDistribution = Object.entries(cropMap)
            .map(([name, d]) => ({ name, ...d }))
            .sort((a, b) => b.revenue - a.revenue || b.qty - a.qty)
            .slice(0, 5);

        // Recent activity
        const recentContracts = allContracts.slice(0, 3);

        return {
            activeListings: activeListings.length,
            soldListings: soldListings.length,
            totalCropsListed,
            totalQuantityKg,
            salesRevenue,
            contractRevenue,
            totalRevenue,
            pendingContracts,
            activeContractsNum,
            completedContracts,
            pendingRequests,
            acceptedRequests,
            cropDistribution,
            recentContracts,
            totalContracts: allContracts.length,
            totalRequests: allRequests.length,
        };
    }, [listings, contracts, purchaseRequests]);

    /* ── Quick‑actions (preserved from original) ────────────────────── */
    const quickActions = [
        { icon: Sprout, title: "Crop Guidance", path: "/farmer/crop-guidance", accent: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
        { icon: Store, title: "My Crop Listings", path: "/farmer/my-listings", accent: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
        { icon: Tractor, title: "Browse Equipment", path: "/farmer/browse-equipment", accent: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
        { icon: CloudSun, title: "Weather Alerts", path: "/farmer/weather-alerts", accent: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
        { icon: Users, title: "Farmer Groups", path: "/farmer/groups", accent: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
        { icon: MapPin, title: "Nearby Farmers", path: "/farmer/nearby", accent: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
        { icon: ShoppingCart, title: "Purchase Requests", path: "/farmer/purchase-requests", accent: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
        { icon: ClipboardList, title: "Hotel Crop Demands", path: "/farmer/hotel-requests", accent: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
        { icon: FileText, title: "My Contracts", path: "/farmer/contracts", accent: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
        { icon: Store, title: "My Profile", path: "/profile", accent: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
    ];

    /* ── Bar widths for crop chart ──────────────────────────────────── */
    const maxCropQty = Math.max(...analytics.cropDistribution.map(c => c.qty), 1);

    const barColors = [
        "bg-teal-500 dark:bg-teal-400",
        "bg-sky-500 dark:bg-sky-400",
        "bg-amber-500 dark:bg-amber-400",
        "bg-violet-500 dark:bg-violet-400",
        "bg-rose-500 dark:bg-rose-400",
    ];

    return (
        <DashboardLayout subtitle="Manage your farm, sell crops, rent equipment, and grow your profits.">
            {/* ── KPI Cards Row ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {/* Total Revenue */}
                <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-teal-500/10 blur-xl" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
                            <IndianRupee className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{rupee(analytics.totalRevenue)}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-teal-500" />
                        <span className="text-[11px] text-muted-foreground">
                            Sales {rupee(analytics.salesRevenue)} • Contracts {rupee(analytics.contractRevenue)}
                        </span>
                    </div>
                </div>

                {/* Active Listings */}
                <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-sky-500/10 blur-xl" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
                            <Package className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Crops</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.activeListings}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <ArrowUpRight className="h-3 w-3 text-sky-500" />
                        <span className="text-[11px] text-muted-foreground">
                            {analytics.soldListings} sold • {kg(analytics.totalQuantityKg)} total
                        </span>
                    </div>
                </div>

                {/* Active Contracts */}
                <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-violet-500/10 blur-xl" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contracts</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{activeContractsCount || 0}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <Activity className="h-3 w-3 text-violet-500" />
                        <span className="text-[11px] text-muted-foreground">
                            {analytics.pendingContracts} pending • {analytics.completedContracts} done
                        </span>
                    </div>
                </div>

                {/* Purchase Requests */}
                <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-amber-500/10 blur-xl" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                            <ShoppingCart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Orders</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.totalRequests}</p>
                    <div className="flex items-center gap-1 mt-1">
                        {analytics.pendingRequests > 0
                            ? <ArrowDownRight className="h-3 w-3 text-amber-500" />
                            : <ArrowUpRight className="h-3 w-3 text-amber-500" />
                        }
                        <span className="text-[11px] text-muted-foreground">
                            {analytics.pendingRequests} pending • {analytics.acceptedRequests} accepted
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Analytics Panels ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">

                {/* Crop Distribution Chart */}
                <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Crop Distribution</h3>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{analytics.totalCropsListed} total listings</span>
                    </div>
                    {analytics.cropDistribution.length > 0 ? (
                        <div className="space-y-3">
                            {analytics.cropDistribution.map((crop, i) => (
                                <div key={crop.name} className="group">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <Leaf className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-sm font-medium text-foreground">{crop.name}</span>
                                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                                                {crop.count} listing{crop.count !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                        <span className="text-xs font-semibold text-muted-foreground">{kg(crop.qty)}</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${barColors[i % barColors.length]} transition-all duration-700`}
                                            style={{ width: `${Math.max((crop.qty / maxCropQty) * 100, 4)}%` }}
                                        />
                                    </div>
                                    {crop.revenue > 0 && (
                                        <span className="text-[10px] text-muted-foreground mt-0.5 block">Revenue: {rupee(crop.revenue)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Sprout className="h-8 w-8 mb-2 opacity-40" />
                            <p className="text-sm">No crops listed yet</p>
                            <button onClick={() => navigate("/farmer/my-listings")} className="text-xs text-primary mt-1 hover:underline">
                                Add your first crop →
                            </button>
                        </div>
                    )}
                </div>

                {/* Contract Overview */}
                <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Recent Contracts</h3>
                        </div>
                        <button onClick={() => navigate("/farmer/contracts")} className="text-[11px] text-primary hover:underline">
                            View all →
                        </button>
                    </div>
                    {analytics.recentContracts.length > 0 ? (
                        <div className="space-y-3">
                            {analytics.recentContracts.map((contract: any) => {
                                const perDelivery = (contract.quantity_kg_per_delivery || 0) * (contract.price_per_kg || 0);
                                const statusColors: Record<string, string> = {
                                    active: "bg-teal-100 text-teal-700 dark:bg-teal-800 dark:text-teal-300",
                                    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                                    completed: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
                                    paused: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
                                    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                                };
                                return (
                                    <div
                                        key={contract.id}
                                        onClick={() => navigate("/farmer/contracts")}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors group"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-foreground truncate">{contract.crop_name}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[contract.status] || "bg-muted text-muted-foreground"}`}>
                                                    {contract.status}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {contract.buyer?.full_name || "Buyer"} • {contract.delivery_frequency} • {kg(contract.quantity_kg_per_delivery)}/delivery
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-semibold text-foreground">{rupee(perDelivery)}</p>
                                            <p className="text-[10px] text-muted-foreground">per delivery</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <FileText className="h-8 w-8 mb-2 opacity-40" />
                            <p className="text-sm">No contracts yet</p>
                            <button onClick={() => navigate("/farmer/hotel-requests")} className="text-xs text-primary mt-1 hover:underline">
                                Explore crop demands →
                            </button>
                        </div>
                    )}

                    {/* Contract stats summary bar */}
                    {analytics.totalContracts > 0 && (
                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                                    <span className="text-[11px] text-muted-foreground">{analytics.activeContractsNum} Active</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-[11px] text-muted-foreground">{analytics.pendingContracts} Pending</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                                    <span className="text-[11px] text-muted-foreground">{analytics.completedContracts} Done</span>
                                </div>
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground">{analytics.totalContracts} total</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Quick Actions Grid ───────────────────────────────────── */}
            <div className="mb-2">
                <h2 className="font-display text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                    {quickActions.map((action) => (
                        <div
                            key={action.title}
                            onClick={() => navigate(action.path)}
                            className="group bg-card rounded-xl p-3 sm:p-4 border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                        >
                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${action.accent} flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform`}>
                                <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <h4 className="text-xs sm:text-sm font-medium text-foreground leading-tight">{action.title}</h4>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default FarmerDashboard;
