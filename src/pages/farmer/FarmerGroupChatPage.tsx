import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { getProfileId } from "@/lib/supabase-auth";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import { useFarmerGroup, useFarmerGroupRequests, useUpdateFarmerGroupRequest, useFarmerGroups, useJoinFarmerGroup, useLeaveFarmerGroup, useUpdateFarmerGroup } from "@/hooks/useFarmerGroups";
import { removeGroupMember, uploadGroupIcon } from "@/lib/api/farmer-groups";
import { useGroupMessages, useSendGroupMessage, useDeleteGroupMessage } from "@/hooks/useFarmerGroupMessages";
import { useDeleteDirectConversation, useDirectChatPartners, useDirectMessages, useSendDirectMessage } from "@/hooks/useFarmerDirectMessages";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, ArrowLeft, MoreVertical, Copy, Trash, Settings, Users, LogOut, Paperclip, X, Search, Link as LinkIcon, UserPlus, Home, Forward, Download } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const IMAGE_MESSAGE_PREFIX = "__IMG_JSON__";
type ParsedImageMessage = {
    image: string;
    caption: string;
};

const encodeImageMessage = (image: string, caption: string) =>
    `${IMAGE_MESSAGE_PREFIX}${JSON.stringify({ image, caption })}`;

const parseImageMessage = (value: string): ParsedImageMessage | null => {
    if (!value?.startsWith(IMAGE_MESSAGE_PREFIX)) return null;
    try {
        const parsed = JSON.parse(value.slice(IMAGE_MESSAGE_PREFIX.length));
        if (!parsed?.image || typeof parsed.image !== "string" || !parsed.image.startsWith("data:image/")) return null;
        return {
            image: parsed.image,
            caption: typeof parsed.caption === "string" ? parsed.caption : "",
        };
    } catch {
        return null;
    }
};

const FarmerGroupChatPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
    const activeDirectPeerId = new URLSearchParams(location.search).get("peer") || "";
    const activeDirectPeerName = new URLSearchParams(location.search).get("name") || "";
    const isDirectMode = id === "direct";
    const [profileId, setProfileId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageName, setSelectedImageName] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [groupSearchQuery, setGroupSearchQuery] = useState("");
    const [groupInfoOpen, setGroupInfoOpen] = useState(false);
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [editGroupName, setEditGroupName] = useState("");
    const [editGroupDescription, setEditGroupDescription] = useState("");
    const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
    const [showMobileChats, setShowMobileChats] = useState(false);
    const [forwardMessageId, setForwardMessageId] = useState<string | null>(null);
    const [forwardMessageContent, setForwardMessageContent] = useState<string>("");
    const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
    const [showSearchBar, setShowSearchBar] = useState(false);
    const [chatListTab, setChatListTab] = useState<"chats" | "groups">(() => {
        const q = new URLSearchParams(location.search).get("tab");
        return q === "groups" ? "groups" : "chats";
    });
    const [editGroupIcon, setEditGroupIcon] = useState<string | null>(null);
    const [isUploadingIcon, setIsUploadingIcon] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const groupIconInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user?.id) getProfileId(user.id).then(setProfileId);
    }, [user?.id]);

    const groupQueryId = !isDirectMode && id ? id : "";
    const { data: group, isLoading: groupLoading, refetch: refetchGroup } = useFarmerGroup(groupQueryId);
    const { data: allGroups, isLoading: groupsLoading } = useFarmerGroups();
    const { data: messages, isLoading: messagesLoading } = useGroupMessages(groupQueryId);
    const { data: directPartners, isLoading: directPartnersLoading } = useDirectChatPartners(profileId || "");
    const selectedDirectPeerId = activeDirectPeerId || (directPartners?.[0]?.profileId ?? "");
    const { data: directMessages, isLoading: directMessagesLoading } = useDirectMessages(profileId || "", selectedDirectPeerId);
    const { data: requests } = useFarmerGroupRequests(groupQueryId);
    const sendMessageMutation = useSendGroupMessage();
    const sendDirectMessageMutation = useSendDirectMessage();
    const deleteMessageMutation = useDeleteGroupMessage();
    const deleteDirectConversationMutation = useDeleteDirectConversation();
    const joinGroupMutation = useJoinFarmerGroup();
    const leaveGroupMutation = useLeaveFarmerGroup();
    const updateGroupMutation = useUpdateFarmerGroup();
    const updateRequestMutation = useUpdateFarmerGroupRequest();

    // Hooks for admin actions
    const removeMemberMutation = { mutate: (args: any, config: any) => removeGroupMember(args.groupId, args.profileId).then(config.onSuccess).catch(config.onError) };

    const isCreator = !isDirectMode && group?.created_by === profileId;
    const activeDirectPartner = (directPartners || []).find((p: any) => p.profileId === selectedDirectPeerId);
    const directHeaderName = decodeURIComponent(activeDirectPeerName || "") || activeDirectPartner?.fullName || "Direct Chat";
    const directHeaderAvatar = activeDirectPartner?.avatarUrl || null; // Default avatar if none is found
    const inviteJoinRequested = new URLSearchParams(location.search).get("join") === "1";
    const inviteLink = typeof window !== "undefined" && id
        ? `${window.location.origin}/farmer/groups/${id}?join=1`
        : "";

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const currentMessages = useMemo(
        () => (isDirectMode ? (directMessages || []) : (messages || [])),
        [isDirectMode, directMessages, messages]
    );

    useEffect(() => {
        scrollToBottom();
    }, [currentMessages]);

    useEffect(() => {
        if (!group) return;
        setEditGroupName(group.name || "");
        setEditGroupDescription(group.description || "");
    }, [group]);

    useEffect(() => {
        setShowMobileChats(false);
    }, [id]);

    useEffect(() => {
        const q = new URLSearchParams(location.search).get("tab");
        setChatListTab(q === "groups" ? "groups" : "chats");
    }, [location.search]);

    useEffect(() => {
        if (!isDirectMode || activeDirectPeerId) return;
        const firstDirectPartner = (directPartners || [])[0];
        if (!firstDirectPartner?.profileId) return;

        const params = new URLSearchParams(location.search);
        params.set("tab", params.get("tab") === "groups" ? "groups" : "chats");
        params.set("peer", firstDirectPartner.profileId);
        params.set("name", firstDirectPartner.fullName || "Farmer");
        navigate(`/farmer/groups/direct?${params.toString()}`, { replace: true });
    }, [isDirectMode, activeDirectPeerId, directPartners, location.search, navigate]);

    const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file.");
            return;
        }

        if (file.size > 4 * 1024 * 1024) {
            toast.error("Image is too large. Please select an image up to 4MB.");
            return;
        }

        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(new Error("Failed to read selected image."));
                reader.readAsDataURL(file);
            });

            setSelectedImage(dataUrl);
            setSelectedImageName(file.name);
        } catch {
            toast.error("Failed to process selected image.");
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!profileId || !id) return;

        const text = newMessage.trim();
        if (!text && !selectedImage) return;

        if (isDirectMode) {
            if (!text || !selectedDirectPeerId) return;
            sendDirectMessageMutation.mutate(
                {
                    senderId: profileId,
                    receiverId: selectedDirectPeerId,
                    content: text,
                },
                {
                    onSuccess: () => {
                        setNewMessage("");
                    },
                    onError: () => toast.error("Failed to send message"),
                }
            );
            return;
        }

        const payload = selectedImage ? encodeImageMessage(selectedImage, text) : text;

        sendMessageMutation.mutate({
            groupId: id,
            senderId: profileId,
            content: encryptMessage(payload, id),
        }, {
            onSuccess: () => {
                setNewMessage("");
                setSelectedImage(null);
                setSelectedImageName("");
                if (imageInputRef.current) imageInputRef.current.value = "";
            },
        });
    };

    // Filter messages by search query
    const filteredMessages = currentMessages.filter((msg: any) => {
        const decrypted = isDirectMode ? msg.content : decryptMessage(msg.content, id!);
        const parsedImage = parseImageMessage(decrypted);
        const searchableText = parsedImage
            ? `${parsedImage.caption} image photo pic picture`
            : decrypted;
        return searchableText.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.sender?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const memberGroups = (allGroups || []).filter((g: any) =>
        g.farmer_group_members?.some((m: any) => m.profile_id === profileId)
    );

    const filteredMemberGroups = memberGroups.filter((g: any) => {
        const q = groupSearchQuery.toLowerCase().trim();
        if (!q) return true;
        const location = [g.village, g.taluka, g.district, g.state].filter(Boolean).join(", ");
        return (
            String(g.name || "").toLowerCase().includes(q) ||
            String(g.description || "").toLowerCase().includes(q) ||
            location.toLowerCase().includes(q)
        );
    });

    const directMemberGroupsBase = useMemo(() => {
        const q = groupSearchQuery.toLowerCase().trim();
        return (directPartners || [])
            .filter((p: any) => String(p.fullName || "").toLowerCase().includes(q))
            .map((p: any) => ({
                id: `direct:${p.profileId}`,
                name: p.fullName,
                description: "Direct chat",
                icon_url: null,
                creator: { avatar_url: p.avatarUrl },
                farmer_group_members: [{}, {}],
                __direct: true,
                __peerId: p.profileId,
            }));
    }, [directPartners, groupSearchQuery]);

    const directMemberGroups = useMemo(() => {
        const list = [...directMemberGroupsBase];
        if (isDirectMode && selectedDirectPeerId && !list.some((g: any) => g.__peerId === selectedDirectPeerId)) {
            list.unshift({
                id: `direct:${selectedDirectPeerId}`,
                name: decodeURIComponent(activeDirectPeerName || "") || activeDirectPartner?.fullName || "Farmer",
                description: "Direct chat",
                icon_url: null,
                creator: { avatar_url: activeDirectPartner?.avatarUrl || null },
                farmer_group_members: [{}, {}],
                __direct: true,
                __peerId: selectedDirectPeerId,
            });
        }
        return list;
    }, [directMemberGroupsBase, isDirectMode, selectedDirectPeerId, activeDirectPeerName, activeDirectPartner]);

    const communityMemberGroups = filteredMemberGroups;
    const visibleMemberGroups = useMemo(
        () => (chatListTab === "chats" ? directMemberGroups : communityMemberGroups),
        [chatListTab, directMemberGroups, communityMemberGroups]
    );

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

    const handleDownloadImage = (imageDataUrl: string, messageId: string) => {
        try {
            const link = document.createElement("a");
            link.href = imageDataUrl;
            link.download = `group-image-${messageId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Image download started");
        } catch {
            toast.error("Failed to download image");
        }
    };

    const handleLeaveGroup = () => {
        if (!id || !profileId) return;
        if (!confirm("Are you sure you want to leave this group?")) return;

        leaveGroupMutation.mutate(
            { groupId: id, profileId },
            {
                onSuccess: () => {
                    toast.success("You left the group");
                    setGroupInfoOpen(false);
                    navigate("/farmer/groups");
                },
                onError: () => toast.error("Failed to leave group"),
            }
        );
    };

    const handleDeleteDirectConversation = (peerId?: string, peerName?: string) => {
        const targetPeerId = peerId || selectedDirectPeerId;
        if (!profileId || !targetPeerId) return;
        if (!confirm(`Delete conversation with ${peerName || directHeaderName || "this farmer"}?`)) return;

        deleteDirectConversationMutation.mutate(
            { currentProfileId: profileId, otherProfileId: targetPeerId },
            {
                onSuccess: () => {
                    toast.success("Conversation deleted");
                    if (isDirectMode && targetPeerId === selectedDirectPeerId) {
                        navigate("/farmer/groups/direct?tab=chats");
                    }
                },
                onError: () => toast.error("Failed to delete conversation"),
            }
        );
    };

    const countLines = (text: string): number => {
        if (!text) return 0;
        return text.split("\n").length;
    };

    const truncateMessage = (text: string, maxLines: number = 20, maxChars: number = 1000): string => {
        const lines = text.split("\n");
        const lineCapped = lines.length > maxLines
            ? lines.slice(0, maxLines).join("\n")
            : text;

        if (lineCapped.length > maxChars) {
            return `${lineCapped.slice(0, maxChars)}...`;
        }

        return lineCapped;
    };

    const shouldShowReadMore = (text: string, maxLines: number = 20, maxChars: number = 1000): boolean => {
        const lines = countLines(text);
        return lines > maxLines || text.length > maxChars;
    };

    const isLongVisualLine = (text: string): boolean => {
        return text.length > 700;
    };

    const shouldCollapseMessage = (text: string): boolean => {
        return shouldShowReadMore(text, 20, 1000) || isLongVisualLine(text);
    };

    const toggleMessageExpansion = (messageId: string) => {
        const newExpanded = new Set(expandedMessages);
        if (newExpanded.has(messageId)) {
            newExpanded.delete(messageId);
        } else {
            newExpanded.add(messageId);
        }
        setExpandedMessages(newExpanded);
    };

    const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, 120);
        textarea.style.height = `${newHeight}px`;
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewMessage(e.target.value);
        adjustTextareaHeight(e.target);
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
                onSuccess: () => {
                    toast.success("Member removed");
                    refetchGroup();
                },
                onError: () => toast.error("Failed to remove member"),
            });
        }
    };

    const handleForward = (messageId: string, content: string) => {
        setForwardMessageId(messageId);
        setForwardMessageContent(content);
        setForwardDialogOpen(true);
    };

    const handleSendForwardedMessage = (targetGroupId: string) => {
        if (!profileId || !forwardMessageContent) return;

        const forwardedContent = `[Forwarded]\n${forwardMessageContent}`;
        const payload = parseImageMessage(forwardMessageContent)
            ? forwardMessageContent
            : forwardedContent;

        sendMessageMutation.mutate({
            groupId: targetGroupId,
            senderId: profileId,
            content: encryptMessage(payload, targetGroupId),
        }, {
            onSuccess: () => {
                toast.success("Message forwarded successfully");
                setForwardDialogOpen(false);
                setForwardMessageId(null);
                setForwardMessageContent("");
            },
            onError: () => toast.error("Failed to forward message"),
        });
    };

    const handleCopyInviteLink = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            toast.success("Invite link copied");
        } catch {
            const textArea = document.createElement("textarea");
            textArea.value = inviteLink;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand("copy");
                toast.success("Invite link copied");
            } catch {
                toast.error("Failed to copy invite link");
            }
            document.body.removeChild(textArea);
        }
    };

    const handleJoinFromInvite = () => {
        if (!id || !profileId) return;
        joinGroupMutation.mutate(
            { groupId: id, profileId },
            {
                onSuccess: () => {
                    toast.success("Joined group successfully");
                    refetchGroup();
                    navigate(`/farmer/groups/${id}`, { replace: true });
                },
                onError: (e: any) => toast.error(e?.message || "Failed to join group"),
            }
        );
    };

    const handleRequestDecision = (requestId: string, status: 'accepted' | 'rejected', profileId?: string) => {
        if (!id) return;
        updateRequestMutation.mutate({ requestId, status, groupId: id, profileId }, {
            onSuccess: () => toast.success(`Request ${status}`),
            onError: () => toast.error("Failed to update request"),
        });
    };

    const handleSaveGroupDetails = () => {
        if (!id || !isCreator) return;
        const name = editGroupName.trim();
        const description = editGroupDescription.trim();
        if (!name) {
            toast.error("Group name is required");
            return;
        }

        updateGroupMutation.mutate(
            { id, updates: { name, description: description || null } },
            {
                onSuccess: () => {
                    toast.success("Group updated");
                    setIsEditingGroup(false);
                    refetchGroup();
                },
                onError: () => toast.error("Failed to update group"),
            }
        );
    };

    const handleGroupIconPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file.");
            return;
        }

        if (file.size > 4 * 1024 * 1024) {
            toast.error("Image is too large. Please select an image up to 4MB.");
            return;
        }

        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(new Error("Failed to read selected image."));
                reader.readAsDataURL(file);
            });

            setEditGroupIcon(dataUrl);
        } catch {
            toast.error("Failed to process selected image.");
        }
    };

    const handleSaveGroupIcon = async () => {
        if (!id || !isCreator || !editGroupIcon) return;
        
        setIsUploadingIcon(true);
        try {
            // Convert base64 to File
            const base64Data = editGroupIcon.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const file = new File([byteArray], `group-icon-${id}.png`, { type: 'image/png' });

            // Upload to Supabase Storage
            const iconUrl = await uploadGroupIcon(id, file);

            // Update database with new icon URL
            await updateGroupMutation.mutateAsync(
                { id, updates: { icon_url: iconUrl } as any },
                {
                    onSuccess: () => {
                        toast.success("Group icon updated");
                        setEditGroupIcon(null);
                        if (groupIconInputRef.current) groupIconInputRef.current.value = "";
                        refetchGroup();
                    },
                    onError: () => toast.error("Failed to update group icon"),
                }
            );
        } catch (error) {
            console.error("Error uploading icon:", error);
            toast.error("Failed to upload group icon");
        } finally {
            setIsUploadingIcon(false);
        }
    };

    if ((!isDirectMode && (groupLoading || messagesLoading)) || (isDirectMode && directMessagesLoading && !directMessages)) {
        return (
            <DashboardLayout subtitle="Loading group chat...">
                <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            </DashboardLayout>
        );
    }

    if (!isDirectMode && !group) {
        return (
            <DashboardLayout subtitle="Group not found." hidePageActions hideWelcomeSection>
                <div className="text-center py-16">
                    <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Group Not Found</h2>
                    <Button onClick={() => navigate("/farmer/groups")}>Back to Groups</Button>
                </div>
            </DashboardLayout>
        );
    }

    // Check if the user is a member of the group
    const isMember = isDirectMode ? true : group?.members?.some((m: any) => m.profile?.id === profileId);

    if (!isDirectMode && !isMember && profileId) {
        if (inviteJoinRequested) {
            return (
                <DashboardLayout subtitle="Group Invite" hidePageActions hideWelcomeSection>
                    <div className="max-w-xl mx-auto mt-10 bg-card border border-border rounded-2xl p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Join {group.name}</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">You were invited to this group. Tap below to join directly.</p>
                        <div className="flex items-center gap-2">
                            <Button onClick={handleJoinFromInvite} disabled={joinGroupMutation.isPending}>
                                {joinGroupMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                                Join Group
                            </Button>
                            <Button variant="outline" onClick={() => navigate("/farmer/groups")}>Back to Groups</Button>
                        </div>
                    </div>
                </DashboardLayout>
            );
        }

        return (
            <DashboardLayout subtitle="Access Denied" hidePageActions hideWelcomeSection>
                <div className="text-center py-16">
                    <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">You must be a member to view this chat.</h2>
                    <Button onClick={() => navigate("/farmer/groups")}>Back to Groups</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout subtitle={`Chatting in ${isDirectMode ? directHeaderName : group?.name}`} hidePageActions hideWelcomeSection>
            <div className="h-[calc(100vh-8rem)] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950 shadow-sm flex">
                {/* Left Chat List Panel */}
                <aside className="hidden lg:flex w-[340px] border-r border-zinc-200 dark:border-zinc-800 bg-[#f7f8fa] dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex-col">
                    <div className="px-4 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate("/farmer-dashboard")}
                                    className="text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700"
                                >
                                    <Home className="h-4 w-4 mr-2" /> Home
                                </Button>
                                <h2 className="text-[28px] leading-none font-medium">Chats</h2>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
                                onClick={() => navigate("/farmer/groups")}
                                title="Open groups"
                            >
                                <Users className="h-4 w-4" />
                            </Button>
                        </div>

                        <Input
                            value={groupSearchQuery}
                            onChange={(e) => setGroupSearchQuery(e.target.value)}
                            placeholder="Search or start a new chat"
                            className="h-9 text-sm bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-lg"
                        />

                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant={chatListTab === "chats" ? "default" : "outline"}
                                onClick={() => setChatListTab("chats")}
                            >
                                Chats ({directMemberGroups.length})
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={chatListTab === "groups" ? "default" : "outline"}
                                onClick={() => setChatListTab("groups")}
                            >
                                Groups ({communityMemberGroups.length})
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {(chatListTab === "groups" ? groupsLoading : directPartnersLoading) ? (
                            <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">Loading chats...</div>
                        ) : visibleMemberGroups.length === 0 ? (
                            <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
                                {chatListTab === "chats" ? "No direct chats found." : "No groups found."}
                            </div>
                        ) : (
                            visibleMemberGroups.map((g: any) => {
                                const isActiveGroup = g.__direct ? (isDirectMode && g.__peerId === selectedDirectPeerId) : g.id === id;
                                const preview = g.description || [g.village, g.taluka, g.district].filter(Boolean).join(", ") || "Tap to open chat";
                                const memberCount = g.farmer_group_members?.length || 0;
                                return (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => {
                                            if (g.__direct) {
                                                navigate(`/farmer/groups/direct?tab=chats&peer=${g.__peerId}&name=${encodeURIComponent(g.name || "Farmer")}`);
                                            } else {
                                                navigate(`/farmer/groups/${g.id}`);
                                            }
                                        }}
                                        className={`w-full text-left px-3 py-3 border-b border-zinc-100 dark:border-zinc-800 transition-colors relative ${
                                            isActiveGroup ? "bg-[#e9edef] dark:bg-zinc-800" : "hover:bg-[#f0f2f5] dark:hover:bg-zinc-800/70"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {g.icon_url ? (
                                                <img src={g.icon_url} alt={g.name || "Group"} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                            ) : g.creator?.avatar_url ? (
                                                <img src={g.creator.avatar_url} alt={g.name || "Group"} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold flex-shrink-0">
                                                    {String(g.name || "G").slice(0, 1).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-medium truncate">{g.name}</p>
                                                    {!g.__direct && <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex-shrink-0">{memberCount} members</span>}
                                                </div>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{preview}</p>
                                            </div>
                                        </div>
                                        {g.__direct && (
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleDeleteDirectConversation(g.__peerId, g.name);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDeleteDirectConversation(g.__peerId, g.name);
                                                    }
                                                }}
                                                title="Delete conversation"
                                                aria-label="Delete conversation"
                                            >
                                                <Trash className="h-4 w-4 text-destructive" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* Mobile Chat List Drawer */}
                <div
                    className={`lg:hidden fixed inset-0 z-40 bg-black/40 transition-opacity ${showMobileChats ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                    onClick={() => setShowMobileChats(false)}
                />
                <aside
                    className={`lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[88%] max-w-[360px] border-r border-zinc-200 dark:border-zinc-800 bg-[#f7f8fa] dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex flex-col transition-transform duration-300 ${showMobileChats ? "translate-x-0" : "-translate-x-full"}`}
                >
                    <div className="px-4 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowMobileChats(false);
                                        navigate("/farmer-dashboard");
                                    }}
                                    className="text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700"
                                >
                                    <Home className="h-4 w-4 mr-2" /> Home
                                </Button>
                                <h2 className="text-[28px] leading-none font-medium">Chats</h2>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
                                onClick={() => setShowMobileChats(false)}
                                title="Close chats"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </div>

                        <Input
                            value={groupSearchQuery}
                            onChange={(e) => setGroupSearchQuery(e.target.value)}
                            placeholder="Search or start a new chat"
                            className="h-9 text-sm bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 rounded-lg"
                        />

                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant={chatListTab === "chats" ? "default" : "outline"}
                                onClick={() => setChatListTab("chats")}
                            >
                                Chats ({directMemberGroups.length})
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={chatListTab === "groups" ? "default" : "outline"}
                                onClick={() => setChatListTab("groups")}
                            >
                                Groups ({communityMemberGroups.length})
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {(chatListTab === "groups" ? groupsLoading : directPartnersLoading) ? (
                            <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">Loading chats...</div>
                        ) : visibleMemberGroups.length === 0 ? (
                            <div className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
                                {chatListTab === "chats" ? "No direct chats found." : "No groups found."}
                            </div>
                        ) : (
                            visibleMemberGroups.map((g: any) => {
                                const isActiveGroup = g.__direct ? (isDirectMode && g.__peerId === selectedDirectPeerId) : g.id === id;
                                const preview = g.description || [g.village, g.taluka, g.district].filter(Boolean).join(", ") || "Tap to open chat";
                                const memberCount = g.farmer_group_members?.length || 0;
                                return (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => {
                                            if (g.__direct) {
                                                navigate(`/farmer/groups/direct?tab=chats&peer=${g.__peerId}&name=${encodeURIComponent(g.name || "Farmer")}`);
                                            } else {
                                                navigate(`/farmer/groups/${g.id}`);
                                            }
                                            setShowMobileChats(false);
                                        }}
                                        className={`w-full text-left px-3 py-3 border-b border-zinc-100 dark:border-zinc-800 transition-colors relative ${
                                            isActiveGroup ? "bg-[#e9edef] dark:bg-zinc-800" : "hover:bg-[#f0f2f5] dark:hover:bg-zinc-800/70"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {g.icon_url ? (
                                                <img src={g.icon_url} alt={g.name || "Group"} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                            ) : g.creator?.avatar_url ? (
                                                <img src={g.creator.avatar_url} alt={g.name || "Group"} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold flex-shrink-0">
                                                    {String(g.name || "G").slice(0, 1).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-medium truncate">{g.name}</p>
                                                    {!g.__direct && <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex-shrink-0">{memberCount} members</span>}
                                                </div>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{preview}</p>
                                            </div>
                                        </div>
                                        {g.__direct && (
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleDeleteDirectConversation(g.__peerId, g.name);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDeleteDirectConversation(g.__peerId, g.name);
                                                    }
                                                }}
                                                title="Delete conversation"
                                                aria-label="Delete conversation"
                                            >
                                                <Trash className="h-4 w-4 text-destructive" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* Right Chat Panel */}
                <section className="flex-1 min-w-0 flex flex-col bg-[#efeae2] dark:bg-zinc-900">
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-black/10 bg-[#075e54] text-white">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowMobileChats(true)}
                        className="text-white hover:bg-white/10 hover:text-white lg:hidden"
                        title="Chats"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>

                    {isDirectMode ? (
                        directHeaderAvatar ? (
                            <img
                                src={directHeaderAvatar}
                                alt={directHeaderName}
                                className="w-10 h-10 rounded-full object-cover border border-white/20"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center font-semibold text-sm">
                                {String(directHeaderName || "F").slice(0, 1).toUpperCase()}
                            </div>
                        )
                    ) : ((group as any)?.icon_url || editGroupIcon ? (
                        <img
                            src={editGroupIcon || (group as any)?.icon_url}
                            alt={group.name || "Group"}
                            className="w-10 h-10 rounded-full object-cover border border-white/20"
                        />
                    ) : group?.creator?.avatar_url ? (
                        <img
                            src={group.creator.avatar_url}
                            alt={group.name || "Group"}
                            className="w-10 h-10 rounded-full object-cover border border-white/20"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center font-semibold text-sm">
                            {String(group.name || "G").slice(0, 1).toUpperCase()}
                        </div>
                    ))}

                    <div className="min-w-0 flex-1">
                        <h2 className="font-semibold truncate">{isDirectMode ? directHeaderName : group.name}</h2>
                        <p className="text-xs text-white/85">
                            {isDirectMode ? "Direct message" : ((group as any)?.members?.length || (group as any)?.farmer_group_members?.length || 0) + " members"}
                        </p>
                    </div>

                    {!isDirectMode && (
                    <Dialog open={groupInfoOpen} onOpenChange={setGroupInfoOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" title="Group info">
                                <Users className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Group info</DialogTitle>
                                <DialogDescription>
                                    View and manage group details, icon, invite link, and members.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 pt-2">
                                {/* Group Icon Section */}
                                <div className="rounded-lg border border-border p-3 space-y-2">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Group Icon</p>
                                    <div className="flex items-center gap-3">
                                        {editGroupIcon || (group as any)?.icon_url ? (
                                            <img
                                                src={editGroupIcon || (group as any)?.icon_url}
                                                alt="Group icon"
                                                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-xl">
                                                {String(group.name || "G").slice(0, 1).toUpperCase()}
                                            </div>
                                        )}
                                        {isCreator && (
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    ref={groupIconInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleGroupIconPick}
                                                    aria-label="Upload group icon"
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => groupIconInputRef.current?.click()}
                                                >
                                                    Change Icon
                                                </Button>
                                                {editGroupIcon && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleSaveGroupIcon}
                                                        disabled={isUploadingIcon}
                                                    >
                                                        {isUploadingIcon ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                                        Save Icon
                                                    </Button>
                                                )}
                                                {editGroupIcon && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditGroupIcon(null);
                                                            if (groupIconInputRef.current) groupIconInputRef.current.value = "";
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border p-3 space-y-2">
                                    {isCreator && isEditingGroup ? (
                                        <>
                                            <Input
                                                value={editGroupName}
                                                onChange={(e) => setEditGroupName(e.target.value)}
                                                placeholder="Group name"
                                                className="h-9"
                                            />
                                            <Input
                                                value={editGroupDescription}
                                                onChange={(e) => setEditGroupDescription(e.target.value)}
                                                placeholder="Group description"
                                                className="h-9"
                                            />
                                            <div className="flex gap-2">
                                                <Button type="button" size="sm" onClick={handleSaveGroupDetails} disabled={updateGroupMutation.isPending}>
                                                    {updateGroupMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                                    Save
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsEditingGroup(false);
                                                        setEditGroupName(group.name || "");
                                                        setEditGroupDescription(group.description || "");
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-medium text-zinc-900 dark:text-zinc-100">{group.name}</p>
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{group.description || "No description"}</p>
                                            {isCreator && (
                                                <Button type="button" size="sm" variant="outline" onClick={() => setIsEditingGroup(true)}>
                                                    Edit Group
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>

                                {isCreator && (
                                    <div className="rounded-lg border border-border p-3 space-y-2">
                                        <p className="text-sm font-medium flex items-center gap-2 text-zinc-900 dark:text-zinc-100"><LinkIcon className="h-4 w-4" /> Invite link</p>
                                        <div className="flex gap-2">
                                            <Input value={inviteLink} readOnly className="h-9 text-xs" />
                                            <Button type="button" onClick={handleCopyInviteLink} className="h-9">Copy</Button>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <p className="text-sm font-medium mb-2 text-zinc-900 dark:text-zinc-100">Members ({(group as any)?.members?.length || 0})</p>
                                    <div className="space-y-2">
                                        {((group as any)?.members || []).map((m: any) => {
                                            const memberId = m.profile?.id;
                                            const isAdmin = memberId === group.created_by;
                                            return (
                                                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                                                    {m.profile?.avatar_url ? (
                                                        <img
                                                            src={m.profile.avatar_url}
                                                            alt={m.profile?.full_name || "Member"}
                                                            className="w-9 h-9 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-semibold">
                                                            {String(m.profile?.full_name || "U").slice(0, 1).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">{m.profile?.full_name || "Unknown member"}</p>
                                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{m.profile?.location || "No location"}</p>
                                                    </div>
                                                    {isAdmin && <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Admin</span>}
                                                    {isCreator && !isAdmin && (
                                                        <Button variant="destructive" size="sm" onClick={() => handleRemoveMember(memberId)}>
                                                            Remove
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-border">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={handleLeaveGroup}
                                        disabled={leaveGroupMutation.isPending}
                                    >
                                        {leaveGroupMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
                                        Leave Group
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    )}

                    {isDirectMode && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDeleteDirectConversation()} className="text-destructive focus:text-destructive">
                                    <Trash className="mr-2 h-4 w-4" /> Delete Conversation
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSearchBar(!showSearchBar)}
                        className="text-white hover:bg-white/10 hover:text-white"
                        title="Search messages"
                    >
                        <Search className="h-5 w-5" />
                    </Button>

                    {isCreator && (
                        <Dialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white relative">
                                        <Settings className="h-5 w-5" />
                                        {requests && requests.length > 0 && (
                                            <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 animate-pulse border-2 border-[#075e54]" />
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
                                    <DialogDescription>
                                        Review and manage pending requests to join this group.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    {!requests || requests.length === 0 ? (
                                        <p className="text-zinc-600 dark:text-zinc-400 text-center">No pending requests.</p>
                                    ) : (
                                        requests.map((req) => (
                                            <div key={req.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                                                <div>
                                                    <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{req.profile?.full_name || "Unknown Farmer"}</p>
                                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{req.profile?.location || "No location provided"}</p>
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

                {/* Search Messages - Conditional */}
                {showSearchBar && (
                    <div className="p-2 border-b border-black/10 dark:border-zinc-800 bg-[#f0f2f5] dark:bg-zinc-900 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="relative">
                            <Search className="h-4 w-4 text-zinc-500 dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search messages..."
                                className="h-8 pl-9 text-sm rounded-full bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                                autoFocus
                            />
                        </div>
                    </div>
                )}

                {/* Messages Area */}                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2.5">
                    {filteredMessages && filteredMessages.length > 0 ? (
                        filteredMessages.map((msg) => {
                            const isMe = msg.sender_id === profileId;
                            const decrypted = decryptMessage(msg.content, id!);
                            const parsedImage = parseImageMessage(decrypted);
                            const senderName = msg.sender?.full_name || "Unknown Farmer";
                            const copyText = parsedImage ? (parsedImage.caption || "[Image]") : decrypted;
                            return (
                                <div key={msg.id} className={`group flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                                    {!isMe && (
                                        msg.sender?.avatar_url ? (
                                            <img
                                                src={msg.sender.avatar_url}
                                                alt={senderName}
                                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-[#d9fdd3] text-emerald-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                                                {String(senderName).slice(0, 1).toUpperCase()}
                                            </div>
                                        )
                                    )}

                                    <div
                                        className={`relative max-w-[84%] sm:max-w-[76%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                                            isMe
                                                ? "bg-[#d9fdd3] dark:bg-emerald-900 text-zinc-900 dark:text-emerald-50 rounded-br-md"
                                                : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md"
                                        }`}
                                    >
                                        {!isMe && (
                                            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                                                {senderName}
                                            </p>
                                        )}

                                        {parsedImage ? (
                                            <>
                                                <img
                                                    src={parsedImage.image}
                                                    alt="Shared"
                                                    className="max-h-64 w-full object-cover rounded-xl border border-black/10"
                                                    loading="lazy"
                                                />
                                                {parsedImage.caption && (
                                                    <p className={`text-sm break-words whitespace-pre-wrap mt-2 ${isMe ? "text-zinc-900 dark:text-emerald-50" : "text-zinc-900 dark:text-zinc-100"}`}>{parsedImage.caption}</p>
                                                )}
                                            </>
                                        ) : (
                                            <div>
                                                {(() => {
                                                    const isExpanded = expandedMessages.has(msg.id);
                                                    const shouldTruncate = shouldCollapseMessage(decrypted);
                                                    const displayText = isExpanded ? decrypted : truncateMessage(decrypted, 20, 1000);
                                                    
                                                    return (
                                                        <>
                                                            <p className={`text-sm break-words whitespace-pre-wrap ${isMe ? "text-zinc-900 dark:text-emerald-50" : "text-zinc-900 dark:text-zinc-100"}`}>{displayText}</p>
                                                            {shouldTruncate && !isExpanded && (
                                                                <button
                                                                    onClick={() => toggleMessageExpansion(msg.id)}
                                                                    className={`text-xs font-semibold mt-2 ${isMe ? "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200" : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"}`}
                                                                >
                                                                    Read more
                                                                </button>
                                                            )}
                                                            {shouldTruncate && isExpanded && (
                                                                <button
                                                                    onClick={() => toggleMessageExpansion(msg.id)}
                                                                    className={`text-xs font-semibold mt-2 ${isMe ? "text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200" : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"}`}
                                                                >
                                                                    Show less
                                                                </button>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        <div className="mt-1.5 flex items-center justify-end gap-1">
                                            <span className={`text-[10px] opacity-60 ${isMe ? "text-zinc-900 dark:text-emerald-100" : "text-zinc-600 dark:text-zinc-400"}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100"
                                                    >
                                                        <MoreVertical className="h-3.5 w-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align={isMe ? "end" : "start"}>
                                                    <DropdownMenuItem onClick={() => handleCopy(copyText)}>
                                                        <Copy className="mr-2 h-4 w-4" /> Copy
                                                    </DropdownMenuItem>
                                                    {parsedImage && (
                                                        <DropdownMenuItem onClick={() => handleDownloadImage(parsedImage.image, msg.id)}>
                                                            <Download className="mr-2 h-4 w-4" /> Download Image
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => handleForward(msg.id, copyText)}>
                                                        <Forward className="mr-2 h-4 w-4" /> Forward
                                                    </DropdownMenuItem>

                                                    {isMe ? (
                                                        <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive focus:text-destructive">
                                                            <Trash className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        isCreator && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive focus:text-destructive">
                                                                    <Trash className="mr-2 h-4 w-4" /> Delete Message
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleRemoveMember(msg.sender_id)} className="text-destructive focus:text-destructive">
                                                                    <LogOut className="mr-2 h-4 w-4" /> Remove Member
                                                                </DropdownMenuItem>
                                                            </>
                                                        )
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
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
                <div className="p-2.5 border-t border-black/10 dark:border-zinc-800 bg-[#f0f2f5] dark:bg-zinc-900">
                    {!isDirectMode && selectedImage && (
                        <div className="mb-2 rounded-xl border border-black/10 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 flex items-center gap-3">
                            <img src={selectedImage} alt="Selected" className="w-14 h-14 rounded-lg object-cover border border-black/10" />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">{selectedImageName || "Selected image"}</p>
                                <p className="text-[11px] text-muted-foreground">Image will be sent with your message.</p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setSelectedImage(null);
                                    setSelectedImageName("");
                                    if (imageInputRef.current) imageInputRef.current.value = "";
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            aria-label="Attach image"
                            onChange={handleImagePick}
                        />

                        <div className="flex items-flex-end gap-2">
                            {!isDirectMode && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="rounded-lg text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white flex-shrink-0"
                                onClick={() => imageInputRef.current?.click()}
                                title="Attach image"
                            >
                                <Paperclip className="h-5 w-5" />
                            </Button>
                            )}

                            <div className="flex-1 relative">
                                <textarea
                                    value={newMessage}
                                    onChange={handleTextareaChange}
                                    placeholder={!isDirectMode && selectedImage ? "Add a caption (optional)..." : "Type a message..."}
                                    className="w-full px-4 py-3 text-sm font-normal leading-relaxed rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-500 transition-all min-h-[44px] max-h-[120px]"
                                    rows={1}
                                />
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 px-1">Press Send button to send message</p>
                            </div>

                            <Button
                                type="submit"
                                disabled={isDirectMode ? (!newMessage.trim() || sendDirectMessageMutation.isPending) : ((!newMessage.trim() && !selectedImage) || sendMessageMutation.isPending)}
                                size="icon"
                                className="rounded-lg bg-[#00a884] hover:bg-[#019472] text-white flex-shrink-0 h-11 w-11"
                            >
                                {(sendMessageMutation.isPending || sendDirectMessageMutation.isPending) ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            </Button>
                        </div>
                    </form>
                </div>
                </section>
            </div>

            {/* Forward Message Dialog */}
            <Dialog open={forwardDialogOpen} onOpenChange={setForwardDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Forward Message To</DialogTitle>
                        <DialogDescription>
                            Select a group to forward this message.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        {/* Message Preview */}
                        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3 border border-zinc-200 dark:border-zinc-700">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Message Preview:</p>
                            <p className="text-sm text-zinc-900 dark:text-zinc-100 line-clamp-3 whitespace-pre-wrap">
                                {forwardMessageContent.length > 150 
                                    ? `${forwardMessageContent.substring(0, 150)}...` 
                                    : forwardMessageContent}
                            </p>
                        </div>

                        {/* Groups List */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Select a group:</p>
                            <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border border-zinc-200 dark:border-zinc-700 p-2">
                                {memberGroups && memberGroups.length > 0 ? (
                                    memberGroups
                                        .filter((g: any) => g.id !== id) // Exclude current group
                                        .map((g: any) => (
                                            <Button
                                                key={g.id}
                                                type="button"
                                                variant="ghost"
                                                onClick={() => handleSendForwardedMessage(g.id)}
                                                className="w-full justify-start text-sm h-auto py-2 px-3 hover:bg-emerald-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                                            >
                                                <div className="flex items-center gap-2 w-full">
                                                    <div className="w-8 h-8 rounded-full bg-[#075e54] flex items-center justify-center flex-shrink-0">
                                                        <Users className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div className="min-w-0 flex-1 text-left">
                                                        <p className="font-medium truncate">{g.name || "Group"}</p>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                                            {g.farmer_group_members?.length || 0} members
                                                        </p>
                                                    </div>
                                                </div>
                                            </Button>
                                        ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No other groups to forward to
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
};

export default FarmerGroupChatPage;
