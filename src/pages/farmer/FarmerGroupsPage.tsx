import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import {
    useFarmerGroups, useJoinFarmerGroup, useLeaveFarmerGroup,
    useCreateFarmerGroup, useDeleteFarmerGroup, useRequestToJoinFarmerGroup,
} from "@/hooks/useFarmerGroups";
import { useFarmerProfile } from "@/hooks/useFarmerProfile";
import { FarmerGroupInsert } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
    Loader2, Users, LogIn, LogOut, MessageSquare, Plus, Trash,
    Search, MapPin, ChevronLeft, ChevronRight, X, Wheat, UsersRound,
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIndianLocations } from "@/hooks/useIndianLocations";
// @ts-expect-error - data-for-india lacks TypeScript definitions
import data from "data-for-india";

const STATES = Array.from(new Set(data.districts.map((d: any) => d.state))).sort() as string[];
const PAGE_SIZE = 8;

const normalize = (v: string | null | undefined) =>
    (v || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

const initials = (name: string) =>
    name?.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";

/* ─── reusable Tailwind combos ─────────────────────────────────────────── */

// Primary teal button (header level)
const btnPrimary =
    "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold " +
    "bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white " +
    "dark:bg-teal-500 dark:hover:bg-teal-600 dark:text-white " +
    "shadow-sm hover:shadow-md transition-all duration-150 whitespace-nowrap border border-transparent cursor-pointer";

// Ghost button (header — light outline on dark bg)
const btnGhost =
    "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold " +
    "bg-white/10 hover:bg-white/20 text-white border border-white/20 " +
    "transition-all duration-150 whitespace-nowrap cursor-pointer";

// Card button — solid dark (light) / white (dark)
const cbtnSolid =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold " +
    "bg-gray-900 hover:bg-gray-700 text-white " +
    "dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 " +
    "border border-transparent transition-all duration-150 cursor-pointer disabled:opacity-50";

// Card button — outline
const cbtnOutline =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold " +
    "bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 " +
    "dark:hover:bg-white/10 dark:text-gray-400 dark:hover:text-gray-100 " +
    "border border-gray-300 dark:border-gray-600 " +
    "transition-all duration-150 cursor-pointer disabled:opacity-50";

// Card button — danger
const cbtnDanger =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold " +
    "bg-transparent hover:bg-red-50 text-red-600 hover:text-red-700 " +
    "dark:hover:bg-red-950 dark:text-red-400 " +
    "border border-red-300 dark:border-red-800 " +
    "transition-all duration-150 cursor-pointer disabled:opacity-50";

// Card button — pending (static)
const cbtnPending =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold " +
    "bg-amber-50 text-amber-700 border border-amber-200 " +
    "dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 cursor-default";

/* ═══════════════════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════════════════ */
const FarmerGroupsPage = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [profileId, setProfileId]       = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newGroup, setNewGroup]         = useState<Partial<FarmerGroupInsert>>({});
    const [groupToLeave, setGroupToLeave] = useState<string | null>(null);
    const [searchQuery, setSearchQuery]   = useState("");
    const [currentPage, setCurrentPage]  = useState(1);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: farmerProfile, isLoading: farmerProfileLoading } = useFarmerProfile(profileId || "");
    const { data: groups, isLoading } = useFarmerGroups();
    const joinMutation        = useJoinFarmerGroup();
    const leaveMutation       = useLeaveFarmerGroup();
    const createGroupMutation = useCreateFarmerGroup();
    const deleteGroupMutation = useDeleteFarmerGroup();
    const requestJoinMutation = useRequestToJoinFarmerGroup();

    const currentFarmerTaluka = normalize((farmerProfile as any)?.taluka);

    const filteredGroups = groups?.filter((group: any) => {
        const isMember     = group.farmer_group_members?.some((m: any) => m.profile_id === profileId);
        const groupTaluka  = normalize(group?.taluka);
        const regionTaluka = normalize(group?.region?.split(",")?.[1]);
        const isSameTaluka = !!currentFarmerTaluka &&
            (groupTaluka === currentFarmerTaluka || regionTaluka === currentFarmerTaluka);
        if (!isMember && !isSameTaluka) return false;
        const q = searchQuery.toLowerCase();
        return !searchQuery ||
            group.name?.toLowerCase().includes(q) ||
            group.description?.toLowerCase().includes(q) ||
            group.region?.toLowerCase().includes(q);
    }) || [];

    useEffect(() => { setCurrentPage(1); }, [searchQuery, groups?.length]);

    const totalPages      = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
    const paginatedGroups = filteredGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const availableDistricts = data.districts
        .filter((d: any) => d.state === newGroup.state)
        .map((d: any) => d.district as string).sort();

    const { subDistricts: availableTalukas, villages: availableVillages, isLoading: locationsLoading } =
        useIndianLocations(newGroup.state || "", newGroup.district || "", newGroup.taluka || "");

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!profileId) return;
        if (!newGroup.taluka) { toast.error("Please select a taluka"); return; }
        createGroupMutation.mutate(
            {
                ...newGroup,
                region: [newGroup.village, newGroup.taluka, newGroup.district, newGroup.state].filter(Boolean).join(", "),
                created_by: profileId, soil_type: null, crop_type: null,
            } as FarmerGroupInsert,
            {
                onSuccess: () => {
                    toast.success("Group created!");
                    setIsCreateOpen(false);
                    setNewGroup({ name: "", description: "", state: "Maharashtra", district: "", taluka: "", village: "" });
                },
                onError: () => toast.error("Failed to create group"),
            }
        );
    };

    const handleRequestJoin = (groupId: string) => {
        if (!profileId) return;
        requestJoinMutation.mutate({ groupId, profileId }, {
            onSuccess: () => toast.success("Request sent!"),
            onError: (err: any) => toast.error(err.message || "Failed to send request"),
        });
    };

    const handleLeave = () => {
        if (!groupToLeave) return;
        leaveMutation.mutate({ groupId: groupToLeave, profileId: profileId! }, {
            onSuccess: () => { toast.success("Left group"); setGroupToLeave(null); },
            onError: () => toast.error("Failed to leave group"),
        });
    };

    const handleDelete = (groupId: string) => {
        if (!confirm("Delete this group? This cannot be undone.")) return;
        deleteGroupMutation.mutate(groupId, {
            onSuccess: () => toast.success("Group deleted"),
            onError: () => toast.error("Failed to delete group"),
        });
    };

    const joinedCount = filteredGroups.filter((g: any) =>
        g.farmer_group_members?.some((m: any) => m.profile_id === profileId)
    ).length;

    const loading = isLoading || farmerProfileLoading;

    /* ── Form field wrapper ─────────────────────────────────────────────── */
    const Field = ({ label, required, optional, children }: {
        label: string; required?: boolean; optional?: boolean; children: React.ReactNode;
    }) => (
        <div className="mb-3.5">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 tracking-wide">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
                {optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
            </label>
            {children}
        </div>
    );

    return (
        <DashboardLayout subtitle="Connect with farmers in your area through groups.">
            <div className="space-y-5">

                {/* ══ HEADER ════════════════════════════════════════════════ */}
                <div className="relative overflow-hidden rounded-2xl
                    bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800
                    dark:from-teal-800 dark:via-teal-900 dark:to-gray-900
                    border border-teal-500/30 dark:border-teal-700/50
                    shadow-lg shadow-teal-200/40 dark:shadow-teal-900/40
                    p-6 sm:p-8">

                    {/* decorative dots */}
                    <div className="absolute top-0 right-0 w-64 h-64 opacity-10
                        bg-[radial-gradient(circle_at_70%_30%,white_1px,transparent_1px)]
                        bg-[size:18px_18px] pointer-events-none" />

                    <div className="relative flex flex-col sm:flex-row sm:items-start
                        justify-between gap-5 flex-wrap">
                        <div>
                            {/* eyebrow */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                                bg-white/15 border border-white/25 text-white/90
                                text-[0.68rem] font-semibold tracking-widest uppercase mb-3">
                                <Wheat size={10} /> Farmer Network
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight mb-1">
                                Farmer Groups
                            </h1>
                            <p className="text-teal-100/80 text-sm font-normal">
                                Discover and connect with communities in your taluka
                            </p>
                        </div>

                        {/* CTA buttons */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <button className={btnGhost} onClick={() => navigate("/farmer/groups/direct?tab=chats")}>
                                <MessageSquare size={14} /> Chats &amp; Groups
                            </button>

                            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                <DialogTrigger asChild>
                                    <button className={`${btnPrimary} opacity-20 border-white/30`}>
                                        <Plus size={14} /> Create Group
                                    </button>
                                </DialogTrigger>

                                {/* ── Create Dialog ── */}
                                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle className="text-base font-bold">Create a New Group</DialogTitle>
                                        <DialogDescription className="text-xs">
                                            Fields marked <span className="text-red-500">*</span> are required.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-3" />

                                    <form onSubmit={handleCreate} className="space-y-0">
                                        <Field label="Group Name" required>
                                            <Input required value={newGroup.name || ""}
                                                onChange={e => setNewGroup(p => ({ ...p, name: e.target.value }))}
                                                placeholder="e.g. Latur Soybean Collective" />
                                        </Field>
                                        <Field label="Description">
                                            <Textarea value={newGroup.description || ""} rows={3}
                                                onChange={e => setNewGroup(p => ({ ...p, description: e.target.value }))}
                                                placeholder="What is this group about?" />
                                        </Field>
                                        <Field label="State" required>
                                            <Select value={newGroup.state}
                                                onValueChange={v => setNewGroup(p => ({ ...p, state: v, district: "", taluka: "", village: "" }))}>
                                                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                                                <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </Field>
                                        <Field label="District" required>
                                            <Select value={newGroup.district} disabled={!newGroup.state}
                                                onValueChange={v => setNewGroup(p => ({ ...p, district: v, taluka: "", village: "" }))}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={newGroup.state ? "Select district" : "Select state first"} />
                                                </SelectTrigger>
                                                <SelectContent>{availableDistricts.map((d: string) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </Field>
                                        <Field label="Taluka" required>
                                            <Select value={newGroup.taluka} disabled={!newGroup.district || locationsLoading}
                                                onValueChange={v => setNewGroup(p => ({ ...p, taluka: v, village: "" }))}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={
                                                        !newGroup.district ? "Select district first" :
                                                        locationsLoading ? "Loading…" :
                                                        availableTalukas.length === 0 ? "No talukas found" : "Select taluka"
                                                    } />
                                                </SelectTrigger>
                                                <SelectContent>{availableTalukas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </Field>
                                        <Field label="Village" optional>
                                            <Select value={newGroup.village} disabled={!newGroup.taluka || locationsLoading}
                                                onValueChange={v => setNewGroup(p => ({ ...p, village: v }))}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={
                                                        !newGroup.taluka ? "Select taluka first" :
                                                        locationsLoading ? "Loading…" :
                                                        availableVillages.length === 0 ? "No villages found" : "Select village"
                                                    } />
                                                </SelectTrigger>
                                                <SelectContent>{availableVillages.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </Field>

                                        <div className="pt-2">
                                            <Button type="submit" className="w-full" disabled={createGroupMutation.isPending}>
                                                {createGroupMutation.isPending
                                                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
                                                    : <><Plus className="mr-2 h-4 w-4" />Create Group</>}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                {/* ══ SEARCH ════════════════════════════════════════════════ */}
                <div className="relative">
                    <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                    />
                    <input
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm
                            bg-white dark:bg-gray-900
                            border border-gray-200 dark:border-gray-700
                            text-gray-900 dark:text-gray-100
                            placeholder:text-gray-400 dark:placeholder:text-gray-500
                            shadow-sm
                            focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20
                            transition-all duration-150"
                        placeholder="Search by name, description or location…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* ══ STAT PILLS ═══════════════════════════════════════════ */}
                {!loading && !!groups?.length && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                            bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
                            border border-gray-200 dark:border-gray-700">
                            <Users size={11} />
                            {filteredGroups.length} group{filteredGroups.length !== 1 ? "s" : ""} nearby
                        </span>
                        {joinedCount > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                                bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300
                                border border-teal-200 dark:border-teal-800">
                                <UsersRound size={11} /> {joinedCount} joined
                            </span>
                        )}
                    </div>
                )}

                {/* ══ BODY ══════════════════════════════════════════════════ */}

                {/* Loading */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-10 h-10 rounded-full border-[3px] border-gray-200 dark:border-gray-700 border-t-teal-500 animate-spin" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">Loading groups…</p>
                    </div>

                /* No groups at all */
                ) : !groups?.length ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center
                        rounded-2xl border-2 border-dashed
                        border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-900/50">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3
                            bg-teal-50 dark:bg-teal-950 text-teal-500 dark:text-teal-400
                            border border-teal-100 dark:border-teal-900">
                            <Users size={22} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">No Groups Yet</h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500">Be the first to create a group in your area.</p>
                    </div>

                /* No search results */
                ) : !filteredGroups.length ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center
                        rounded-2xl border-2 border-dashed
                        border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-900/50">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3
                            bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500
                            border border-gray-200 dark:border-gray-700">
                            <Search size={20} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">No Results Found</h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500">Try a different search term.</p>
                    </div>

                /* Cards grid */
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {paginatedGroups.map((group: any) => {
                                const isMember     = group.farmer_group_members?.some((m: any) => m.profile_id === profileId);
                                const hasRequested = group.requests?.some(
                                    (r: any) => r.profile_id === profileId && r.status === "pending"
                                );
                                const isCreator   = group.created_by === profileId;
                                const memberCount = group.farmer_group_members?.length || 0;
                                const locationStr = [group.village, group.taluka, group.district, group.state]
                                    .filter(Boolean).join(", ") || group.region || "—";

                                return (
                                    <div
                                        key={group.id}
                                        className={[
                                            "group relative flex flex-col rounded-2xl overflow-hidden",
                                            "bg-white dark:bg-gray-900",
                                            "border transition-all duration-200",
                                            "shadow-sm hover:shadow-md hover:-translate-y-1",
                                            isMember
                                                ? "border-teal-300 dark:border-teal-700 shadow-teal-100/60 dark:shadow-teal-900/40"
                                                : "border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700",
                                        ].join(" ")}
                                    >
                                        {/* Top accent bar — always visible for member, hover-only for others */}
                                        <div className={[
                                            "h-1 w-full transition-all duration-200",
                                            "bg-gradient-to-r from-teal-500 to-teal-400",
                                            isMember ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                                        ].join(" ")} />

                                        {/* Card body */}
                                        <div className="flex flex-col flex-1 p-5">
                                            {/* Head row */}
                                            <div className="flex items-start gap-3 mb-3">
                                                {/* Avatar */}
                                                <div className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center
                                                    bg-teal-50 dark:bg-teal-950
                                                    border border-teal-100 dark:border-teal-800
                                                    text-teal-700 dark:text-teal-300
                                                    text-sm font-bold select-none">
                                                    {initials(group.name)}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug truncate">
                                                        {group.name}
                                                    </h3>
                                                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                        <MapPin size={10} />
                                                        <span className="truncate">{locationStr}</span>
                                                    </div>
                                                </div>

                                                {/* Member count badge */}
                                                <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                                    text-[0.68rem] font-semibold
                                                    bg-gray-100 dark:bg-gray-800
                                                    text-gray-500 dark:text-gray-400
                                                    border border-gray-200 dark:border-gray-700">
                                                    <Users size={9} /> {memberCount}
                                                </span>
                                            </div>

                                            {/* Description */}
                                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed
                                                line-clamp-2 flex-1 mb-3">
                                                {group.description || "No description provided."}
                                            </p>

                                            {/* Pending tag */}
                                            {hasRequested && (
                                                <div className="mb-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
                                                        bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300
                                                        border border-amber-200 dark:border-amber-800">
                                                        ⏳ Request Pending
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px bg-gray-100 dark:bg-gray-800 mx-5" />

                                        {/* Footer actions */}
                                        <div className="flex flex-wrap items-center gap-2 px-5 py-3.5">
                                            {isMember ? (
                                                <>
                                                    <button className={cbtnSolid}
                                                        onClick={() => navigate(`/farmer/groups/${group.id}`)}>
                                                        <MessageSquare size={12} /> Open Chat
                                                    </button>
                                                    <button className={cbtnOutline}
                                                        onClick={() => setGroupToLeave(group.id)}>
                                                        <LogOut size={12} /> Leave
                                                    </button>
                                                    {isCreator && (
                                                        <button className={cbtnDanger}
                                                            onClick={() => handleDelete(group.id)}
                                                            disabled={deleteGroupMutation.isPending}>
                                                            <Trash size={12} /> Delete
                                                        </button>
                                                    )}
                                                </>
                                            ) : hasRequested ? (
                                                <span className={cbtnPending}>
                                                    <Loader2 size={11} className="animate-spin" /> Pending
                                                </span>
                                            ) : (
                                                <button className={cbtnSolid}
                                                    onClick={() => handleRequestJoin(group.id)}
                                                    disabled={requestJoinMutation.isPending}>
                                                    <LogIn size={12} /> Request to Join
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between flex-wrap gap-3
                                px-4 py-3 rounded-xl
                                bg-white dark:bg-gray-900
                                border border-gray-200 dark:border-gray-700
                                shadow-sm">
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredGroups.length)} of {filteredGroups.length}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        className="w-8 h-8 flex items-center justify-center rounded-lg
                                            border border-gray-200 dark:border-gray-700
                                            bg-gray-50 dark:bg-gray-800
                                            text-gray-600 dark:text-gray-400
                                            hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50
                                            dark:hover:border-teal-600 dark:hover:text-teal-400 dark:hover:bg-teal-950
                                            disabled:opacity-30 disabled:cursor-not-allowed
                                            transition-all duration-150 cursor-pointer"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-1">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        className="w-8 h-8 flex items-center justify-center rounded-lg
                                            border border-gray-200 dark:border-gray-700
                                            bg-gray-50 dark:bg-gray-800
                                            text-gray-600 dark:text-gray-400
                                            hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50
                                            dark:hover:border-teal-600 dark:hover:text-teal-400 dark:hover:bg-teal-950
                                            disabled:opacity-30 disabled:cursor-not-allowed
                                            transition-all duration-150 cursor-pointer"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ══ LEAVE DIALOG ══════════════════════════════════════════ */}
                <Dialog open={!!groupToLeave} onOpenChange={open => !open && setGroupToLeave(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold">Leave this group?</DialogTitle>
                            <DialogDescription className="text-sm leading-relaxed">
                                You'll need to send a new join request if you change your mind later.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 mt-2">
                            <Button variant="outline" onClick={() => setGroupToLeave(null)} disabled={leaveMutation.isPending}>
                                <X className="mr-2 h-4 w-4" /> Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleLeave} disabled={leaveMutation.isPending}>
                                {leaveMutation.isPending
                                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    : <LogOut className="h-4 w-4 mr-2" />}
                                Leave Group
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </DashboardLayout>
    );
};

export default FarmerGroupsPage;