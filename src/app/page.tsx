"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, ArrowRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/join?code=${code}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-brand-soft">
            Group decisions, solved by swiping
          </p>
          <h1 className="mt-1 font-display text-5xl font-extrabold text-surface">
            Overlap
          </h1>
          <p className="mt-3 text-sm text-surface/70">
            Add your options. Share the code. Everyone swipes. First thing
            you all like wins — no group chat argument required.
          </p>
        </div>

        <button
          onClick={() => router.push("/create")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 font-display text-base font-extrabold text-white transition-transform active:scale-95"
        >
          <PlusCircle size={20} />
          Create a room
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-hairline" />
          <span className="font-mono text-xs text-muted">or</span>
          <div className="h-px flex-1 bg-hairline" />
        </div>

        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="ENTER CODE"
            maxLength={6}
            className="w-full flex-1 rounded-2xl border border-hairline bg-raise-1 px-4 py-4 text-center font-mono text-lg uppercase tracking-[0.3em] text-surface placeholder:text-muted/60 focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Join room"
            className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl border border-hairline bg-raise-1 text-surface transition-transform active:scale-95"
          >
            <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </main>
  );
}
