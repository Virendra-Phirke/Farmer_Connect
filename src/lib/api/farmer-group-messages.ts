import { supabase } from "@/integrations/supabase/client";

export type FarmerGroupMessage = {
    id: string;
    group_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender?: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    };
};

export async function getGroupMessages(groupId: string) {
    const { data, error } = await supabase
        .from("farmer_group_messages")
        .select(`
      *,
      sender:profiles!farmer_group_messages_sender_id_fkey(
        id,
        full_name,
        avatar_url
      )
    `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error fetching group messages:", error);
        throw error;
    }

    return data as FarmerGroupMessage[];
}

export async function sendGroupMessage(groupId: string, senderId: string, content: string) {
    const { data, error } = await supabase
        .from("farmer_group_messages")
        .insert({
            group_id: groupId,
            sender_id: senderId,
            content,
        })
        .select()
        .single();

    if (error) {
        console.error("Error sending group message:", error);
        throw error;
    }

    return data;
}

export async function deleteGroupMessage(messageId: string) {
    const { error } = await supabase
        .from("farmer_group_messages")
        .delete()
        .eq("id", messageId);

    if (error) {
        console.error("Error deleting group message:", error);
        throw error;
    }
}

export function subscribeToGroupMessages(groupId: string, callback: (payload: any) => void) {
    return supabase
        .channel(`group-${groupId}`)
        .on(
            "postgres_changes",
            {
                event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
                schema: "public",
                table: "farmer_group_messages",
                filter: `group_id=eq.${groupId}`,
            },
            callback
        )
        .subscribe();
}
