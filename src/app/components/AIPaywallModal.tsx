"use client";

import { Sparkles, X } from "lucide-react";

export default function AIPaywallModal({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6">
      <div className="relative w-full max-w-xs rounded-3xl border border-hairline bg-elevated p-6 text-center shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-muted hover:text-surface"
        >
          <X size={18} />
        </button>

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/20 text-brand-soft">
          <Sparkles size={22} />
        </div>

        <h3 className="mt-4 font-display text-xl font-extrabold text-surface">
          You&apos;ve used your free AI image
        </h3>
        <p className="mt-2 text-sm text-surface/70">
          Your first AI-generated image is on us. After that, generating more
          costs a small credit per image.
        </p>

        <button
          disabled
          className="mt-5 w-full cursor-not-allowed rounded-full bg-brand/40 px-4 py-3 font-display text-sm font-extrabold text-white/70"
        >
          Buy more credits — coming soon
        </button>
        <p className="mt-2 font-mono text-[11px] text-muted">
          Payments aren&apos;t wired up yet in this build.
        </p>

        <button
          onClick={onClose}
          className="mt-4 text-sm text-muted underline underline-offset-2 hover:text-surface"
        >
          Use an upload or no image instead
        </button>
      </div>
    </div>
  );
}
