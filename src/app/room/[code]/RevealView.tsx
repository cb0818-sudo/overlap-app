"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PartyPopper, RotateCcw, Home, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { OptionRow, Participant, Room } from "@/lib/types";

export default function RevealView({
  code,
  room,
  winner,
  participants,
  isHost,
}: {
  code: string;
  room: Room;
  winner: OptionRow | null;
  participants: Participant[];
  isHost: boolean;
}) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  async function handleSwipeAgain() {
    setResetting(true);
    await supabase.from("swipes").delete().eq("room_id", code);
    await supabase
      .from("rooms")
      .update({ status: "lobby", matched_option_id: null, reveal_reason: null })
      .eq("id", code);
    setResetting(false);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <PartyPopper className="text-lime" size={32} />

      <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {room.reveal_reason === "match"
          ? `All ${participants.length} of you agreed on`
          : room.reveal_reason === "manual"
            ? "Host ended it early — the leader so far was"
            : "No unanimous pick — closest overlap was"}
      </p>

      {winner ? (
        <>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-surface">
            {winner.title}
          </h1>
          {winner.description && (
            <p className="mt-1 text-sm text-surface/70">{winner.description}</p>
          )}
          {winner.image_url && (
            <div className="relative mt-5 h-56 w-44 overflow-hidden rounded-3xl border border-hairline shadow-2xl">
              <Image src={winner.image_url} alt={winner.title} fill sizes="176px" className="object-cover" />
            </div>
          )}
        </>
      ) : (
        <h1 className="mt-2 font-display text-2xl font-extrabold text-surface">
          Nobody agreed on anything
        </h1>
      )}

      <div className="mt-8 flex w-full flex-col gap-3">
        {isHost && (
          <button
            onClick={handleSwipeAgain}
            disabled={resetting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 font-display text-sm font-extrabold text-white transition-transform active:scale-95 disabled:opacity-50"
          >
            {resetting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            Swipe again with this group
          </button>
        )}
        <button
          onClick={() => router.push("/")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-hairline px-5 py-4 font-display text-sm font-extrabold text-surface"
        >
          <Home size={16} />
          Back to home
        </button>
      </div>
    </div>
  );
}
