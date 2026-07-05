"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getClientId } from "@/lib/clientId";
import { computeReveal, bestOptionSoFar } from "@/lib/matching";
import { useRoomState } from "./useRoomState";
import { usePresenceCleanup, cleanUpParticipant } from "./usePresenceCleanup";
import LobbyView from "./LobbyView";
import RevealView from "./RevealView";
import SwipeDeck from "../../components/SwipeDeck";
import type { SwipeItem } from "../../components/SwipeCard";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code ?? "").toString().toUpperCase();

  const { loading, notFound, room, participants, options, swipes, myParticipant } =
    useRoomState(code);

  usePresenceCleanup(code, myParticipant?.id ?? null);

  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  // The instant everyone's done, room.status flips to 'revealed' — but if
  // you were mid-swipe on your own last card at that exact moment, the
  // screen would swap away before your card's exit animation finished.
  // Give it a beat before actually switching views.
  const [showReveal, setShowReveal] = useState(false);
  useEffect(() => {
    if (room?.status === "revealed" && !showReveal) {
      const timer = setTimeout(() => setShowReveal(true), 400);
      return () => clearTimeout(timer);
    }
  }, [room?.status, showReveal]);
  // Swiping fast can outrun the network round-trip to Supabase and back.
  // This tracks "I already swiped this" the instant it happens locally,
  // so the deck never shows a card twice while waiting to hear back.
  const [optimisticSwipedIds, setOptimisticSwipedIds] = useState<Set<string>>(new Set());
  // A new round (back in the lobby) means any locally-tracked "already
  // swiped" state from the previous round is stale — clear it. Done
  // during render (React's sanctioned "reset state when a prop changes"
  // pattern) rather than in an effect, since this needs to happen before
  // the deck below computes from stale ids, not after.
  const [lastSeenStatus, setLastSeenStatus] = useState(room?.status);
  if (room?.status !== lastSeenStatus) {
    setLastSeenStatus(room?.status);
    if (room?.status === "lobby" && optimisticSwipedIds.size > 0) {
      setOptimisticSwipedIds(new Set());
    }
    if (room?.status !== "revealed" && showReveal) {
      setShowReveal(false);
    }
  }

  // Any client watching a 'swiping' room checks after every update whether
  // the deck is ready to reveal (perfect match, or everyone finished).
  useEffect(() => {
    if (!room || room.status !== "swiping") return;
    const result = computeReveal(options, participants, swipes);
    if (!result) return;
    supabase
      .from("rooms")
      .update({
        status: "revealed",
        matched_option_id: result.optionId,
        reveal_reason: result.reason,
      })
      .eq("id", code)
      .eq("status", "swiping")
      .then(() => {});
  }, [room, options, participants, swipes, code]);

  const myRemainingItems: SwipeItem[] = useMemo(() => {
    if (!myParticipant) return [];
    const swipedIds = new Set(
      swipes.filter((s) => s.participant_id === myParticipant.id).map((s) => s.option_id)
    );
    return options
      .filter((o) => !swipedIds.has(o.id) && !optimisticSwipedIds.has(o.id))
      .map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        imageUrl: o.image_url,
        imageType: o.image_type,
      }));
  }, [options, swipes, myParticipant, optimisticSwipedIds]);

  const myLastSwipe = useMemo(() => {
    if (!myParticipant) return null;
    const mine = swipes.filter((s) => s.participant_id === myParticipant.id);
    if (mine.length === 0) return null;
    return mine.reduce((latest, s) => (s.created_at > latest.created_at ? s : latest));
  }, [swipes, myParticipant]);

  async function handleSwipe(optionId: string, direction: "like" | "skip") {
    if (!myParticipant) return;
    setOptimisticSwipedIds((prev) => new Set(prev).add(optionId));
    const { error } = await supabase.from("swipes").insert({
      room_id: code,
      participant_id: myParticipant.id,
      option_id: optionId,
      direction,
    });
    if (error) {
      console.error(error);
      // Insert failed for real (not just "already exists") — let the
      // card come back so the swipe isn't silently lost.
      setOptimisticSwipedIds((prev) => {
        const next = new Set(prev);
        next.delete(optionId);
        return next;
      });
    }
  }

  async function handleUndo() {
    if (!myLastSwipe) return;
    const optionId = myLastSwipe.option_id;
    const { error } = await supabase.from("swipes").delete().eq("id", myLastSwipe.id);
    if (error) {
      console.error(error);
      return;
    }
    setOptimisticSwipedIds((prev) => {
      const next = new Set(prev);
      next.delete(optionId);
      return next;
    });
  }

  async function handleRevealNow() {
    if (!myParticipant?.is_host) return;
    const best = bestOptionSoFar(options, participants, swipes);
    if (!best) return;
    setRevealing(true);
    await supabase
      .from("rooms")
      .update({ status: "revealed", matched_option_id: best.optionId, reveal_reason: "manual" })
      .eq("id", code)
      .eq("status", "swiping");
    setRevealing(false);
  }

  async function handleLeaveRoom() {
    if (!myParticipant) {
      router.push("/");
      return;
    }
    const confirmed = window.confirm("Leave this room? You'll be removed and any options you added will be removed too.");
    if (!confirmed) return;
    // Do this explicitly rather than relying on presence-detection alone
    // — presence is near-instant but not guaranteed instant, and this
    // way it's already done before you even leave the page.
    await cleanUpParticipant(myParticipant.id);
    router.push("/");
  }

  async function handleJoinInline(e: React.FormEvent) {
    e.preventDefault();
    if (!joinName.trim()) return;
    setJoining(true);
    setJoinError(null);
    const clientId = getClientId();
    const nameTaken = participants.some(
      (p) => p.client_id !== clientId && p.display_name.toLowerCase() === joinName.trim().toLowerCase()
    );
    if (nameTaken) {
      setJoinError("That name's already taken in this room — try another.");
      setJoining(false);
      return;
    }
    await supabase.from("participants").upsert(
      {
        room_id: code,
        client_id: clientId,
        display_name: joinName.trim(),
        is_host: false,
      },
      { onConflict: "room_id,client_id" }
    );
    setJoining(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <Loader2 className="animate-spin text-muted" size={22} />
      </main>
    );
  }

  if (notFound || !room) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <h1 className="font-display text-2xl font-extrabold text-surface">Room not found</h1>
        <p className="text-sm text-surface/70">That code doesn&apos;t match an active room.</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-2xl bg-brand px-5 py-3 font-display text-sm font-extrabold text-white"
        >
          Back to home
        </button>
      </main>
    );
  }

  if (!myParticipant) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6">
        <div className="w-full max-w-sm text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Joining room
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-surface">{code}</h1>
          <form onSubmit={handleJoinInline} className="mt-6 flex gap-2">
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full flex-1 rounded-2xl border border-hairline bg-raise-1 px-4 py-4 text-surface placeholder:text-muted/60 focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              disabled={joining || !joinName.trim()}
              aria-label="Join"
              className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl bg-brand text-white disabled:opacity-40"
            >
              {joining ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={20} />}
            </button>
          </form>
          {joinError && <p className="mt-3 text-sm text-coral">{joinError}</p>}
        </div>
      </main>
    );
  }

  if (room.status === "lobby") {
    return (
      <main className="min-h-screen bg-bg">
        <LobbyView
          code={code}
          room={room}
          participants={participants}
          options={options}
          myParticipant={myParticipant}
        />
      </main>
    );
  }

  if (room.status === "revealed" && showReveal) {
    const winner = options.find((o) => o.id === room.matched_option_id) ?? null;
    return (
      <main className="min-h-screen bg-bg">
        <RevealView
          code={code}
          room={room}
          winner={winner}
          participants={participants}
          isHost={myParticipant.is_host}
          onLeave={handleLeaveRoom}
        />
      </main>
    );
  }

  // status === 'swiping'
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
      {myParticipant.is_host && (
        <div className="mb-3 flex w-full max-w-[400px] justify-end px-1">
          <button
            onClick={handleRevealNow}
            disabled={revealing}
            className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 font-mono text-[11px] text-brand-soft disabled:opacity-40"
          >
            {revealing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Reveal now
          </button>
        </div>
      )}

      <div className="relative h-[720px] w-full max-w-[400px] overflow-hidden rounded-[40px] border border-hairline bg-gradient-to-b from-raise-1 to-transparent shadow-[0_0_0_1px_var(--color-hairline)]">
        <SwipeDeck
          items={myRemainingItems}
          totalCount={options.length}
          onSwipe={handleSwipe}
          onUndo={handleUndo}
          canUndo={!!myLastSwipe}
        />
      </div>
    </main>
  );
}
