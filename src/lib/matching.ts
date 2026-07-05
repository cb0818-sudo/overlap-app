import type { OptionRow, Participant, SwipeRow } from "./types";

export type RevealResult = {
  optionId: string;
  reason: "match" | "fallback";
} | null;

export function bestOptionSoFar(
  options: OptionRow[],
  participants: Participant[],
  swipes: SwipeRow[]
): { optionId: string; likeCount: number } | null {
  if (options.length === 0) return null;

  const participantIds = new Set(participants.map((p) => p.id));
  const likeCounts = new Map<string, number>();
  for (const option of options) likeCounts.set(option.id, 0);
  for (const swipe of swipes) {
    if (swipe.direction !== "like") continue;
    if (!participantIds.has(swipe.participant_id)) continue;
    likeCounts.set(swipe.option_id, (likeCounts.get(swipe.option_id) ?? 0) + 1);
  }

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
export function computeReveal(
  options: OptionRow[],
  participants: Participant[],
  swipes: SwipeRow[]
): RevealResult {
  if (options.length === 0 || participants.length === 0) return null;

  const participantIds = new Set(participants.map((p) => p.id));

  const likeCounts = new Map<string, number>();
  for (const option of options) likeCounts.set(option.id, 0);

  for (const swipe of swipes) {
    if (swipe.direction !== "like") continue;
    if (!participantIds.has(swipe.participant_id)) continue;
    likeCounts.set(swipe.option_id, (likeCounts.get(swipe.option_id) ?? 0) + 1);
  }

  // 1. Perfect match: first option (in deck order) everyone liked.
  const perfectMatch = options.find(
    (o) => (likeCounts.get(o.id) ?? 0) === participants.length
  );
  if (perfectMatch) return { optionId: perfectMatch.id, reason: "match" };

  // 2. Fallback: only once every participant has swiped on every option.
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

  let best = options[0];
  let bestCount = likeCounts.get(best.id) ?? 0;
  for (const option of options) {
    const count = likeCounts.get(option.id) ?? 0;
    if (count > bestCount) {
      best = option;
      bestCount = count;
    }
  }
  return { optionId: best.id, reason: "fallback" };
}
