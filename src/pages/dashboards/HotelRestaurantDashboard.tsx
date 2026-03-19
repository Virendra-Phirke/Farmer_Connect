import {
    Store, MapPin, ClipboardList, Receipt, IndianRupee, TrendingUp,
    ShoppingCart, FileText, Activity, ArrowUpRight, BarChart3,
    Package, Leaf, Calendar, CheckCircle
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getProfileId } from "@/lib/supabase-auth";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useSupplyContracts } from "@/hooks/useSupplyContracts";
import { useMyCropRequirements } from "@/hooks/useCropRequirements";
import DashboardLayout from "@/components/DashboardLayout";

const rupee = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const kg = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 }) + " kg";

const HotelRestaurantDashboard = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id).then(setProfileId);
        }
    }, [user?.id]);

    /* ── Data Hooks ─────────────────────────────────────────────────── */
    const { data: purchases } = usePurchaseRequests(
        profileId ? { buyer_id: profileId } : undefined,
        { enabled: !!profileId }
    );
    const { data: contracts } = useSupplyContracts(
        profileId ? { buyer_id: profileId } : undefined,
        { enabled: !!profileId }
    );
    const { data: cropRequirements } = useMyCropRequirements(profileId || undefined);

    /* ── Computed Analytics ──────────────────────────────────────────── */
    const analytics = useMemo(() => {
        const allPurchases = purchases || [];
        const allContracts = contracts || [];
        const allRequirements = cropRequirements || [];

        // Purchase analytics
        const pendingPurchases = allPurchases.filter((p: any) => p.status === "pending").length;
        const acceptedPurchases = allPurchases.filter((p: any) => p.status === "accepted").length;
        const completedPurchases = allPurchases.filter((p: any) => p.status === "completed").length;
        const rejectedPurchases = allPurchases.filter((p: any) => p.status === "rejected").length;

        // Spending
        const completedAndAccepted = allPurchases.filter((p: any) => p.status === "accepted" || p.status === "completed");
        const totalPurchaseSpend = completedAndAccepted.reduce((s: number, p: any) => s + ((p.quantity_kg || 0) * (p.offered_price || 0)), 0);

        // Contract analytics
        const activeContracts = allContracts.filter((c: any) => c.status === "active").length;
        const pendingContracts = allContracts.filter((c: any) => c.status === "pending").length;
        const completedContracts = allContracts.filter((c: any) => c.status === "completed").length;
        const contractSpend = allContracts
            .filter((c: any) => c.status === "active" || c.status === "completed")
            .reduce((s: number, c: any) => s + ((c.quantity_kg_per_delivery || 0) * (c.price_per_kg || 0)), 0);

        const totalSpend = totalPurchaseSpend + contractSpend;

        // Crop requirements
        const openRequirements = allRequirements.filter((r: any) => r.status === "open").length;
        const fulfilledRequirements = allRequirements.filter((r: any) => r.status === "fulfilled").length;

        // Crop-wise spend distribution
        const cropMap: Record<string, { qty: number; spend: number; count: number }> = {};
        completedAndAccepted.forEach((p: any) => {
            const name = p.crop_listing?.crop_name || "Other";
            if (!cropMap[name]) cropMap[name] = { qty: 0, spend: 0, count: 0 };
            cropMap[name].qty += p.quantity_kg || 0;
            cropMap[name].spend += (p.quantity_kg || 0) * (p.offered_price || 0);
            cropMap[name].count += 1;
        });
        allContracts
            .filter((c: any) => c.status === "active" || c.status === "completed")
            .forEach((c: any) => {
                const name = c.crop_name || "Other";
                if (!cropMap[name]) cropMap[name] = { qty: 0, spend: 0, count: 0 };
                cropMap[name].qty += c.quantity_kg_per_delivery || 0;
                cropMap[name].spend += (c.quantity_kg_per_delivery || 0) * (c.price_per_kg || 0);
                cropMap[name].count += 1;
            });
        const cropDistribution = Object.entries(cropMap)
            .map(([name, d]) => ({ name, ...d }))
            .sort((a, b) => b.spend - a.spend)
            .slice(0, 5);

        // Recent contracts
        const recentContracts = allContracts.slice(0, 3);

        return {
            totalPurchases: allPurchases.length,
            pendingPurchases,
            acceptedPurchases,
            completedPurchases,
            rejectedPurchases,
            totalPurchaseSpend,
            activeContracts,
            pendingContracts,
            completedContracts,
            totalContracts: allContracts.length,
            contractSpend,
            totalSpend,
            openRequirements,
            fulfilledRequirements,
            totalRequirements: allRequirements.length,
            cropDistribution,
            recentContracts,
        };
    }, [purchases, contracts, cropRequirements]);

    /* ── Quick Actions ──────────────────────────────────────────────── */
    const quickActions = [
        { icon: Store, title: "Browse Produce", path: "/hotel/browse-produce", accent: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
        { icon: ClipboardList, title: "My Crop Demands", path: "/hotel/my-requirements", accent: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
        { icon: Receipt, title: "Billing Center", path: "/hotel/billing", accent: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
        { icon: MapPin, title: "My Profile", path: "/profile", accent: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
    ];

    const maxCropSpend = Math.max(...analytics.cropDistribution.map(c => c.spend), 1);
    const barColors = [
        "bg-slate-500 dark:bg-slate-400",
        "bg-sky-500 dark:bg-sky-400",
        "bg-amber-500 dark:bg-amber-400",
        "bg-violet-500 dark:bg-violet-400",
        "bg-rose-500 dark:bg-rose-400",
    ];

    return (
        <DashboardLayout subtitle="Source fresh produce directly from local farmers and manage deliveries.">
            {/* ── KPI Cards ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {/* Total Spend */}
                <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-slate-500/10 blur-xl" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-500/15 flex items-center justify-center">
                            <IndianRupee className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Spend</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{rupee(analytics.totalSpend)}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-slate-500" />
                        <span className="text-[11px] text-muted-foreground">
                            Purchases {rupee(analytics.totalPurchaseSpend)} • Contracts {rupee(analytics.contractSpend)}
                        </span>
                    </div>
                </div>

                {/* Purchase Orders */}
                <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-sky-500/10 blur-xl" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
                            <ShoppingCart className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Purchases</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.totalPurchases}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <ArrowUpRight className="h-3 w-3 text-sky-500" />
                        <span className="text-[11px] text-muted-foreground">
                            {analytics.pendingPurchases} pending • {analytics.acceptedPurchases} accepted
                        </span>
                    </div>
                </div>

                {/* Supply Contracts */}
                <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-violet-500/10 blur-xl" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contracts</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.activeContracts}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <Activity className="h-3 w-3 text-violet-500" />
                        <span className="text-[11px] text-muted-foreground">
                            {analytics.pendingContracts} pending • {analytics.completedContracts} done
                        </span>
                    </div>
                </div>

                {/* Crop Demands */}
                <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-amber-500/10 blur-xl" />
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                            <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Demands</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{analytics.totalRequirements}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <CheckCircle className="h-3 w-3 text-amber-500" />
                        <span className="text-[11px] text-muted-foreground">
                            {analytics.openRequirements} open • {analytics.fulfilledRequirements} fulfilled
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Analytics Panels ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                {/* Crop-wise Spending */}
                <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Spending by Crop</h3>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{rupee(analytics.totalSpend)} total</span>
                    </div>
                    {analytics.cropDistribution.length > 0 ? (
                        <div className="space-y-3">
                            {analytics.cropDistribution.map((crop, i) => (
                                <div key={crop.name}>
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <Leaf className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-sm font-medium text-foreground">{crop.name}</span>
                                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                                                {crop.count} order{crop.count !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                        <span className="text-xs font-semibold text-muted-foreground">{rupee(crop.spend)}</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${barColors[i % barColors.length]} transition-all duration-700`}
                                            style={{ width: `${Math.max((crop.spend / maxCropSpend) * 100, 4)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground mt-0.5 block">{kg(crop.qty)} purchased</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Store className="h-8 w-8 mb-2 opacity-40" />
                            <p className="text-sm">No purchases yet</p>
                            <button onClick={() => navigate("/hotel/browse-produce")} className="text-xs text-primary mt-1 hover:underline">
                                Browse fresh produce →
                            </button>
                        </div>
                    )}
                </div>

                {/* Recent Supply Contracts */}
                <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Supply Contracts</h3>
                        </div>
                        <button onClick={() => navigate("/hotel/billing")} className="text-[11px] text-primary hover:underline">
                            View all →
                        </button>
                    </div>
                    {analytics.recentContracts.length > 0 ? (
                        <div className="space-y-3">
                            {analytics.recentContracts.map((contract: any) => {
                                const perDelivery = (contract.quantity_kg_per_delivery || 0) * (contract.price_per_kg || 0);
                                const statusColors: Record<string, string> = {
                                    active: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                                    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                                    completed: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
                                    paused: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
                                    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                                };
                                return (
                                    <div
                                        key={contract.id}
                                        onClick={() => navigate("/hotel/billing")}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors"
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
                                                {contract.farmer?.full_name || "Farmer"} • {contract.delivery_frequency} • {kg(contract.quantity_kg_per_delivery)}/delivery
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
                            <button onClick={() => navigate("/hotel/browse-produce")} className="text-xs text-primary mt-1 hover:underline">
                                Find farmers to contract →
                            </button>
                        </div>
                    )}

                    {/* Contract stats bar */}
                    {analytics.totalContracts > 0 && (
                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                                    <span className="text-[11px] text-muted-foreground">{analytics.activeContracts} Active</span>
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

export default HotelRestaurantDashboard;
