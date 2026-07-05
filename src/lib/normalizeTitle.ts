// Case- and whitespace-insensitive normalization, so "Cheesecake",
// "cheese cake", and "chee se cake" are all treated as the same thing.
// Strips ALL whitespace/hyphens (not just collapsing repeats), since a
// stray space in the middle of a word ("chee se cake") still shouldn't
// count as a different name.
export function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[\s-]+/g, "");
}