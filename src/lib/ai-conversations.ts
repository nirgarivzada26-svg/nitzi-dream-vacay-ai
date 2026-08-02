// AI conversation persistence (client-side, RLS-scoped to the signed-in user).
// UI never touches supabase.from() directly for AI data — it goes through here.

import { supabase } from "@/integrations/supabase/client";
import type { UIMessage } from "ai";

export interface ConversationRow {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
}

export async function listConversations(): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id,title,updated_at,created_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ConversationRow[];
}

export async function createConversation(title: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not signed in");
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: user.id, title: title.slice(0, 80) || "שיחה חדשה" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from("ai_conversations")
    .update({ title: title.slice(0, 80) })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
  if (error) throw error;
}

export async function loadMessages(conversationId: string): Promise<UIMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id,role,parts,client_message_id,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: (row.client_message_id as string | null) ?? (row.id as string),
    role: row.role as UIMessage["role"],
    parts: (row.parts ?? []) as UIMessage["parts"],
  }));
}

/** Persists one message. The DB generates the UUID id; the AI SDK id is kept separately. */
export async function saveMessage(conversationId: string, message: UIMessage): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    user_id: user.id,
    client_message_id: message.id,
    role: message.role,
    parts: message.parts as unknown as never,
  });
  if (error) console.error("[nitzi-ai] failed to save message", error.message);
  else
    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
}
