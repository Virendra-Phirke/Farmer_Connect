import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useSupplyContracts, useUpdateSupplyContract } from "@/hooks/useSupplyContracts";
import { useEquipmentBookings } from "@/hooks/useEquipmentBookings";
import { getEquipmentPaymentStatus } from "@/lib/api/equipment-bookings";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, FileText, Receipt, Search, Tractor, Calendar, Package, TrendingUp, Wheat, X, ChevronRight } from "lucide-react";
import { BillReceiptDialog } from "@/components/BillReceiptDialog";
import { toast } from "sonner";

/* ── status badge ────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, string> = {
        active:    "bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800",
        completed: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        confirmed: "bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800",
        pending:   "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        cancelled: "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
    };
    const cls = map[status?.toLowerCase()] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${cls}`}>
            {status}
        </span>
    );
};

/* ── info cell ───────────────────────────────────────────────────────────── */
const InfoCell = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide flex items-center gap-1">
            {Icon && <Icon size={9} />} {label}
        </span>
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{value || "—"}</span>
    </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
const MyContractsPage = () => {
    const { user }   = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isBillOpen, setIsBillOpen]   = useState(false);
    const [selectedBill, setSelectedBill] = useState<any>(null);
    const updateContract = useUpdateSupplyContract();

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: contracts, isLoading } = useSupplyContracts(
        { farmer_id: profileId ?? "" },
        { enabled: !!profileId, refetchInterval: 10000 }
    );
    const { data: rentalBookings } = useEquipmentBookings(
        profileId ? { renter_id: profileId } : undefined,
        { enabled: !!profileId }
    );

    const billingReadyRentals = rentalBookings?.filter(
        (b: any) => b.status === "confirmed" || b.status === "completed"
    ) || [];

    const filteredContracts = contracts?.filter((c: any) =>
        c.crop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.buyer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const filteredRentals = billingReadyRentals.filter((r: any) =>
        r.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.owner?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    /* ── bill helpers ─────────────────────────────────────────────────── */
    const openBill = (contract: any) => {
        const amount = Number(contract.total_amount ?? (Number(contract.price_per_kg || 0) * Number(contract.quantity_kg_per_delivery || 0)));
        const billId = contract.billing_id || `INV-SC-${contract.id.slice(0, 8).toUpperCase()}`;
        setSelectedBill({
            title: `${contract.crop_name} - Supply Contract`,
            receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
            source: "supply", billId, billingId: billId,
            transactionId: contract.id, transactionType: "Supply Contract Delivery",
            date: new Date(contract.created_at || new Date()).toLocaleDateString(),
            amount, paymentStatus: contract.payment_status || "unpaid",
            paymentConfirmedAt: contract.payment_status === "paid"
                ? new Date(contract.updated_at || contract.created_at).toLocaleString() : undefined,
            status: contract.status || "active",
            buyerName: contract.buyer?.full_name || "Buyer",
            buyer: { id: contract.buyer?.id, name: contract.buyer?.full_name || "Buyer", phone: contract.buyer?.phone, email: contract.buyer?.email, address: contract.buyer?.location, state: contract.buyer?.state, district: contract.buyer?.district, taluka: contract.buyer?.taluka, village_city: contract.buyer?.village_city },
            seller: { id: contract.farmer?.id || profileId || undefined, name: contract.farmer?.full_name || user?.fullName || "Farmer", phone: contract.farmer?.phone || user?.phoneNumbers?.[0]?.phoneNumber, email: contract.farmer?.email || user?.primaryEmailAddress?.emailAddress || undefined, address: contract.farmer?.location, state: contract.farmer?.state, district: contract.farmer?.district, taluka: contract.farmer?.taluka, village_city: contract.farmer?.village_city },
            lineItems: [{ description: `${contract.crop_name} (${contract.quantity_kg_per_delivery} kg/delivery)`, quantity: Number(contract.quantity_kg_per_delivery || 0), unitPrice: Number(contract.price_per_kg || 0), amount }],
            subtotal: amount, taxRate: 0, taxAmount: 0, total: amount,
            cropDetails: `${contract.crop_name} (${contract.quantity_kg_per_delivery} kg/delivery @ ₹${contract.price_per_kg}/kg)`,
            originalRecord: contract,
        });
        setIsBillOpen(true);
    };

    const openRentalBill = (booking: any) => {
        const amount = Number(booking.total_price || 0);
        const billId = booking.billing_id || `INV-RENT-${booking.id.slice(0, 8).toUpperCase()}`;
        setSelectedBill({
            title: `${booking.equipment?.name || "Equipment"} - Equipment Rental`,
            receiptNumber: `RCPT-${billId.slice(0, 8).toUpperCase()}`,
            source: "rental", billId, billingId: billId,
            transactionId: booking.id, transactionType: "Equipment Rental",
            date: new Date(booking.created_at || new Date()).toLocaleDateString(),
            amount, paymentStatus: getEquipmentPaymentStatus(booking),
            status: booking.status || "confirmed",
            buyerName: user?.fullName || "Renter",
            buyer: { id: booking.renter?.id || profileId || undefined, name: booking.renter?.full_name || user?.fullName || "Renter", phone: booking.renter?.phone, email: booking.renter?.email || user?.primaryEmailAddress?.emailAddress || undefined, address: booking.renter?.location, state: booking.renter?.state, district: booking.renter?.district, taluka: booking.renter?.taluka, village_city: booking.renter?.village_city },
            seller: { id: booking.equipment?.owner?.id, name: booking.equipment?.owner?.full_name || "Equipment Owner", phone: booking.equipment?.owner?.phone, email: booking.equipment?.owner?.email, address: booking.equipment?.owner?.location, state: booking.equipment?.owner?.state, district: booking.equipment?.owner?.district, taluka: booking.equipment?.owner?.taluka, village_city: booking.equipment?.owner?.village_city },
            lineItems: [{ description: `${booking.equipment?.name || "Equipment"} (${booking.start_date} → ${booking.end_date})`, quantity: 1, unitPrice: amount, amount }],
            subtotal: amount, taxRate: 0, taxAmount: 0, total: amount,
            cropDetails: `${booking.equipment?.name || "Equipment"} (${booking.start_date} → ${booking.end_date})`,
            originalRecord: booking,
        });
        setIsBillOpen(true);
    };

    const handleMarkPaid = async () => {
        const isActualSeller = selectedBill?.source === "supply" && selectedBill?.originalRecord?.farmer_id === profileId;
        if (selectedBill && selectedBill.source === "supply" && isActualSeller && selectedBill?.originalRecord?.payment_status !== "paid") {
            try {
                await updateContract.mutateAsync({ id: selectedBill.originalRecord.id, updates: { payment_status: "paid" } });
                setIsBillOpen(false);
                toast.success("Payment marked as complete.");
            } catch { toast.error("Failed to mark payment as complete."); }
        }
    };

    const loading = !profileId || isLoading;

    return (
        <DashboardLayout subtitle="Track your long-term supply contracts with buyers.">
            <div className="max-w-5xl mx-auto space-y-6">

               

                {/* ══ SEARCH ════════════════════════════════════════════════ */}
                <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
                    <input
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm
                            bg-white dark:bg-gray-900
                            border border-gray-200 dark:border-gray-700
                            text-gray-900 dark:text-gray-100
                            placeholder:text-gray-400 dark:placeholder:text-gray-500
                            shadow-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20
                            transition-all duration-150"
                        placeholder="Search by crop name, buyer or equipment…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* ══ SUPPLY CONTRACTS ══════════════════════════════════════ */}
                <section className="space-y-3">
                    {/* section header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center
                                bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400
                                border border-teal-100 dark:border-teal-800">
                                <Wheat size={15} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Supply Contracts</h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Long-term delivery agreements with buyers</p>
                            </div>
                        </div>
                        {!loading && !!filteredContracts.length && (
                            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full
                                text-[10px] font-bold
                                bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400
                                border border-teal-200 dark:border-teal-800">
                                {filteredContracts.length}
                            </span>
                        )}
                    </div>

                    {/* loading */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-14 rounded-2xl
                            bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 gap-3">
                            <div className="w-9 h-9 rounded-full border-[3px] border-gray-200 dark:border-gray-700 border-t-teal-500 animate-spin" />
                            <p className="text-xs text-gray-400 dark:text-gray-500">Loading contracts…</p>
                        </div>

                    /* no contracts */
                    ) : !contracts?.length ? (
                        <div className="flex flex-col items-center justify-center py-14 px-6 text-center
                            rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                            bg-gray-50 dark:bg-gray-900/50">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3
                                bg-teal-50 dark:bg-teal-950 text-teal-500 dark:text-teal-400
                                border border-teal-100 dark:border-teal-900">
                                <FileText size={21} />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">No Active Contracts</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
                                When buyers create supply contracts with you, they'll appear here.
                            </p>
                        </div>

                    /* no search results */
                    ) : !filteredContracts.length ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center
                            rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                            bg-gray-50 dark:bg-gray-900/50">
                            <Search size={18} className="text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm text-gray-400 dark:text-gray-500">No contracts match your search.</p>
                        </div>

                    /* contract cards */
                    ) : (
                        <div className="space-y-3">
                            {filteredContracts.map((c: any) => {
                                const amount = Number(c.total_amount ?? (Number(c.price_per_kg || 0) * Number(c.quantity_kg_per_delivery || 0)));
                                return (
                                    <div key={c.id}
                                        className="group bg-white dark:bg-gray-900
                                            border border-gray-200 dark:border-gray-700
                                            rounded-2xl overflow-hidden
                                            shadow-sm hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700
                                            transition-all duration-200">

                                        {/* top accent */}
                                        <div className="h-0.5 w-full bg-gradient-to-r from-teal-500 to-teal-400
                                            opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                                        <div className="p-4 sm:p-5">
                                            {/* header */}
                                            <div className="flex items-start justify-between gap-3 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center
                                                        bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400
                                                        border border-teal-100 dark:border-teal-800">
                                                        <Wheat size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">{c.crop_name}</h3>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                            Buyer: <span className="text-gray-600 dark:text-gray-300 font-medium">{c.buyer?.full_name || "—"}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <StatusBadge status={c.status} />
                                                </div>
                                            </div>

                                            {/* info grid */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl
                                                bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 mb-4">
                                                <InfoCell label="Qty/Delivery" value={`${c.quantity_kg_per_delivery} kg`} icon={Package} />
                                                <InfoCell label="Price" value={`₹${c.price_per_kg}/kg`} icon={TrendingUp} />
                                                <InfoCell label="Frequency" value={c.delivery_frequency} icon={Calendar} />
                                                <InfoCell label="Period" value={`${c.start_date} – ${c.end_date}`} icon={Calendar} />
                                            </div>

                                            {/* footer */}
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">Total value:</span>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">₹{amount.toLocaleString("en-IN")}</span>
                                                </div>
                                                {c.status === "active" && (
                                                    <button onClick={() => openBill(c)}
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                                                            text-xs font-semibold
                                                            bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                                            dark:bg-teal-500 dark:hover:bg-teal-600
                                                            shadow-sm hover:shadow transition-all duration-150">
                                                        <Receipt size={12} /> View Bill
                                                        <ChevronRight size={11} className="opacity-70" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* ══ EQUIPMENT RENTAL BILLING ══════════════════════════════ */}
                <section className="space-y-3">
                    {/* section header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center
                                bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400
                                border border-teal-100 dark:border-teal-800">
                                <Tractor size={15} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Equipment Rental Billing</h2>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Confirmed and completed rental invoices</p>
                            </div>
                        </div>
                        {!!filteredRentals.length && (
                            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full
                                text-[10px] font-bold
                                bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400
                                border border-teal-200 dark:border-teal-800">
                                {filteredRentals.length}
                            </span>
                        )}
                    </div>

                    {!billingReadyRentals.length ? (
                        <div className="flex flex-col items-center justify-center py-14 px-6 text-center
                            rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                            bg-gray-50 dark:bg-gray-900/50">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3
                                bg-teal-50 dark:bg-teal-950 text-teal-500 dark:text-teal-400
                                border border-teal-100 dark:border-teal-900">
                                <Tractor size={21} />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">No Rental Bills Yet</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
                                Bills appear here once your equipment bookings are confirmed or completed.
                            </p>
                        </div>
                    ) : !filteredRentals.length ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center
                            rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                            bg-gray-50 dark:bg-gray-900/50">
                            <Search size={18} className="text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm text-gray-400 dark:text-gray-500">No rentals match your search.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRentals.map((booking: any) => {
                                const payStatus = getEquipmentPaymentStatus(booking);
                                return (
                                    <div key={booking.id}
                                        className="group bg-white dark:bg-gray-900
                                            border border-gray-200 dark:border-gray-700
                                            rounded-2xl overflow-hidden
                                            shadow-sm hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700
                                            transition-all duration-200">

                                        <div className="h-0.5 w-full bg-gradient-to-r from-teal-500 to-teal-400
                                            opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                                        <div className="p-4 sm:p-5">
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center
                                                        bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400
                                                        border border-teal-100 dark:border-teal-800">
                                                        <Tractor size={18} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                                            {booking.equipment?.name || "Equipment"}
                                                        </h3>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                                            <Calendar size={10} />
                                                            {booking.start_date} → {booking.end_date}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <StatusBadge status={booking.status} />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">Amount:</span>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                            ₹{Number(booking.total_price).toLocaleString("en-IN")}
                                                        </span>
                                                    </div>
                                                    <StatusBadge status={payStatus} />
                                                </div>
                                                <button onClick={() => openRentalBill(booking)}
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl
                                                        text-xs font-semibold
                                                        bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white
                                                        dark:bg-teal-500 dark:hover:bg-teal-600
                                                        shadow-sm hover:shadow transition-all duration-150">
                                                    <Receipt size={12} /> View Bill
                                                    <ChevronRight size={11} className="opacity-70" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {selectedBill && (
                <BillReceiptDialog
                    isOpen={isBillOpen}
                    onClose={() => setIsBillOpen(false)}
                    billData={selectedBill}
                    canMarkPaid={selectedBill?.source === "supply" && selectedBill?.originalRecord?.farmer_id === profileId}
                    onMarkPaid={handleMarkPaid}
                    isLoading={updateContract.isPending}
                />
            )}
        </DashboardLayout>
    );
};

export default MyContractsPage;