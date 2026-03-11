import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, ShoppingCart, Check, X, Clock } from "lucide-react";

const PurchaseHistoryPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: requests, isLoading } = usePurchaseRequests(profileId ? { buyer_id: profileId } : undefined);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "accepted": return <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Accepted</span>;
            case "rejected": return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-sm font-medium"><X className="h-4 w-4" /> Rejected</span>;
            case "completed": return <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Completed</span>;
            case "pending": return <span className="inline-flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md text-sm font-medium"><Clock className="h-4 w-4" /> Pending</span>;
            default: return <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded-md text-sm font-medium">{status}</span>;
        }
    }

    return (
        <DashboardLayout subtitle="View the history of all the crops you've requested to buy.">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> Purchase History</h2>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !requests?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">You haven't requested to buy any produce yet.</div>
                ) : (
                    <div className="space-y-4">
                        {requests.map((req: any) => (
                            <div key={req.id} className="bg-card rounded-xl border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-lg">{req.crop_listing?.crop_name || "Crop"} <span className="text-muted-foreground font-normal text-sm">from {req.crop_listing?.farmer?.full_name || "Unknown Farmer"}</span></p>
                                    <p className="font-medium mt-1">Requested Qty: {req.quantity_kg} kg @ ₹{req.offered_price}/kg</p>
                                    {req.message && <p className="text-sm mt-1 text-muted-foreground">Note: {req.message}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(req.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default PurchaseHistoryPage;
