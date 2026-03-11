import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useFarmerPurchaseRequests, useUpdatePurchaseRequest } from "@/hooks/usePurchaseRequests";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PurchaseRequestsPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    // Farmer sees requests where their crop_listing was targeted
    const { data: requests, isLoading } = useFarmerPurchaseRequests(profileId || "");
    const updateMutation = useUpdatePurchaseRequest();

    const pendingRequests = requests?.filter((req: any) => req.status === "pending") || [];
    const historyRequests = requests?.filter((req: any) => req.status !== "pending") || [];

    const handleAccept = (id: string) => {
        updateMutation.mutate({ id, updates: { status: "accepted" } }, {
            onSuccess: () => toast.success("Request accepted!"),
            onError: () => toast.error("Failed to update"),
        });
    };

    const handleReject = (id: string) => {
        updateMutation.mutate({ id, updates: { status: "rejected" } }, {
            onSuccess: () => toast.success("Request rejected"),
            onError: () => toast.error("Failed to update"),
        });
    };

    return (
        <DashboardLayout subtitle="View and manage incoming purchase requests.">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> Purchase Requests</h2>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <Tabs defaultValue="pending" className="w-full">
                        <TabsList className="mb-6 grid w-full grid-cols-2 md:w-[400px]">
                            <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
                            <TabsTrigger value="history">History ({historyRequests.length})</TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending">
                            {!pendingRequests.length ? (
                                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No pending purchase requests.</div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingRequests.map((req: any) => (
                                        <div key={req.id} className="bg-card rounded-xl border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <p className="font-semibold">Qty: {req.quantity_kg} kg @ ₹{req.offered_price}/kg</p>
                                                <p className="text-sm text-muted-foreground">Type: {req.request_type}</p>
                                                {req.message && <p className="text-sm mt-1">{req.message}</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleAccept(req.id)} disabled={updateMutation.isPending}><Check className="mr-1 h-4 w-4" /> Accept</Button>
                                                <Button size="sm" variant="outline" onClick={() => handleReject(req.id)} disabled={updateMutation.isPending}><X className="mr-1 h-4 w-4" /> Reject</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="history">
                            {!historyRequests.length ? (
                                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No purchase history found.</div>
                            ) : (
                                <div className="space-y-4">
                                    {historyRequests.map((req: any) => (
                                        <div key={req.id} className="bg-card border border-border p-6 flex justify-between gap-4 opacity-75">
                                            <div>
                                                <p className="font-semibold">Qty: {req.quantity_kg} kg @ ₹{req.offered_price}/kg</p>
                                                <p className="text-sm text-muted-foreground">Type: {req.request_type}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {req.status === "accepted" && <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Accepted</span>}
                                                {req.status === "rejected" && <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-sm font-medium"><X className="h-4 w-4" /> Rejected</span>}
                                                {req.status === "completed" && <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-sm font-medium"><Check className="h-4 w-4" /> Completed</span>}
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

export default PurchaseRequestsPage;
