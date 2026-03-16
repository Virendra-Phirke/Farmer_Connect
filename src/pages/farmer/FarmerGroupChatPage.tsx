import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import { useFarmerGroup, useFarmerGroupRequests, useUpdateFarmerGroupRequest } from "@/hooks/useFarmerGroups";
import { removeGroupMember } from "@/lib/api/farmer-groups";
import { useGroupMessages, useSendGroupMessage, useDeleteGroupMessage } from "@/hooks/useFarmerGroupMessages";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ArrowLeft, MoreVertical, Copy, Trash, Settings, Users, LogOut } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const FarmerGroupChatPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useUser();
    const [profileId, setProfileId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const { data: group, isLoading: groupLoading } = useFarmerGroup(id!);
    const { data: messages, isLoading: messagesLoading } = useGroupMessages(id!);
    const { data: requests } = useFarmerGroupRequests(id!);
    const sendMessageMutation = useSendGroupMessage();
    const deleteMessageMutation = useDeleteGroupMessage();
    const updateRequestMutation = useUpdateFarmerGroupRequest();

    // Hooks for admin actions
    const removeMemberMutation = { mutate: (args: any, config: any) => removeGroupMember(args.groupId, args.profileId).then(config.onSuccess).catch(config.onError) };

    const isCreator = group?.created_by === profileId;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !profileId || !id) return;

        sendMessageMutation.mutate({
            groupId: id,
            senderId: profileId,
            content: encryptMessage(newMessage.trim(), id),
        }, {
            onSuccess: () => setNewMessage(""),
        });
    };

    // Filter messages by search query
    const filteredMessages = messages?.filter((msg: any) => {
        const decrypted = decryptMessage(msg.content, id!);
        return decrypted.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.sender?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    }) || [];

    const handleCopy = (content: string) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(content)
                .then(() => toast.success("Message copied to clipboard"))
                .catch(() => {
                    // Fallback for browsers without clipboard support (older Brave versions, private mode)
                    const textArea = document.createElement("textarea");
                    textArea.value = content;
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand("copy");
                        toast.success("Message copied to clipboard");
                    } catch {
                        toast.error("Failed to copy message");
                    }
                    document.body.removeChild(textArea);
                });
        } else {
            // Fallback for browsers without clipboard API
            const textArea = document.createElement("textarea");
            textArea.value = content;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand("copy");
                toast.success("Message copied to clipboard");
            } catch {
                toast.error("Failed to copy message");
            }
            document.body.removeChild(textArea);
        }
    };

    const handleDeleteMessage = (messageId: string) => {
        if (!id) return;
        deleteMessageMutation.mutate({ messageId, groupId: id }, {
            onSuccess: () => toast.success("Message deleted"),
            onError: () => toast.error("Failed to delete message"),
        });
    };

    const handleRemoveMember = (memberProfileId: string) => {
        if (!id || !isCreator) return;
        if (confirm("Remove this member from the group?")) {
            removeMemberMutation.mutate({ groupId: id, profileId: memberProfileId }, {
                onSuccess: () => toast.success("Member removed"),
                onError: () => toast.error("Failed to remove member"),
            });
        }
    };

    const handleRequestDecision = (requestId: string, status: 'accepted' | 'rejected', profileId?: string) => {
        if (!id) return;
        updateRequestMutation.mutate({ requestId, status, groupId: id, profileId }, {
            onSuccess: () => toast.success(`Request ${status}`),
            onError: () => toast.error("Failed to update request"),
        });
    };

    if (groupLoading || messagesLoading) {
        return (
            <DashboardLayout subtitle="Loading group chat...">
                <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            </DashboardLayout>
        );
    }

    if (!group) {
        return (
            <DashboardLayout subtitle="Group not found.">
                <div className="text-center py-16">
                    <h2 className="text-xl font-semibold mb-4">Group Not Found</h2>
                    <Button onClick={() => navigate("/farmer/groups")}>Back to Groups</Button>
                </div>
            </DashboardLayout>
        );
    }

    // Check if the user is a member of the group
    const isMember = group.members?.some((m: any) => m.profile?.id === profileId);

    if (!isMember && profileId) {
        return (
            <DashboardLayout subtitle="Access Denied">
                <div className="text-center py-16">
                    <h2 className="text-xl font-semibold mb-4">You must be a member to view this chat.</h2>
                    <Button onClick={() => navigate("/farmer/groups")}>Back to Groups</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout subtitle={`Chatting in ${group.name}`}>
            <div className="flex flex-col h-[calc(100vh-12rem)] bg-card rounded-xl border border-border overflow-hidden">
                {/* Chat Header */}
                <div className="flex items-center p-4 border-b border-border bg-muted/50">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/farmer/groups")} className="mr-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="font-semibold">{group.name}</h2>
                        <p className="text-sm opacity-90">{(group as any)?.members?.length || (group as any)?.farmer_group_members?.length || 0} members</p>
                    </div>
                    {isCreator && (
                        <Dialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/20 relative">
                                        <Settings className="h-5 w-5" />
                                        {requests && requests.length > 0 && (
                                            <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 animate-pulse border-2 border-background" />
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DialogTrigger asChild>
                                        <DropdownMenuItem className="cursor-pointer">
                                            <Users className="mr-2 h-4 w-4" /> Manage Requests ({requests?.length || 0})
                                        </DropdownMenuItem>
                                    </DialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Join Requests</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    {!requests || requests.length === 0 ? (
                                        <p className="text-muted-foreground text-center">No pending requests.</p>
                                    ) : (
                                        requests.map((req) => (
                                            <div key={req.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                                                <div>
                                                    <p className="font-medium text-sm">{req.profile?.full_name || "Unknown Farmer"}</p>
                                                    <p className="text-xs text-muted-foreground">{req.profile?.location || "No location provided"}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleRequestDecision(req.id, 'rejected')}
                                                    >
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleRequestDecision(req.id, 'accepted', req.profile_id)}
                                                    >
                                                        Accept
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                {/* Search Messages */}
                <div className="p-4 border-b border-border bg-muted/30">
                    <SearchBar 
                        placeholder="Search messages..." 
                        onSearch={setSearchQuery} 
                    />
                </div>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {filteredMessages && filteredMessages.length > 0 ? (
                        filteredMessages.map((msg) => {
                            const isMe = msg.sender_id === profileId;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} group`}>
                                    {isMe && (
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleCopy(decryptMessage(msg.content, id!))}>
                                                        <Copy className="mr-2 h-4 w-4" /> Copy
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive focus:text-destructive">
                                                        <Trash className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm relative"}`}>
                                        {!isMe && (
                                            <>
                                                <div className="absolute -left-10 top-0 bottom-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start">
                                                            <DropdownMenuItem onClick={() => handleCopy(decryptMessage(msg.content, id!))}>
                                                                <Copy className="mr-2 h-4 w-4" /> Copy
                                                            </DropdownMenuItem>
                                                            {isCreator && (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive focus:text-destructive">
                                                                        <Trash className="mr-2 h-4 w-4" /> Delete Message
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleRemoveMember(msg.sender_id)} className="text-destructive focus:text-destructive">
                                                                        <LogOut className="mr-2 h-4 w-4" /> Remove Member
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                <p className="text-xs font-semibold mb-1 opacity-75">
                                                    {msg.sender?.full_name || "Unknown Farmer"}
                                                </p>
                                            </>
                                        )}
                                        <p className="text-sm break-words">{decryptMessage(msg.content, id!)}</p>
                                        <p className="text-[10px] opacity-50 text-right mt-1">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    ) : messages && messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            No messages yet. Be the first to say hi!
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            No messages match your search.
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-border flex gap-2 bg-background">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                    />
                    <Button type="submit" disabled={!newMessage.trim() || sendMessageMutation.isPending} size="icon">
                        {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </div>
        </DashboardLayout>
    );
};

export default FarmerGroupChatPage;
