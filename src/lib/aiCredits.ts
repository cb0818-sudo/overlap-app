const STORAGE_KEY = "overlap:ai-free-generation-used";

// Stage 2: no real payments yet. This just tracks whether this browser has
// used its one free AI generation, so we know when to show the paywall.
// When Stripe gets wired up, replace this with a real entitlement check.
export function hasUsedFreeAIGeneration(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function markFreeAIGenerationUsed(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, "true");
}
