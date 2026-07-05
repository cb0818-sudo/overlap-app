"use client";

import { useRef, useState } from "react";
import { ImagePlus, Sparkles, Ban, Loader2 } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/id";
import { hasUsedFreeAIGeneration, markFreeAIGenerationUsed } from "@/lib/aiCredits";
import AIPaywallModal from "./AIPaywallModal";
import type { ImageType } from "@/lib/types";

type Mode = "upload" | "ai" | "none";

export default function ImagePicker({
  imageUrl,
  imageType,
  onChange,
  seedText,
}: {
  imageUrl: string | null;
  imageType: ImageType;
  onChange: (imageUrl: string | null, imageType: ImageType) => void;
  /** used to seed the mock AI placeholder so it looks tied to this option */
  seedText: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode: Mode = imageType === "upload" ? "upload" : imageType === "ai" ? "ai" : "none";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${generateId()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("option-images")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("option-images").getPublicUrl(path);
      onChange(data.publicUrl, "upload");
    } catch {
      setError("Upload failed — check your Supabase storage setup.");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerateAI() {
    setError(null);
    if (hasUsedFreeAIGeneration()) {
      setShowPaywall(true);
      return;
    }
    setGenerating(true);
    // Mock generation for now — swap this block for a real AI image API
    // call later. The delay + placeholder just prove out the UX and the
    // free-then-paywall flow.
    await new Promise((r) => setTimeout(r, 1400));
    const seed = encodeURIComponent(seedText || generateId());
    const mockUrl = `https://picsum.photos/seed/ai-${seed}/900/1200`;
    markFreeAIGenerationUsed();
    onChange(mockUrl, "ai");
    setGenerating(false);
  }

  function handleNoImage() {
    onChange(null, "none");
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 font-mono text-xs transition-colors ${
            mode === "upload"
              ? "border-brand bg-brand/15 text-brand-soft"
              : "border-hairline text-muted hover:border-hairline-strong"
          }`}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          Upload
        </button>
        <button
          type="button"
          onClick={handleGenerateAI}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 font-mono text-xs transition-colors ${
            mode === "ai"
              ? "border-brand bg-brand/15 text-brand-soft"
              : "border-hairline text-muted hover:border-hairline-strong"
          }`}
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          AI generate
        </button>
        <button
          type="button"
          onClick={handleNoImage}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 font-mono text-xs transition-colors ${
            mode === "none"
              ? "border-brand bg-brand/15 text-brand-soft"
              : "border-hairline text-muted hover:border-hairline-strong"
          }`}
        >
          <Ban size={14} />
          No image
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="mt-2 text-xs text-coral">{error}</p>}

      {imageUrl && (
        <div className="relative mt-3 h-28 w-24 overflow-hidden rounded-xl border border-hairline">
          <Image src={imageUrl} alt="Preview" fill sizes="96px" className="object-cover" />
        </div>
      )}

      {showPaywall && <AIPaywallModal onClose={() => setShowPaywall(false)} />}
    </div>
  );
}
