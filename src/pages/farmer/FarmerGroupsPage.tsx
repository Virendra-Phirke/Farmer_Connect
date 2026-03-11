import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { useFarmerGroups, useJoinFarmerGroup, useLeaveFarmerGroup, useCreateFarmerGroup, useDeleteFarmerGroup } from "@/hooks/useFarmerGroups";
import { useFarmerProfile } from "@/hooks/useFarmerProfile";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, Users, LogIn, LogOut, MessageSquare, Plus, Lock, Trash } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// @ts-expect-error - The package's index.d.ts is malformed and not a module
import data from "data-for-india";

const STATES = Array.from(new Set(data.districts.map((d: any) => d.state))).sort() as string[];

const FarmerGroupsPage = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newGroup, setNewGroup] = useState({ name: "", description: "", state: "Maharashtra", district: "", taluka: "", village: "" });

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: farmerProfile } = useFarmerProfile(profileId);

    const { data: groups, isLoading } = useFarmerGroups();
    const joinMutation = useJoinFarmerGroup();
    const leaveMutation = useLeaveFarmerGroup();
    const createGroupMutation = useCreateFarmerGroup();
    const deleteGroupMutation = useDeleteFarmerGroup();

    const availableDistricts = data.districts
        .filter((d: any) => d.state === newGroup.state)
        .map((d: any) => d.district as string)
        .sort();

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!profileId) return;
        createGroupMutation.mutate({
            ...newGroup,
            region: [newGroup.village, newGroup.taluka, newGroup.district, newGroup.state].filter(Boolean).join(", "),
            created_by: profileId,
            soil_type: null,
            crop_type: null
        }, {
            onSuccess: () => {
                toast.success("Group created successfully!");
                setIsCreateOpen(false);
                setNewGroup({ name: "", description: "", state: "Maharashtra", district: "", taluka: "", village: "" });
            },
            onError: () => toast.error("Failed to create group"),
        });
    };

    const handleJoin = (groupId: string) => {
        if (!profileId) return;
        joinMutation.mutate({ groupId, profileId }, {
            onSuccess: () => toast.success("Joined group!"),
            onError: () => toast.error("Failed to join"),
        });
    };

    const handleLeave = (groupId: string) => {
        if (!profileId) return;
        leaveMutation.mutate({ groupId, profileId }, {
            onSuccess: () => toast.success("Left group"),
            onError: () => toast.error("Failed to leave"),
        });
    };

    const handleDeleteGroup = (groupId: string) => {
        if (confirm("Are you sure you want to delete this group? This cannot be undone.")) {
            deleteGroupMutation.mutate(groupId, {
                onSuccess: () => toast.success("Group deleted successfully"),
                onError: () => toast.error("Failed to delete group"),
            });
        }
    };

    return (
        <DashboardLayout subtitle="Connect with farmers in your area through groups.">
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Farmer Groups</h2>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> Create Group</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Farmer Group</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>Group Name *</Label>
                                    <Input required value={newGroup.name} onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Pune Wheat Farmers" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea value={newGroup.description} onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))} placeholder="What is this group about?" />
                                </div>
                                <div className="space-y-2">
                                    <Label>State *</Label>
                                    <Select
                                        value={newGroup.state}
                                        onValueChange={(v) => setNewGroup(prev => ({ ...prev, state: v, district: "" }))}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                                        <SelectContent>
                                            {STATES.map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>District *</Label>
                                    <Select
                                        value={newGroup.district}
                                        onValueChange={(v) => setNewGroup(prev => ({ ...prev, district: v }))}
                                        disabled={!newGroup.state}
                                    >
                                        <SelectTrigger><SelectValue placeholder={newGroup.state ? "Select district" : "Select state first"} /></SelectTrigger>
                                        <SelectContent>
                                            {availableDistricts.map(d => (
                                                <SelectItem key={d} value={d}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Taluka *</Label>
                                    <Input required value={newGroup.taluka} onChange={(e) => setNewGroup(prev => ({ ...prev, taluka: e.target.value }))} placeholder="e.g. Haveli" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Village</Label>
                                    <Input value={newGroup.village} onChange={(e) => setNewGroup(prev => ({ ...prev, village: e.target.value }))} placeholder="e.g. Manjari (optional)" />
                                </div>
                                <Button type="submit" className="w-full" disabled={createGroupMutation.isPending}>
                                    {createGroupMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Create Group
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : !groups?.length ? (
                    <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No farmer groups available yet.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {groups.map((group: any) => {
                            const isMember = group.farmer_group_members?.some((m: any) => m.profile_id === profileId);
                            const locationStr = [group.village, group.taluka, group.district, group.state].filter(Boolean).join(", ") || group.region;

                            // Check if current user is eligible to join based on location
                            const isEligibleLocation =
                                farmerProfile &&
                                group.state && group.district && group.taluka &&
                                farmerProfile.state?.toLowerCase() === group.state.toLowerCase() &&
                                farmerProfile.district?.toLowerCase() === group.district.toLowerCase() &&
                                farmerProfile.taluka?.toLowerCase() === group.taluka.toLowerCase();

                            const hasLocationData = group.state && group.district && group.taluka;
                            const isCreator = group.created_by === profileId;

                            return (
                                <div key={group.id} className="bg-card rounded-xl border border-border p-6">
                                    <h3 className="font-semibold text-lg mb-1">{group.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-2">{group.description || "No description"}</p>
                                    <div className="flex gap-3 text-xs text-muted-foreground mb-4">
                                        <span>📍 {locationStr}</span>
                                        <span>👥 {group.farmer_group_members?.length || 0} members</span>
                                    </div>
                                    {isMember ? (
                                        <div className="flex flex-wrap gap-2">
                                            <Button size="sm" onClick={() => navigate(`/farmer/groups/${group.id}`)}>
                                                <MessageSquare className="mr-2 h-4 w-4" /> Open Chat
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleLeave(group.id)} disabled={leaveMutation.isPending}>
                                                <LogOut className="mr-2 h-4 w-4" /> Leave Group
                                            </Button>
                                            {isCreator && (
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteGroup(group.id)} disabled={deleteGroupMutation.isPending}>
                                                    <Trash className="mr-2 h-4 w-4" /> Delete Group
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {isEligibleLocation || !hasLocationData ? (
                                                <Button size="sm" onClick={() => handleJoin(group.id)} disabled={joinMutation.isPending}>
                                                    <LogIn className="mr-2 h-4 w-4" /> Join Group
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="secondary" disabled className="opacity-70">
                                                    <Lock className="mr-2 h-4 w-4" /> Not in your area
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default FarmerGroupsPage;
