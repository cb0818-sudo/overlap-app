"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export async function cleanUpParticipant(participantId: string) {
  try {
    // Explicitly remove their options (not just orphan them) — the FK is
    // ON DELETE SET NULL so this wouldn't happen automatically, but the
    // product decision here is "if you leave, your additions leave too."
    await supabase.from("options").delete().eq("created_by", participantId);
    await supabase.from("participants").delete().eq("id", participantId);
  } catch (err) {
    // Best-effort — if another connected client already ran this same
    // cleanup (everyone watching the room can trigger it), this just
    // deletes zero rows the second time, which is harmless.
    console.error("presence cleanup failed", err);
  }
}

/**
 * Tracks this participant's presence in the room and, when *anyone* in the
 * room detects another participant's connection drop (tab close, network
 * loss, phone backgrounded long enough to kill the socket, etc.), removes
 * that participant and anything they added.
 *
 * If the tab closes before this ever subscribes (e.g. mid-page-load,
 * before a participant row even exists), there's nothing tracked and
 * nothing to clean up — no error, it just never ran.
 */
export function usePresenceCleanup(code: string, myParticipantId: string | null) {
  useEffect(() => {
    if (!myParticipantId) return;

    const channel = supabase.channel(`presence:${code}`, {
      config: { presence: { key: myParticipantId } },
    });

    channel.on("presence", { event: "leave" }, (payload: { key: string }) => {
      cleanUpParticipant(payload.key);
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.track({ online_at: Date.now() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, myParticipantId]);
}
