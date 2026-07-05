// Non-sequential, unguessable-enough room codes. Excludes visually
// ambiguous characters (0/O, 1/I/L) since people read these off phone
// screens to each other.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
