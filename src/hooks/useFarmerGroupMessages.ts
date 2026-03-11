import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getGroupMessages, sendGroupMessage, subscribeToGroupMessages } from "@/lib/api/farmer-group-messages";
import { supabase } from "@/integrations/supabase/client";

export function useGroupMessages(groupId: string) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!groupId) return;

        const channel = subscribeToGroupMessages(groupId, (payload) => {
            // Invalidate the query to fetch the new message with sender details
            // Alternatively, we could optimistically update the cache, but fetching is simpler and ensures we get the joined sender data
            queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });
        });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [groupId, queryClient]);

    return useQuery({
        queryKey: ["group-messages", groupId],
        queryFn: () => getGroupMessages(groupId),
        enabled: !!groupId,
    });
}

export function useSendGroupMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ groupId, senderId, content }: { groupId: string; senderId: string; content: string }) =>
            sendGroupMessage(groupId, senderId, content),
        onSuccess: (_, variables) => {
            // Intentionally not invalidating here if we rely on the subscription to update
            // But it's safer to invalidate just in case the subscription fails or is slow
            queryClient.invalidateQueries({ queryKey: ["group-messages", variables.groupId] });
        },
    });
}

export function useDeleteGroupMessage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ messageId }: { messageId: string; groupId: string }) =>
            import("@/lib/api/farmer-group-messages").then(m => m.deleteGroupMessage(messageId)),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["group-messages", variables.groupId] });
        },
    });
}
