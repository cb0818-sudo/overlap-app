"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getClientId } from "@/lib/clientId";

function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState(params.get("code")?.toUpperCase() ?? "");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = code.trim().length >= 4 && name.trim().length > 0 && !submitting;

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const roomCode = code.trim().toUpperCase();
    const clientId = getClientId();

    try {
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("id")
        .eq("id", roomCode)
        .maybeSingle();
      if (roomError) throw roomError;
      if (!room) {
        setError("No room found with that code — double-check it and try again.");
        setSubmitting(false);
        return;
      }

      const { data: existing, error: existingError } = await supabase
        .from("participants")
        .select("client_id, display_name")
        .eq("room_id", roomCode);
      if (existingError) throw existingError;

      const nameTaken = existing?.some(
        (p) => p.client_id !== clientId && p.display_name.toLowerCase() === name.trim().toLowerCase()
      );
      if (nameTaken) {
        setError("That name's already taken in this room — try another.");
        setSubmitting(false);
        return;
      }

      const { error: joinError } = await supabase
        .from("participants")
        .upsert(
          { room_id: roomCode, client_id: clientId, display_name: name.trim(), is_host: false },
          { onConflict: "room_id,client_id" }
        );
      if (joinError) throw joinError;

      router.push(`/room/${roomCode}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong joining that room. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-10">
      <div className="w-full max-w-sm">
        <button
          onClick={() => router.push("/")}
          className="mb-6 flex items-center gap-1.5 font-mono text-xs text-muted hover:text-surface"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <h1 className="font-display text-3xl font-extrabold text-surface">Join a room</h1>
        <p className="mt-1 text-sm text-surface/70">
          Enter the code someone shared with you.
        </p>

        <form onSubmit={handleJoin} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-muted">
              Room code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="7XQP3M"
              maxLength={6}
              className="w-full rounded-xl border border-hairline bg-raise-1 px-4 py-3 text-center font-mono text-lg uppercase tracking-[0.3em] text-surface placeholder:text-muted/60 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-muted">
              Your name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jamie"
              className="w-full rounded-xl border border-hairline bg-raise-1 px-4 py-3 text-surface placeholder:text-muted/60 focus:border-brand focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-coral">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 font-display text-base font-extrabold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            {submitting ? "Joining..." : "Join room"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinForm />
    </Suspense>
  );
}
