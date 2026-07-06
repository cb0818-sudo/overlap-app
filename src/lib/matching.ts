import type { OptionRow, Participant, SwipeRow } from "./types";

export type RevealResult = {
  optionId: string;
  reason: "match" | "fallback";
} | null;

function likeCountsFor(
  options: OptionRow[],
  participants: Participant[],
  swipes: SwipeRow[]
): Map<string, number> {
  const participantIds = new Set(participants.map((p) => p.id));
  const likeCounts = new Map<string, number>();
  for (const option of options) likeCounts.set(option.id, 0);
  for (const swipe of swipes) {
    if (swipe.direction !== "like") continue;
    if (!participantIds.has(swipe.participant_id)) continue;
    likeCounts.set(swipe.option_id, (likeCounts.get(swipe.option_id) ?? 0) + 1);
  }
  return likeCounts;
}

function pickBest(
  options: OptionRow[],
  likeCounts: Map<string, number>
): { optionId: string; likeCount: number } {
  let best = options[0];
  let bestCount = likeCounts.get(best.id) ?? 0;
  for (const option of options) {
    const count = likeCounts.get(option.id) ?? 0;
    if (count > bestCount) {
      best = option;
      bestCount = count;
    }
  }
  return { optionId: best.id, likeCount: bestCount };
}

/** Used by the host's manual "Reveal now" button — doesn't wait for everyone to finish. */
export function bestOptionSoFar(
  options: OptionRow[],
  participants: Participant[],
  swipes: SwipeRow[]
): { optionId: string; likeCount: number } | null {
  if (options.length === 0) return null;
  return pickBest(options, likeCountsFor(options, participants, swipes));
}

/**
 * The automatic reveal only ever fires once every participant has swiped
 * on every option — no more revealing the instant someone gets a
 * "perfect" unanimous like partway through the deck. Whatever has the
 * most likes at that point wins; if that happens to be everyone, it's
 * reported as a genuine match rather than just the best overlap.
 */
export function computeReveal(
  options: OptionRow[],
  participants: Participant[],
  swipes: SwipeRow[]
): RevealResult {
  if (options.length === 0 || participants.length === 0) return null;

  const participantIds = new Set(participants.map((p) => p.id));
  const swipedCountByParticipant = new Map<string, number>();
  for (const swipe of swipes) {
    if (!participantIds.has(swipe.participant_id)) continue;
    swipedCountByParticipant.set(
      swipe.participant_id,
      (swipedCountByParticipant.get(swipe.participant_id) ?? 0) + 1
    );
  }
  const everyoneFinished = participants.every(
    (p) => (swipedCountByParticipant.get(p.id) ?? 0) >= options.length
  );
  if (!everyoneFinished) return null;

  const likeCounts = likeCountsFor(options, participants, swipes);
  const { optionId, likeCount } = pickBest(options, likeCounts);
  return {
    optionId,
    reason: likeCount === participants.length ? "match" : "fallback",
  };
}