import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteDirectConversation,
  getDirectChatPartners,
  getDirectMessages,
  sendDirectMessage,
} from "@/lib/api/farmer-direct-messages";

export function useDirectChatPartners(currentProfileId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentProfileId) return;

    const channel = supabase
      .channel(`direct-chat-partners-${currentProfileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "farmer_direct_messages",
          filter: `sender_id=eq.${currentProfileId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["direct-chat-partners", currentProfileId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "farmer_direct_messages",
          filter: `receiver_id=eq.${currentProfileId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["direct-chat-partners", currentProfileId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfileId, queryClient]);

  return useQuery({
    queryKey: ["direct-chat-partners", currentProfileId],
    queryFn: () => getDirectChatPartners(currentProfileId),
    enabled: !!currentProfileId,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    placeholderData: keepPreviousData,
  });
}

export function useDirectMessages(currentProfileId: string, otherProfileId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentProfileId || !otherProfileId) return;

    const invalidateCurrentConversation = (payload: any) => {
      const row = (payload?.new || payload?.old) as
        | { sender_id?: string; receiver_id?: string }
        | undefined;
      if (!row?.sender_id || !row?.receiver_id) return;

      const isSameConversation =
        (row.sender_id === currentProfileId && row.receiver_id === otherProfileId) ||
        (row.sender_id === otherProfileId && row.receiver_id === currentProfileId);

      if (!isSameConversation) return;

      queryClient.invalidateQueries({ queryKey: ["direct-messages", currentProfileId, otherProfileId] });
      queryClient.invalidateQueries({ queryKey: ["direct-chat-partners", currentProfileId] });
    };

    const channel = supabase
      .channel(`direct-messages-${currentProfileId}-${otherProfileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "farmer_direct_messages",
          filter: `sender_id=eq.${currentProfileId}`,
        },
        invalidateCurrentConversation
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "farmer_direct_messages",
          filter: `receiver_id=eq.${currentProfileId}`,
        },
        invalidateCurrentConversation
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentProfileId, otherProfileId, queryClient]);

  return useQuery({
    queryKey: ["direct-messages", currentProfileId, otherProfileId],
    queryFn: () => getDirectMessages(currentProfileId, otherProfileId),
    enabled: !!currentProfileId && !!otherProfileId,
    staleTime: 15_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 1500,
    refetchIntervalInBackground: true,
    placeholderData: keepPreviousData,
  });
}

export function useSendDirectMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ senderId, receiverId, content }: { senderId: string; receiverId: string; content: string }) =>
      sendDirectMessage(senderId, receiverId, content),
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["direct-messages", vars.senderId, vars.receiverId] });
      queryClient.invalidateQueries({ queryKey: ["direct-messages", vars.receiverId, vars.senderId] });
      queryClient.invalidateQueries({ queryKey: ["direct-chat-partners", vars.senderId] });
      queryClient.invalidateQueries({ queryKey: ["direct-chat-partners", vars.receiverId] });
    },
  });
}

export function useDeleteDirectConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ currentProfileId, otherProfileId }: { currentProfileId: string; otherProfileId: string }) =>
      deleteDirectConversation(currentProfileId, otherProfileId),
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["direct-messages", vars.currentProfileId, vars.otherProfileId] });
      queryClient.invalidateQueries({ queryKey: ["direct-messages", vars.otherProfileId, vars.currentProfileId] });
      queryClient.invalidateQueries({ queryKey: ["direct-chat-partners", vars.currentProfileId] });
      queryClient.invalidateQueries({ queryKey: ["direct-chat-partners", vars.otherProfileId] });
    },
  });
}
