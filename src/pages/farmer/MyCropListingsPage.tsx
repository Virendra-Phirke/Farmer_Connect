import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { getCropListings, createCropListing, deleteCropListing, updateCropListing } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    Loader2, Plus, Trash2, Store, AlertCircle,
    Edit2, Search, Wheat, Scale, IndianRupee,
    FileText, Tag, TrendingUp, Package,
} from "lucide-react";
import { PageSkeleton } from "@/components/PageSkeleton";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }: {
    icon: React.ReactNode; label: string; value: string | number; sub?: string;
}) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/50 flex items-center justify-center flex-shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
                <p className="text-[18px] font-bold text-slate-900 dark:text-white leading-none">{value}</p>
                {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ item, onEdit, onDelete, isDeleting }: {
    item: any;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
    isDeleting: boolean;
}) {
    const isAvailable = item.status === "available";
    return (
        <div className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            {/* Top accent bar */}
            <div className={`h-1 w-full ${isAvailable ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-gradient-to-r from-amber-400 to-amber-500"}`} />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40 flex items-center justify-center flex-shrink-0">
                            <Wheat className="w-5 h-5 text-green-700 dark:text-green-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-[15px] text-slate-900 dark:text-white leading-none capitalize">{item.crop_name}</h3>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide mt-1 px-2 py-0.5 rounded-full ${
                                isAvailable
                                    ? "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400"
                                    : "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-green-500" : "bg-amber-500"}`} />
                                {item.status}
                            </span>
                        </div>
                    </div>

                    {/* Action buttons — visible on hover */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center transition-colors"
                            title="Edit"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onDelete(item.id)}
                            disabled={isDeleting}
                            className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center justify-center transition-colors disabled:opacity-40"
                            title="Delete"
                        >
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-slate-700/50">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                            <Scale className="w-2.5 h-2.5" /> Quantity
                        </p>
                        <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{item.quantity_kg} <span className="text-[11px] font-normal text-slate-400">kg</span></p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-slate-700/50">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                            <IndianRupee className="w-2.5 h-2.5" /> Price / kg
                        </p>
                        <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">₹{item.price_per_kg}</p>
                    </div>
                </div>

                {/* Total value pill */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-green-700 dark:text-green-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Total: ₹{(item.quantity_kg * item.price_per_kg).toLocaleString("en-IN")}
                    </div>
                    {item.description && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]" title={item.description}>
                            {item.description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
function FormField({ label, required, icon, children }: {
    label: string; required?: boolean; icon?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-[12px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                {icon && <span className="opacity-60">{icon}</span>}
                {label} {required && <span className="text-red-400">*</span>}
            </Label>
            {children}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const MyCropListingsPage = () => {
    const { user } = useUser();
    const [profileId,   setProfileId]   = useState<string | null>(null);
    const [showCreate,  setShowCreate]  = useState(false);
    const [showEdit,    setShowEdit]    = useState(false);
    const [editingId,   setEditingId]   = useState<string | null>(null);
    const [listings,    setListings]    = useState<any[]>([]);
    const [isLoading,   setIsLoading]   = useState(true);
    const [error,       setError]       = useState<string | null>(null);
    const [isSaving,    setIsSaving]    = useState(false);
    const [isDeleting,  setIsDeleting]  = useState<string | null>(null);
    const [cropName,    setCropName]    = useState("");
    const [quantity,    setQuantity]    = useState("");
    const [price,       setPrice]       = useState("");
    const [description, setDescription] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (user?.id) {
            getProfileId(user.id)
                .then(id => setProfileId(id))
                .catch(() => { setError("Could not load your farmer profile."); setIsLoading(false); });
        }
    }, [user?.id]);

    const fetchListings = async () => {
        if (!profileId) return;
        setIsLoading(true); setError(null);
        try { setListings((await getCropListings({ farmer_id: profileId })) || []); }
        catch (err: any) { setError(err?.message || "Failed to load crop listings."); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { if (profileId) fetchListings(); }, [profileId]);

    const resetForm = () => { setCropName(""); setQuantity(""); setPrice(""); setDescription(""); };

    const handleCreate = async () => {
        if (!profileId || !cropName || !quantity || !price) { toast.error("Please fill all required fields"); return; }
        setIsSaving(true);
        try {
            await createCropListing({ farmer_id: profileId, crop_name: cropName, quantity_kg: parseFloat(quantity), price_per_kg: parseFloat(price), description: description || null, status: "available", expected_harvest_date: null, image_url: null, location: null });
            toast.success("Listing created successfully!");
            setShowCreate(false); resetForm(); fetchListings();
        } catch (err: any) { toast.error(err?.message || "Failed to create listing"); }
        finally { setIsSaving(false); }
    };

    const handleDelete = async (id: string) => {
        setIsDeleting(id);
        try { await deleteCropListing(id); toast.success("Listing deleted"); setListings(prev => prev.filter(i => i.id !== id)); }
        catch { toast.error("Failed to delete listing"); }
        finally { setIsDeleting(null); }
    };

    const handleEditClick = (item: any) => {
        setEditingId(item.id); setCropName(item.crop_name); setQuantity(String(item.quantity_kg));
        setPrice(String(item.price_per_kg)); setDescription(item.description || ""); setShowEdit(true);
    };

    const handleUpdate = async () => {
        if (!editingId || !cropName || !quantity || !price) { toast.error("Please fill all required fields"); return; }
        setIsSaving(true);
        try {
            await updateCropListing(editingId, { crop_name: cropName, quantity_kg: parseFloat(quantity), price_per_kg: parseFloat(price), description: description || null });
            toast.success("Listing updated!"); setShowEdit(false); setEditingId(null); resetForm(); fetchListings();
        } catch (err: any) { toast.error(err?.message || "Failed to update listing"); }
        finally { setIsSaving(false); }
    };

    const filtered = listings.filter(i => i.crop_name.toLowerCase().includes(searchQuery.toLowerCase()));

    // ── Derived stats ──
    const totalQty   = listings.reduce((s, i) => s + (i.quantity_kg || 0), 0);
    const totalValue = listings.reduce((s, i) => s + (i.quantity_kg * i.price_per_kg || 0), 0);
    const available  = listings.filter(i => i.status === "available").length;

    return (
        <DashboardLayout subtitle="">
            <div className="space-y-6 pb-8">

                {/* ── Page header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-700 to-green-600 dark:from-green-600 dark:to-green-500 flex items-center justify-center shadow-sm">
                                <Store className="w-4 h-4 text-white" />
                            </div>
                            My Crop Listings
                        </h1>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 ml-[2.75rem]">Manage your produce for direct sale</p>
                    </div>

                    {/* Search + New */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search listings…"
                                className="pl-8 pr-3 py-2 text-[13px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-400/30 focus:border-green-400 dark:focus:border-green-600 transition-all w-40 sm:w-52"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowCreate(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white shadow-sm transition-all
                                bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800
                                hover:from-green-800 hover:to-green-950 dark:hover:from-green-700 dark:hover:to-green-900
                                active:scale-[.98]"
                        >
                            <Plus className="w-4 h-4" /> New Listing
                        </button>
                    </div>
                </div>

                {/* ── Stats row ── */}
                {!isLoading && !error && listings.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatCard icon={<Package className="w-4.5 h-4.5 text-green-700 dark:text-green-400" />} label="Total Listings" value={listings.length} />
                        <StatCard icon={<Tag className="w-4.5 h-4.5 text-green-700 dark:text-green-400" />} label="Available" value={available} sub={`${listings.length - available} sold/pending`} />
                        <StatCard icon={<Scale className="w-4.5 h-4.5 text-green-700 dark:text-green-400" />} label="Total Stock" value={`${totalQty.toLocaleString("en-IN")} kg`} />
                        <StatCard icon={<IndianRupee className="w-4.5 h-4.5 text-green-700 dark:text-green-400" />} label="Portfolio Value" value={`₹${totalValue.toLocaleString("en-IN")}`} />
                    </div>
                )}

                {/* ── Content ── */}
                {(!profileId || isLoading) ? (
                    <PageSkeleton type="grid" />
                ) : error ? (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-10 text-center">
                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                        <p className="text-[14px] font-semibold text-red-700 dark:text-red-400 mb-4">{error}</p>
                        <button type="button" onClick={fetchListings}
                            className="px-4 py-2 text-[13px] font-semibold rounded-xl border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors">
                            Try Again
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4
                        bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40 flex items-center justify-center">
                            <Wheat className="w-7 h-7 text-green-300 dark:text-green-700" />
                        </div>
                        <div className="text-center">
                            <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">
                                {searchQuery ? "No listings match your search" : "No listings yet"}
                            </p>
                            <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1">
                                {searchQuery ? "Try a different keyword" : "Create your first crop listing to start selling"}
                            </p>
                        </div>
                        {!searchQuery && (
                            <button type="button" onClick={() => setShowCreate(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white
                                    bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800
                                    hover:from-green-800 hover:to-green-950 transition-all shadow-sm">
                                <Plus className="w-4 h-4" /> Create Listing
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map(item => (
                            <ListingCard
                                key={item.id}
                                item={item}
                                onEdit={handleEditClick}
                                onDelete={handleDelete}
                                isDeleting={isDeleting === item.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Create Dialog ── */}
            <Dialog open={showCreate} onOpenChange={open => { setShowCreate(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-0 overflow-hidden">
                    {/* Dialog header accent */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-green-500 to-green-600" />
                    <div className="px-6 py-5">
                        <DialogHeader className="mb-5">
                            <DialogTitle className="flex items-center gap-2.5 text-[16px] font-bold text-slate-900 dark:text-white">
                                <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900/40 flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-green-700 dark:text-green-400" />
                                </div>
                                New Crop Listing
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <FormField label="Crop Name" required icon={<Wheat className="w-3.5 h-3.5" />}>
                                <Input
                                    value={cropName}
                                    onChange={e => setCropName(e.target.value)}
                                    placeholder="e.g. Wheat, Rice, Tomato"
                                    className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] focus:ring-2 focus:ring-green-400/20 focus:border-green-400 dark:focus:border-green-600"
                                />
                            </FormField>

                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Quantity (kg)" required icon={<Scale className="w-3.5 h-3.5" />}>
                                    <Input
                                        type="number"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value)}
                                        placeholder="100"
                                        className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] focus:ring-2 focus:ring-green-400/20 focus:border-green-400 dark:focus:border-green-600"
                                    />
                                </FormField>
                                <FormField label="Price / kg (₹)" required icon={<IndianRupee className="w-3.5 h-3.5" />}>
                                    <Input
                                        type="number"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                        placeholder="25"
                                        className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] focus:ring-2 focus:ring-green-400/20 focus:border-green-400 dark:focus:border-green-600"
                                    />
                                </FormField>
                            </div>

                            {/* Live total preview */}
                            {quantity && price && (
                                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/40">
                                    <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                    <span className="text-[12px] font-semibold text-green-800 dark:text-green-300">
                                        Estimated value: ₹{(parseFloat(quantity || "0") * parseFloat(price || "0")).toLocaleString("en-IN")}
                                    </span>
                                </div>
                            )}

                            <FormField label="Description" icon={<FileText className="w-3.5 h-3.5" />}>
                                <Input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Optional notes about quality, variety…"
                                    className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] focus:ring-2 focus:ring-green-400/20 focus:border-green-400 dark:focus:border-green-600"
                                />
                            </FormField>

                            <div className="flex gap-2.5 pt-1">
                                <button type="button" onClick={() => { setShowCreate(false); resetForm(); }}
                                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    Cancel
                                </button>
                                <button type="button" onClick={handleCreate} disabled={isSaving}
                                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white shadow-sm transition-all
                                        bg-gradient-to-br from-green-700 to-green-900 dark:from-green-600 dark:to-green-800
                                        hover:from-green-800 hover:to-green-950 disabled:opacity-50 disabled:cursor-not-allowed
                                        flex items-center justify-center gap-2">
                                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Create Listing
                                </button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Edit Dialog ── */}
            <Dialog open={showEdit} onOpenChange={open => { setShowEdit(open); if (!open) { setEditingId(null); resetForm(); } }}>
                <DialogContent className="sm:max-w-md rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-0 overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-blue-600" />
                    <div className="px-6 py-5">
                        <DialogHeader className="mb-5">
                            <DialogTitle className="flex items-center gap-2.5 text-[16px] font-bold text-slate-900 dark:text-white">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center">
                                    <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                Edit Listing
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <FormField label="Crop Name" required icon={<Wheat className="w-3.5 h-3.5" />}>
                                <Input
                                    value={cropName}
                                    onChange={e => setCropName(e.target.value)}
                                    placeholder="e.g. Wheat"
                                    className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 dark:focus:border-blue-600"
                                />
                            </FormField>

                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Quantity (kg)" required icon={<Scale className="w-3.5 h-3.5" />}>
                                    <Input
                                        type="number"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value)}
                                        placeholder="100"
                                        className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 dark:focus:border-blue-600"
                                    />
                                </FormField>
                                <FormField label="Price / kg (₹)" required icon={<IndianRupee className="w-3.5 h-3.5" />}>
                                    <Input
                                        type="number"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                        placeholder="25"
                                        className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 dark:focus:border-blue-600"
                                    />
                                </FormField>
                            </div>

                            {quantity && price && (
                                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/40">
                                    <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                    <span className="text-[12px] font-semibold text-green-800 dark:text-green-300">
                                        Estimated value: ₹{(parseFloat(quantity || "0") * parseFloat(price || "0")).toLocaleString("en-IN")}
                                    </span>
                                </div>
                            )}

                            <FormField label="Description" icon={<FileText className="w-3.5 h-3.5" />}>
                                <Input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Optional notes…"
                                    className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[13px] focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 dark:focus:border-blue-600"
                                />
                            </FormField>

                            <div className="flex gap-2.5 pt-1">
                                <button type="button" onClick={() => { setShowEdit(false); setEditingId(null); resetForm(); }}
                                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    Cancel
                                </button>
                                <button type="button" onClick={handleUpdate} disabled={isSaving}
                                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white shadow-sm transition-all
                                        bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        flex items-center justify-center gap-2">
                                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default MyCropListingsPage;