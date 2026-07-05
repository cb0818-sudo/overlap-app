"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { generateRoomCode } from "@/lib/roomCode";
import { getClientId } from "@/lib/clientId";
import ImagePicker from "../components/ImagePicker";
import AutocompleteInput from "../components/AutocompleteInput";
import { FOOD_SUGGESTIONS } from "@/lib/foodSuggestions";
import { generateId } from "@/lib/id";
import { normalizeTitle } from "@/lib/normalizeTitle";
import type { ImageType } from "@/lib/types";

type DraftOption = {
  key: string;
  title: string;
  description: string;
  imageUrl: string | null;
  imageType: ImageType;
};

function emptyOption(): DraftOption {
  return {
    key: generateId(),
    title: "",
    description: "",
    imageUrl: null,
    imageType: "none",
  };
}

export default function CreateRoomPage() {
  const router = useRouter();
  const [hostName, setHostName] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [options, setOptions] = useState<DraftOption[]>([emptyOption(), emptyOption()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOption(key: string, patch: Partial<DraftOption>) {
    setOptions((opts) => opts.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  }

  function removeOption(key: string) {
    setOptions((opts) => opts.filter((o) => o.key !== key));
  }

  const validOptions = options.filter((o) => o.title.trim().length > 0);
  const duplicateKeys = new Set<string>();
  {
    const seen = new Map<string, string>(); // normalized title -> first key
    for (const o of validOptions) {
      const key = normalizeTitle(o.title);
      if (seen.has(key)) {
        duplicateKeys.add(seen.get(key) as string);
        duplicateKeys.add(o.key);
      } else {
        seen.set(key, o.key);
      }
    }
  }
  const hasDuplicates = duplicateKeys.size > 0;
  const canSubmit =
    hostName.trim().length > 0 && validOptions.length >= 2 && !hasDuplicates && !submitting;

  async function handleCreate() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const clientId = getClientId();
    const code = generateRoomCode();

    try {
      const { error: roomError } = await supabase.from("rooms").insert({
        id: code,
        title: roomTitle.trim() || null,
        status: "lobby",
        host_client_id: clientId,
      });
      if (roomError) throw roomError;

      const { data: participant, error: participantError } = await supabase
        .from("participants")
        .insert({
          room_id: code,
          client_id: clientId,
          display_name: hostName.trim(),
          is_host: true,
        })
        .select()
        .single();
      if (participantError) throw participantError;

      const { error: optionsError } = await supabase.from("options").insert(
        validOptions.map((o) => ({
          room_id: code,
          title: o.title.trim(),
          description: o.description.trim() || null,
          image_url: o.imageUrl,
          image_type: o.imageType,
          created_by: participant.id,
        }))
      );
      if (optionsError) throw optionsError;

      router.push(`/room/${code}`);
    } catch (err) {
      console.error(err);
      setError(
        "Couldn't create the room. Double-check your Supabase setup (.env.local + schema.sql)."
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg px-6 py-10">
      <div className="mx-auto max-w-md">
        <button
          onClick={() => router.push("/")}
          className="mb-6 flex items-center gap-1.5 font-mono text-xs text-muted hover:text-surface"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <h1 className="font-display text-3xl font-extrabold text-surface">
          Create a room
        </h1>
        <p className="mt-1 text-sm text-surface/70">
          Add at least two options for people to swipe on.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-muted">
              Your name
            </label>
            <input
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="e.g. Sam"
              className="w-full rounded-xl border border-hairline bg-raise-1 px-4 py-3 text-surface placeholder:text-muted/60 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-widest text-muted">
              Room title <span className="normal-case text-muted/60">(optional)</span>
            </label>
            <input
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              placeholder="e.g. Friday dinner"
              className="w-full rounded-xl border border-hairline bg-raise-1 px-4 py-3 text-surface placeholder:text-muted/60 focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <label className="font-mono text-xs uppercase tracking-widest text-muted">
              Options to swipe on
            </label>
            <span className="font-mono text-xs text-muted">{validOptions.length} added</span>
          </div>

          {options.map((option, i) => (
            <div
              key={option.key}
              className="rounded-2xl border border-hairline bg-raise-2 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs text-muted">Option {i + 1}</span>
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(option.key)}
                    aria-label="Remove option"
                    className="text-muted hover:text-coral"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <AutocompleteInput
                value={option.title}
                onChange={(v) => updateOption(option.key, { title: v })}
                suggestions={FOOD_SUGGESTIONS}
                placeholder="Name (e.g. Casa Elena)"
                className={`w-full rounded-lg border bg-raise-1 px-3 py-2.5 text-sm text-surface placeholder:text-muted/60 focus:outline-none ${
                  duplicateKeys.has(option.key)
                    ? "border-coral focus:border-coral"
                    : "border-hairline focus:border-brand"
                }`}
              />
              {duplicateKeys.has(option.key) && (
                <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-coral/10 px-3 py-2 text-xs text-coral">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>Same name as another option — give one of them a different name.</span>
                </div>
              )}
              <input
                value={option.description}
                onChange={(e) => updateOption(option.key, { description: e.target.value })}
                placeholder="Short note (optional)"
                className="mt-2 w-full rounded-lg border border-hairline bg-raise-1 px-3 py-2.5 text-sm text-surface placeholder:text-muted/60 focus:border-brand focus:outline-none"
              />

              <div className="mt-3">
                <ImagePicker
                  imageUrl={option.imageUrl}
                  imageType={option.imageType}
                  seedText={option.title}
                  onChange={(imageUrl, imageType) =>
                    updateOption(option.key, { imageUrl, imageType })
                  }
                />
              </div>
            </div>
          ))}

          <button
            onClick={() => setOptions((opts) => [...opts, emptyOption()])}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-hairline py-3 font-mono text-xs text-muted hover:border-hairline-strong hover:text-surface"
          >
            <Plus size={15} />
            Add another option
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-coral">{error}</p>}
        {hasDuplicates && !error && (
          <p className="mt-4 text-sm text-coral">Fix the duplicate option names above to continue.</p>
        )}

        <button
          onClick={handleCreate}
          disabled={!canSubmit}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 font-display text-base font-extrabold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? "Creating..." : "Create room"}
        </button>
      </div>
    </main>
  );
}