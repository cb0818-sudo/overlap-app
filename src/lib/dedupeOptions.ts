import { normalizeTitle } from "./normalizeTitle";

export type MergeableOption = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  imageType: "upload" | "ai" | "none";
};

/**
 * Merge two options that are considered "the same" (same normalized
 * title). Rules:
 * 1. Case/whitespace differences don't matter — handled by the caller
 *    grouping on normalizeTitle() before this runs.
 * 2. One has a description, the other doesn't → keep the one WITH a
 *    description.
 * 3. Both have descriptions → merge them together.
 * 4. Neither has a description → stays undescribed.
 * Images aren't specified by the merge rules — we keep whichever one
 * already has an image, preferring the first (existing) one if both do.
 */
export function mergeOptionPair<T extends MergeableOption>(a: T, b: T): T {
  let description: string | null;
  if (a.description && b.description) {
    // Avoid merging identical descriptions into a silly duplicate.
    description =
      normalizeTitle(a.description) === normalizeTitle(b.description)
        ? a.description
        : `${a.description} — ${b.description}`;
  } else {
    description = a.description || b.description || null;
  }

  const imageUrl = a.imageUrl || b.imageUrl || null;
  const imageType = a.imageUrl ? a.imageType : b.imageUrl ? b.imageType : "none";

  return { ...a, description, imageUrl, imageType };
}

/**
 * Collapse a list of draft options down to one entry per normalized
 * title, merging descriptions/images per the rules above. Preserves the
 * order of first appearance.
 */
export function dedupeOptions<T extends MergeableOption>(drafts: T[]): T[] {
  const order: string[] = [];
  const byKey = new Map<string, T>();

  for (const draft of drafts) {
    const key = normalizeTitle(draft.title);
    if (!key) continue; // skip blanks entirely
    const existing = byKey.get(key);
    if (existing) {
      byKey.set(key, mergeOptionPair(existing, draft));
    } else {
      byKey.set(key, draft);
      order.push(key);
    }
  }

  return order.map((key) => byKey.get(key) as T);
}
