import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Truck, MapPin, Calendar, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Mock data for deliveries
const mockDeliveries = [
    {
        id: "DEL-001",
        farmerName: "Rajesh Kumar",
        cropName: "Organic Tomatoes",
        quantity: "50 kg",
        status: "in-transit",
        eta: "Today, 4:00 PM",
        location: "Nashik, Maharashtra",
    },
    {
        id: "DEL-002",
        farmerName: "Sanjay Singh",
        cropName: "Potatoes",
        quantity: "100 kg",
        status: "pending",
        eta: "Tomorrow, 10:00 AM",
        location: "Pune, Maharashtra",
    },
    {
        id: "DEL-003",
        farmerName: "Amit Patel",
        cropName: "Onions",
        quantity: "75 kg",
        status: "delivered",
        eta: "Oct 12, 2:00 PM",
        location: "Surat, Gujarat",
    },
    {
        id: "DEL-004",
        farmerName: "Vikram Sharma",
        cropName: "Fresh Spinach",
        quantity: "20 kg",
        status: "in-transit",
        eta: "Today, 6:30 PM",
        location: "Kalyan, Maharashtra",
    }
];

const DeliveryTrackingPage = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "in-transit":
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Transit</Badge>;
            case "delivered":
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Delivered</Badge>;
            case "pending":
                return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const filteredDeliveries = mockDeliveries.filter(delivery => {
        const matchesSearch =
            delivery.cropName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            delivery.farmerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            delivery.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <DashboardLayout subtitle="Track your upcoming and past produce deliveries from farmers.">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                        <Truck className="h-6 w-6 text-primary" /> Delivery Tracking
                    </h2>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card p-4 rounded-xl border border-border">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by order ID, crop, or farmer..."
                            className="pl-9 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="in-transit">In Transit</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Deliveries List */}
                <div className="space-y-4">
                    {filteredDeliveries.length > 0 ? (
                        filteredDeliveries.map((delivery) => (
                            <div key={delivery.id} className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
                                <div className="border-b border-border/50 bg-muted/20 p-4 flex justify-between items-center flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm font-medium text-muted-foreground">{delivery.id}</span>
                                        {getStatusBadge(delivery.status)}
                                    </div>
                                    <div className="text-sm font-medium">
                                        ETA: <span className="text-primary">{delivery.eta}</span>
                                    </div>
                                </div>
                                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Package className="h-3 w-3" /> Produce
                                        </div>
                                        <div className="font-semibold text-lg">{delivery.cropName}</div>
                                        <div className="text-sm">{delivery.quantity}</div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Truck className="h-3 w-3" /> Farmer
                                        </div>
                                        <div className="font-medium text-base">{delivery.farmerName}</div>
                                    </div>

                                    <div className="space-y-1 sm:col-span-2 md:col-span-2">
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <MapPin className="h-3 w-3" /> Location
                                        </div>
                                        <div className="text-sm mt-1">{delivery.location}</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
                            No deliveries found matching your search or filter.
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default DeliveryTrackingPage;
