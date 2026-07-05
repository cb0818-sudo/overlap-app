import { generateId } from "./id";

const STORAGE_KEY = "overlap:client-id";

// No accounts for MVP — each browser gets a random id stored in
// localStorage so we know which participant row is "you" across reloads.
export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = generateId();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
