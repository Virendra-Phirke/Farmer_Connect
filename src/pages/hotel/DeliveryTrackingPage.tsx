import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Truck, MapPin, Package, Search, X, SlidersHorizontal, Clock, User, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ── mock data (unchanged) ───────────────────────────────────────────────── */
const mockDeliveries = [
    { id: "DEL-001", farmerName: "Rajesh Kumar",  cropName: "Organic Tomatoes", quantity: "50 kg",  status: "in-transit", eta: "Today, 4:00 PM",      location: "Nashik, Maharashtra" },
    { id: "DEL-002", farmerName: "Sanjay Singh",  cropName: "Potatoes",         quantity: "100 kg", status: "pending",    eta: "Tomorrow, 10:00 AM",  location: "Pune, Maharashtra"   },
    { id: "DEL-003", farmerName: "Amit Patel",    cropName: "Onions",           quantity: "75 kg",  status: "delivered",  eta: "Oct 12, 2:00 PM",     location: "Surat, Gujarat"      },
    { id: "DEL-004", farmerName: "Vikram Sharma", cropName: "Fresh Spinach",    quantity: "20 kg",  status: "in-transit", eta: "Today, 6:30 PM",      location: "Kalyan, Maharashtra" },
];

/* ── Status badge ────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { cls: string; label: string; dot: string }> = {
        "in-transit": { cls: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",   label: "In Transit", dot: "bg-blue-500"  },
        "delivered":  { cls: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800",   label: "Delivered",  dot: "bg-teal-500"  },
        "pending":    { cls: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800", label: "Pending",    dot: "bg-amber-500" },
    };
    const s = map[status] ?? { cls: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700", label: status, dot: "bg-gray-400" };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${s.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === "in-transit" ? "animate-pulse" : ""}`} />
            {s.label}
        </span>
    );
};

/* ── Info cell ───────────────────────────────────────────────────────────── */
const InfoCell = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            <Icon size={9} /> {label}
        </div>
        <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">{value}</p>
    </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
const DeliveryTrackingPage = () => {
    const [searchTerm, setSearchTerm]     = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const filtered = mockDeliveries.filter(d => {
        const q  = searchTerm.toLowerCase();
        const ms = !searchTerm ||
            d.cropName.toLowerCase().includes(q) ||
            d.farmerName.toLowerCase().includes(q) ||
            d.id.toLowerCase().includes(q);
        const mf = statusFilter === "all" || d.status === statusFilter;
        return ms && mf;
    });

    /* counts for status pills */
    const counts = mockDeliveries.reduce<Record<string, number>>((acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
    }, {});

    return (
        <DashboardLayout subtitle="Track your incoming deliveries from farmers.">
            <div className="w-full space-y-4 sm:space-y-5">

                {/* ── HERO ──────────────────────────────────────────────── */}
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl
                    bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800
                    dark:from-teal-800 dark:via-teal-900 dark:to-gray-900
                    border border-teal-500/30 dark:border-teal-700/50
                    shadow-md shadow-teal-200/30 dark:shadow-none
                    px-5 py-5 sm:px-8 sm:py-7">
                    <div className="absolute inset-0 opacity-10
                        bg-[radial-gradient(circle_at_70%_30%,white_1px,transparent_1px)]
                        bg-[size:18px_18px] pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                bg-white/15 border border-white/20 text-white/90
                                text-[0.65rem] font-semibold tracking-widest uppercase mb-2.5">
                                <Truck size={9} /> Logistics
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight mb-1">
                                Delivery Tracking
                            </h1>
                            <p className="text-teal-100/75 text-xs sm:text-sm max-w-md">
                                Monitor the status of all incoming produce deliveries in real-time.
                            </p>
                        </div>

                        {/* stat chips */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {[
                                { key: "in-transit", label: "In Transit", color: "bg-blue-400/20 border-blue-300/30 text-blue-100" },
                                { key: "pending",    label: "Pending",    color: "bg-amber-400/20 border-amber-300/30 text-amber-100" },
                                { key: "delivered",  label: "Delivered",  color: "bg-teal-400/20 border-teal-300/30 text-teal-100"  },
                            ].map(({ key, label, color }) => (
                                counts[key] ? (
                                    <div key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${color}`}>
                                        <span className="text-base font-bold leading-none">{counts[key]}</span>
                                        <span className="opacity-80">{label}</span>
                                    </div>
                                ) : null
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── FILTERS ───────────────────────────────────────────── */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* search */}
                    <div className="relative flex-1 min-w-0">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2
                            text-gray-400 dark:text-gray-500 pointer-events-none" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by order ID, crop or farmer…"
                            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm
                                bg-white dark:bg-gray-900
                                border border-gray-200 dark:border-gray-700
                                text-gray-900 dark:text-gray-100
                                placeholder:text-gray-400 dark:placeholder:text-gray-500
                                focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15
                                shadow-sm transition-all duration-150"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2
                                    text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* status filter */}
                    <div className="flex-shrink-0 w-40">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 text-sm rounded-xl
                                border-gray-200 dark:border-gray-700
                                bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                                focus:border-teal-400 focus:ring-teal-400/20 shadow-sm">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="in-transit">In Transit</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* count pill */}
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl
                        text-xs font-medium bg-white dark:bg-gray-900
                        border border-gray-200 dark:border-gray-700
                        text-gray-500 dark:text-gray-400 shadow-sm">
                        <SlidersHorizontal size={11} />
                        {filtered.length}
                    </span>
                </div>

                {/* ── LIST ──────────────────────────────────────────────── */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center
                        rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-900/50">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3
                            bg-teal-50 dark:bg-teal-950 text-teal-500 dark:text-teal-400
                            border border-teal-100 dark:border-teal-900">
                            <Truck size={22} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">No Deliveries Found</h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                            Try adjusting your search or filter to find deliveries.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(d => (
                            <div key={d.id}
                                className="group bg-white dark:bg-gray-900
                                    border border-gray-200 dark:border-gray-700 rounded-xl sm:rounded-2xl
                                    overflow-hidden shadow-sm hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700
                                    transition-all duration-200">

                                {/* card header */}
                                <div className={[
                                    "flex items-center justify-between flex-wrap gap-2",
                                    "px-4 sm:px-5 py-2.5 sm:py-3",
                                    "border-b border-gray-100 dark:border-gray-800",
                                    d.status === "delivered"
                                        ? "bg-teal-50/60 dark:bg-teal-950/20"
                                        : d.status === "in-transit"
                                            ? "bg-blue-50/60 dark:bg-blue-950/20"
                                            : "bg-amber-50/40 dark:bg-amber-950/10",
                                ].join(" ")}>
                                    <div className="flex items-center gap-2.5">
                                        <span className="font-mono text-[11px] font-bold text-gray-400 dark:text-gray-500
                                            bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                                            px-2 py-0.5 rounded-lg">
                                            {d.id}
                                        </span>
                                        <StatusBadge status={d.status} />
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold
                                        text-gray-600 dark:text-gray-300">
                                        <Clock size={11} className="text-teal-500 flex-shrink-0" />
                                        ETA: <span className="text-teal-600 dark:text-teal-400">{d.eta}</span>
                                    </div>
                                </div>

                                {/* card body */}
                                <div className="px-4 sm:px-5 py-3.5 sm:py-4
                                    grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                    <InfoCell icon={Package} label="Produce"  value={d.cropName}   />
                                    <InfoCell icon={User}    label="Quantity" value={d.quantity}    />
                                    <InfoCell icon={Truck}   label="Farmer"   value={d.farmerName}  />
                                    <InfoCell icon={MapPin}  label="Location" value={d.location}    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default DeliveryTrackingPage;