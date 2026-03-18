import { supabase } from "@/integrations/supabase/client";

export type FarmerDirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender?: { id: string; full_name: string | null; avatar_url: string | null };
};

export type DirectChatPartner = {
  profileId: string;
  fullName: string;
  avatarUrl: string | null;
  lastMessageAt: string;
};

export async function sendDirectMessage(senderId: string, receiverId: string, content: string) {
  const { data, error } = await (supabase as any)
    .from("farmer_direct_messages")
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error sending direct message:", error);
    throw error;
  }

  return data as FarmerDirectMessage;
}

export async function getDirectMessages(currentProfileId: string, otherProfileId: string) {
  const { data, error } = await (supabase as any)
    .from("farmer_direct_messages")
    .select(`
      id,
      sender_id,
      receiver_id,
      content,
      created_at,
      sender:profiles!farmer_direct_messages_sender_id_fkey(id, full_name, avatar_url)
    `)
    .or(
      `and(sender_id.eq.${currentProfileId},receiver_id.eq.${otherProfileId}),and(sender_id.eq.${otherProfileId},receiver_id.eq.${currentProfileId})`
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching direct messages:", error);
    throw error;
  }

  return (data || []) as FarmerDirectMessage[];
}

export async function getDirectChatPartners(currentProfileId: string) {
  const { data, error } = await (supabase as any)
    .from("farmer_direct_messages")
    .select(`
      sender_id,
      receiver_id,
      created_at,
      sender:profiles!farmer_direct_messages_sender_id_fkey(id, full_name, avatar_url),
      receiver:profiles!farmer_direct_messages_receiver_id_fkey(id, full_name, avatar_url)
    `)
    .or(`sender_id.eq.${currentProfileId},receiver_id.eq.${currentProfileId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching direct chat partners:", error);
    throw error;
  }

  const latestByPartner = new Map<string, DirectChatPartner>();

  for (const row of data || []) {
    const isCurrentSender = row.sender_id === currentProfileId;
    const partner = isCurrentSender ? row.receiver : row.sender;
    const partnerId = isCurrentSender ? row.receiver_id : row.sender_id;
    if (!partnerId || !partner) continue;

    if (!latestByPartner.has(partnerId)) {
      latestByPartner.set(partnerId, {
        profileId: partnerId,
        fullName: partner.full_name || "Farmer",
        avatarUrl: partner.avatar_url || null,
        lastMessageAt: row.created_at,
      });
    }
  }

  return Array.from(latestByPartner.values()).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

export async function deleteDirectConversation(currentProfileId: string, otherProfileId: string) {
  const { error } = await (supabase as any)
    .from("farmer_direct_messages")
    .delete()
    .or(
      `and(sender_id.eq.${currentProfileId},receiver_id.eq.${otherProfileId}),and(sender_id.eq.${otherProfileId},receiver_id.eq.${currentProfileId})`
    );

  if (error) {
    console.error("Error deleting direct conversation:", error);
    throw error;
  }
}
