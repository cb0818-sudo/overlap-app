"use client";

import { useState } from "react";
import { Check, Copy, Plus, Crown, Loader2, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ImagePicker from "../../components/ImagePicker";
import AutocompleteInput from "../../components/AutocompleteInput";
import { FOOD_SUGGESTIONS } from "@/lib/foodSuggestions";
import type { Room, Participant, OptionRow, ImageType } from "@/lib/types";

export default function LobbyView({
  code,
  room,
  participants,
  options,
  myParticipant,
}: {
  code: string;
  room: Room;
  participants: Participant[];
  options: OptionRow[];
  myParticipant: Participant;
}) {
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageType, setImageType] = useState<ImageType>("none");
  const [adding, setAdding] = useState(false);
  const [starting, setStarting] = useState(false);

  async function copyLinkToClipboard(link: string) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(link);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }

  async function handleCopyLink() {
    const link = `${window.location.origin}/join?code=${code}`;
    try {
      await copyLinkToClipboard(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link:", link);
    }
  }

  async function handleShare() {
    const link = `${window.location.origin}/join?code=${code}`;
    const shareData = {
      title: room.title || "Join my Overlap room",
      text: `Join my room on Overlap — code ${code}`,
      url: link,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled the share sheet — not an error, do nothing
      }
    } else {
      try {
        await copyLinkToClipboard(link);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 1800);
      } catch {
        window.prompt("Copy this link:", link);
      }
    }
  }

  async function handleAddOption() {
    if (!title.trim()) return;
    setAdding(true);
    await supabase.from("options").insert({
      room_id: code,
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl,
      image_type: imageType,
      created_by: myParticipant.id,
    });
    setTitle("");
    setDescription("");
    setImageUrl(null);
    setImageType("none");
    setAdding(false);
    setShowAddForm(false);
  }

  async function handleStart() {
    setStarting(true);
    await supabase.from("rooms").update({ status: "swiping" }).eq("id", code).eq("status", "lobby");
  }

  return (
    <div className="mx-auto w-full max-w-md px-6 py-10">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          {room.title || "Waiting to start"}
        </p>
        <div className="mt-3 font-display text-5xl font-extrabold tracking-[0.15em] text-surface">
          {code}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 font-mono text-xs text-white transition-transform active:scale-95"
          >
            {shareCopied ? <Check size={14} /> : <Share2 size={14} />}
            {shareCopied ? "Link copied" : "Share"}
          </button>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-raise-1 px-4 py-2 font-mono text-xs text-surface transition-colors hover:border-hairline-strong"
          >
            {copied ? <Check size={14} className="text-lime" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>

      <div className="mt-8">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
          In the room ({participants.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 rounded-full border border-hairline bg-raise-1 px-3 py-1.5 text-sm text-surface"
            >
              {p.is_host && <Crown size={12} className="text-lime" />}
              {p.display_name}
              {p.id === myParticipant.id && <span className="text-muted">(you)</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            Options ({options.length})
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {options.map((o) => (
            <div
              key={o.id}
              className="truncate rounded-xl border border-hairline bg-raise-2 px-3 py-2.5 text-sm text-surface"
            >
              {o.title}
            </div>
          ))}
        </div>

        {showAddForm ? (
          <div className="mt-3 rounded-2xl border border-hairline bg-raise-2 p-4">
            <AutocompleteInput
              value={title}
              onChange={setTitle}
              suggestions={FOOD_SUGGESTIONS}
              placeholder="Name"
              className="w-full rounded-lg border border-hairline bg-raise-1 px-3 py-2.5 text-sm text-surface placeholder:text-muted/60 focus:border-brand focus:outline-none"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note (optional)"
              className="mt-2 w-full rounded-lg border border-hairline bg-raise-1 px-3 py-2.5 text-sm text-surface placeholder:text-muted/60 focus:border-brand focus:outline-none"
            />
            <div className="mt-3">
              <ImagePicker
                imageUrl={imageUrl}
                imageType={imageType}
                seedText={title}
                onChange={(url, type) => {
                  setImageUrl(url);
                  setImageType(type);
                }}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 rounded-xl border border-hairline py-2.5 font-mono text-xs text-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOption}
                disabled={!title.trim() || adding}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 font-mono text-xs font-medium text-white disabled:opacity-40"
              >
                {adding && <Loader2 size={13} className="animate-spin" />}
                Add option
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-hairline py-3 font-mono text-xs text-muted hover:border-hairline-strong hover:text-surface"
          >
            <Plus size={15} />
            Add an option
          </button>
        )}
      </div>

      <div className="mt-8">
        {myParticipant.is_host ? (
          <button
            onClick={handleStart}
            disabled={options.length < 2 || starting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 font-display text-base font-extrabold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {starting && <Loader2 size={18} className="animate-spin" />}
            {options.length < 2 ? "Add at least 2 options" : "Start swiping"}
          </button>
        ) : (
          <p className="text-center font-mono text-xs text-muted">
            Waiting for the host to start swiping...
          </p>
        )}
      </div>
    </div>
  );
}
