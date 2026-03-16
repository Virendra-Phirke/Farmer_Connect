import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { FileText, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";
import { SearchBar } from "@/components/SearchBar";
import { getProfileId } from "@/lib/supabase-auth";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useSupplyContracts } from "@/hooks/useSupplyContracts";

const BillingPage = () => {
  const { user } = useUser();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user?.id) getProfileId(user.id).then(setProfileId);
  }, [user?.id]);

  const { data: requests, isLoading: requestsLoading } = usePurchaseRequests(
    profileId ? { buyer_id: profileId } : undefined,
    { enabled: !!profileId }
  );

  const { data: contracts, isLoading: contractsLoading } = useSupplyContracts(
    profileId ? { buyer_id: profileId } : undefined,
    { enabled: !!profileId }
  );

  const purchaseBills = useMemo(
    () => (requests || []).filter((r: any) => r.status !== "rejected"),
    [requests]
  );

  const contractBills = useMemo(
    () => (contracts || []).filter((c: any) => c.status !== "pending"),
    [contracts]
  );

  // Filter bills by search query
  const filteredPurchaseBills = useMemo(
    () => purchaseBills.filter((req: any) =>
      req.crop_listing?.crop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.crop_listing?.farmer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [purchaseBills, searchQuery]
  );

  const filteredContractBills = useMemo(
    () => contractBills.filter((c: any) =>
      c.crop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.farmer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [contractBills, searchQuery]
  );

  const showPurchaseBill = (req: any) => {
    const cropName = req.crop_listing?.crop_name || "Crop";
    const quantity = Number(req.quantity_kg || 0);
    const unitPrice = Number(req.offered_price || 0);
    const computedAmount = Number(req.total_amount ?? (quantity * unitPrice));
    const billId = req.billing_id || `INV-${req.id.slice(0, 8).toUpperCase()}`;

    setSelectedBill({
      title: `${cropName} - Purchase Request`,
      receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
      billId,
      billingId: billId,
      transactionId: req.id,
      transactionType: "Produce Purchase",
      date: new Date(req.created_at || new Date()).toLocaleDateString(),
      amount: computedAmount,
      paymentStatus: req.payment_status || "unpaid",
      paymentConfirmedAt: req.payment_status === "paid" ? new Date(req.updated_at || req.created_at).toLocaleString() : undefined,
      status: req.status || "accepted",
      buyer: {
        id: req.buyer?.id || profileId || undefined,
        name: req.buyer?.full_name || user?.fullName || "Buyer",
        phone: req.buyer?.phone,
        email: req.buyer?.email || user?.primaryEmailAddress?.emailAddress || undefined,
        address: req.buyer?.location,
        state: req.buyer?.state,
        district: req.buyer?.district,
        taluka: req.buyer?.taluka,
        village_city: req.buyer?.village_city,
      },
      seller: {
        id: req.crop_listing?.farmer?.id,
        name: req.crop_listing?.farmer?.full_name || "Farmer",
        phone: req.crop_listing?.farmer?.phone,
        email: req.crop_listing?.farmer?.email,
        address: req.crop_listing?.farmer?.location || req.crop_listing?.location,
        state: req.crop_listing?.farmer?.state,
        district: req.crop_listing?.farmer?.district,
        taluka: req.crop_listing?.farmer?.taluka,
        village_city: req.crop_listing?.farmer?.village_city,
      },
      lineItems: [
        {
          description: `${cropName} (${quantity} kg)`,
          quantity,
          unitPrice,
          amount: computedAmount,
        },
      ],
      subtotal: computedAmount,
      taxRate: 0,
      taxAmount: 0,
      total: computedAmount,
      originalRecord: req,
    });
    setIsBillOpen(true);
  };

  const showContractBill = (contract: any) => {
    const quantityPerDelivery = contract.quantity_kg_per_delivery ?? contract.quantity_per_delivery ?? 0;
    const computedAmount = Number(contract.total_amount ?? (Number(contract.price_per_kg || 0) * Number(quantityPerDelivery || 0)));
    const billId = contract.billing_id || `CONT-${contract.id.slice(0, 8).toUpperCase()}`;

    setSelectedBill({
      title: `${contract.crop_name} - Supply Contract`,
      receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
      billId,
      billingId: billId,
      transactionId: contract.id,
      transactionType: "Supply Contract Delivery",
      date: new Date(contract.start_date || contract.created_at || new Date()).toLocaleDateString(),
      amount: computedAmount,
      paymentStatus: contract.payment_status || "unpaid",
      paymentConfirmedAt: contract.payment_status === "paid" ? new Date(contract.updated_at || contract.created_at).toLocaleString() : undefined,
      status: contract.status || "active",
      buyer: {
        id: contract.buyer?.id || profileId || undefined,
        name: contract.buyer?.full_name || user?.fullName || "Buyer",
        phone: contract.buyer?.phone,
        email: contract.buyer?.email || user?.primaryEmailAddress?.emailAddress || undefined,
        address: contract.buyer?.location,
        state: contract.buyer?.state,
        district: contract.buyer?.district,
        taluka: contract.buyer?.taluka,
        village_city: contract.buyer?.village_city,
      },
      seller: {
        id: contract.farmer?.id,
        name: contract.farmer?.full_name || "Farmer",
        phone: contract.farmer?.phone,
        email: contract.farmer?.email,
        address: contract.farmer?.location,
        state: contract.farmer?.state,
        district: contract.farmer?.district,
        taluka: contract.farmer?.taluka,
        village_city: contract.farmer?.village_city,
      },
      lineItems: [
        {
          description: `${contract.crop_name} (${quantityPerDelivery} kg/${contract.delivery_frequency || "delivery"})`,
          quantity: 1,
          unitPrice: computedAmount,
          amount: computedAmount,
        },
      ],
      subtotal: computedAmount,
      taxRate: 0,
      taxAmount: 0,
      total: computedAmount,
      originalRecord: contract,
    });
    setIsBillOpen(true);
  };

  const isLoading = requestsLoading || contractsLoading;

  return (
    <DashboardLayout subtitle="View and print all your billing receipts in one place.">
      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6" /> Hotel Billing Center
        </h2>

        <SearchBar 
          placeholder="Search by crop name or seller..." 
          onSearch={setSearchQuery} 
        />

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="purchase" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2 md:w-[420px]">
              <TabsTrigger value="purchase">Purchase Bills ({purchaseBills.length})</TabsTrigger>
              <TabsTrigger value="contracts">Contract Bills ({contractBills.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="purchase">
              {!purchaseBills.length ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                  No purchase bills yet.
                </div>
              ) : !filteredPurchaseBills.length ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                  No purchase bills match your search.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPurchaseBills.map((req: any) => (
                    <div key={req.id} className="bg-card rounded-xl border border-border p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                      <div>
                        <p className="font-semibold">{req.crop_listing?.crop_name || "Crop"}</p>
                        <p className="text-sm text-muted-foreground">Qty: {req.quantity_kg} kg @ ₹{req.offered_price}/kg</p>
                        <p className="text-sm text-muted-foreground">Seller: {req.crop_listing?.farmer?.full_name || "Farmer"}</p>
                        <p className="text-sm font-medium mt-1">Amount: ₹{Number(req.total_amount ?? (Number(req.quantity_kg || 0) * Number(req.offered_price || 0)))}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => showPurchaseBill(req)} className="flex items-center gap-1">
                        <FileText className="h-4 w-4" /> View Bill
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="contracts">
              {!contractBills.length ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                  No contract bills yet.
                </div>
              ) : !filteredContractBills.length ? (
                <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                  No contract bills match your search.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredContractBills.map((contract: any) => (
                    <div key={contract.id} className="bg-card rounded-xl border border-border p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                      <div>
                        <p className="font-semibold">{contract.crop_name}</p>
                        <p className="text-sm text-muted-foreground">Delivery: {contract.quantity_kg_per_delivery} kg / {contract.delivery_frequency}</p>
                        <p className="text-sm text-muted-foreground">Farmer: {contract.farmer?.full_name || "Farmer"}</p>
                        <p className="text-sm font-medium mt-1">Amount: ₹{Number(contract.total_amount ?? (Number(contract.price_per_kg || 0) * Number(contract.quantity_kg_per_delivery || 0)))}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => showContractBill(contract)} className="flex items-center gap-1">
                        <FileText className="h-4 w-4" /> View Bill
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <BillReceiptDialog
        isOpen={isBillOpen}
        onClose={() => setIsBillOpen(false)}
        billData={selectedBill}
        canMarkPaid={false}
      />
    </DashboardLayout>
  );
};

export default BillingPage;
