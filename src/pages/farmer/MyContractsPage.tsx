import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useSupplyContracts } from "@/hooks/useSupplyContracts";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, FileText } from "lucide-react";

const MyContractsPage = () => {
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: contracts, isLoading } = useSupplyContracts(profileId ? { farmer_id: profileId } : undefined);

    return (
        <DashboardLayout subtitle="Track your long-term supply contracts with buyers.">
            <div className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> My Supply Contracts</h2>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !contracts?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No supply contracts active. When buyers create contracts with you, they'll appear here.</div>
                ) : (
                    <div className="space-y-4">
                        {contracts.map((c: any) => (
                            <div key={c.id} className="bg-card rounded-xl border border-border p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-lg">{c.crop_name}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-full ${c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    <div><span className="text-muted-foreground">Qty/delivery:</span> {c.quantity_kg_per_delivery} kg</div>
                                    <div><span className="text-muted-foreground">Frequency:</span> {c.delivery_frequency}</div>
                                    <div><span className="text-muted-foreground">Price:</span> ₹{c.price_per_kg}/kg</div>
                                    <div><span className="text-muted-foreground">Period:</span> {c.start_date} → {c.end_date}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default MyContractsPage;
