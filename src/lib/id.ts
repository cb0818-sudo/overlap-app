// crypto.randomUUID() only exists in "secure contexts" — https, or
// http://localhost specifically. It's undefined on a plain http:// IP
// address (e.g. testing from your phone over LAN), so we fall back to a
// manual v4-shaped id in that case. Not cryptographically strong, but
// these ids are just for local keys/filenames/anon client ids, not
// security-sensitive.
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
