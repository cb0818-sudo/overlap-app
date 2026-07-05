# Overlap

Groups swipe on options together. First thing everyone likes wins. No
accounts, no arguing.

This is **Stage 2**: real rooms, backed by Supabase. A host adds options
(each with an uploaded photo, a mock AI-generated image, or no image),
shares a code, and everyone who joins swipes live. First option everyone
likes wins — or, if nobody agrees on everything, whichever got the most
likes once everyone's finished.

## Set up Supabase (one-time)

1. Go to [supabase.com](https://supabase.com) → sign up (free) → **New
   Project**. Pick a name, a database password, a region, and create it.
2. Once it's ready, open **SQL Editor** → **New query**, paste in the
   contents of `supabase/schema.sql` from this repo, and click **Run**.
   This creates all the tables, security policies, realtime, and the
   storage bucket for uploaded images.
3. Go to **Settings → API**. Copy the **Project URL** and the **anon
   public** key.
4. In this project, copy `.env.local.example` to a new file named
   `.env.local`, and paste your two values in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create a room on one
device/tab, join with the code on another (or another browser tab, or your
phone on the same network), and swipe.

## What's here

- `supabase/schema.sql` — the whole database schema, RLS policies, realtime
  config, and storage bucket setup. Run once in the Supabase SQL editor.
- `src/lib/` — Supabase client, room-code generator, anonymous client-id
  (no accounts — each browser gets a random id in localStorage), shared
  types, match-detection logic (`matching.ts`), and a fallback id
  generator (`id.ts`) for browsers without `crypto.randomUUID`
- `src/app/page.tsx` — home: create a room or join by code
- `src/app/create/` — host adds their name, room title, and 2+ options
- `src/app/join/` — enter a code and a display name (checked for
  case-insensitive duplicates within that room)
- `src/app/room/[code]/` — the live room: name entry (if you arrived via a
  link), lobby (share code, live participant list, add more options, host
  starts the round), the swipe deck itself (with an Undo button and a
  host-only "Reveal now" button), and the reveal screen
- `src/app/components/ImagePicker.tsx` — upload your own photo, generate a
  mock AI image (first one free, then a paywall — no real payments wired up
  yet), or skip the image entirely
- `src/app/components/AutocompleteInput.tsx` — typeahead suggestions for
  option names, backed by `src/lib/foodSuggestions.ts`
- `src/app/components/ThemeToggle.tsx` — light/dark toggle (top-right on
  every page), persisted in localStorage
- `src/app/room/[code]/usePresenceCleanup.ts` — removes a participant and
  anything they added the moment their browser disconnects (tab closed,
  network dropped, etc.), using Supabase Realtime Presence
- `src/app/components/SwipeCard.tsx` / `SwipeDeck.tsx` — the swipe
  interaction itself, now driven by live room data instead of dummy data

## If you already ran schema.sql before July 2026

One column's allowed values changed (added a `'manual'` reveal reason for
the host's "Reveal now" button). Run this once in the Supabase SQL editor:

```sql
alter table rooms drop constraint if exists rooms_reveal_reason_check;
alter table rooms add constraint rooms_reveal_reason_check
  check (reveal_reason in ('match', 'fallback', 'manual'));

drop policy if exists "participants: anyone can update" on participants;
create policy "participants: anyone can update"
  on participants for update using (true);
```

(A fresh run of the full `schema.sql` already includes both of these.)

## Known placeholders (by design, for now)

- **AI image generation** is mocked — it "generates" a stock placeholder
  image after a short delay. Swap the mock block in `ImagePicker.tsx` for a
  real image-generation API call when you're ready.
- **Payments** aren't wired up — the paywall modal after the first free AI
  image is UI-only. Add Stripe when you're ready to charge for extra
  generations.
- **Row-level security** is intentionally open (`using (true)`) since there
  are no user accounts yet — real isolation currently comes from the room
  code being random and hard to guess, matching the original plan's
  security notes. Tighten this if you add real accounts later.
- **If everyone leaves a room**, there's no one left to run the presence
  cleanup for the last person, and no active host reassignment if the host
  disconnects. The room just goes stale and expires per `expires_at` (no
  cron job actively enforces that yet either — a known MVP gap, not a bug).

## Roadmap

- [x] **Stage 1** — static swipe deck, dummy data, prove the interaction
- [x] **Stage 2** — Supabase rooms, join by code, custom options with
      images, live swiping, match detection
- [x] **Stage 2.5** — duplicate-name guard, presence-based cleanup on
      disconnect, host manual reveal, undo last swipe, light/dark theme,
      native share sheet, name autocomplete
- [ ] **Stage 3** — real AI image generation + Stripe payments, room
      expiration cleanup, rate limiting, deploy to Vercel
- [ ] **Stage 4** — soft launch with a small group, iterate, then PWA /
      React Native for native apps
