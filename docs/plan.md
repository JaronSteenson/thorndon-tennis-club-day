# Thorndon Tennis Club Day — Implementation Plan

## Context

We're replacing the physical whiteboard used to allocate players to courts on Thorndon Tennis Club's "club day" with a simple electronic equivalent. The board lives on a big TV (display-mirrored from a laptop) and a manager drag-drops players from the day's pool onto courts. The first cut targets a single device of input (laptop) mirrored to TV — no multi-device sync — with state in `localStorage`. Visuals deliberately echo the physical board (white background, coloured court tabs, narrow white player labels).

## Decisions locked from workshop

- **Courts**: 3, 4, 5 only (matches photos). Court 3 = blue, Courts 4 & 5 = green. Visitor accent colour = red (reserved for quick-added visitors, not separate slots).
- **Game start**: auto-starts the moment the 4th player lands on a court; per-court count-up timer.
- **TV**: pure display mirror, read-only. One Next.js app, one route, all input on laptop. No `/display` route needed.
- **Queue**: a single "next 4" queue per court. Finish-game promotes the queue into the court.
- **Visitors**: no special slots — quick-add a player on the day; persist them to the roster (correctable later).
- **Duty manager**: a present player selected from a header dropdown; remains assignable to courts (stays in the pool).
- **Seed**: names transcribed off the three whiteboard photos into `data/players.json`; user reviews and cleans up typos after.

## Tech stack

- **Next.js 15** (App Router, `output: 'export'` for static) + TypeScript.
- **Tailwind + Shadcn/ui** (Button, Dialog, DropdownMenu, Input, Card).
- **dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`) — accessible drag-and-drop, works well with React 19.
- **Zustand** with the `persist` middleware → `localStorage`. Single store keyed `tennis-day:v1`.
- **Prettier + ESLint** (`eslint-config-next`, `eslint-config-prettier`).
- **Vitest + React Testing Library** for unit/component tests.
- **Playwright** for E2E (drag flows + finish day).
- **GitHub Actions → GitHub Pages** (`actions/upload-pages-artifact` + `actions/deploy-pages`). Configure `basePath`/`assetPrefix` from repo name.

## Data model (`lib/types.ts`)

```ts
type CourtColor = 'blue' | 'green';

type Court = { id: string; name: string; color: CourtColor };

type Player = { id: string; name: string; isVisitor?: boolean };

type CourtAllocation = {
  courtId: string;
  playerIds: string[];   // 0..4
  startedAt?: number;    // epoch ms when 4th player landed
};

type QueueEntry = {
  courtId: string;
  playerIds: string[];   // 0..4
};

type DayState = {
  presentPlayerIds: string[];
  dutyManagerId?: string;
  allocations: CourtAllocation[];
  queues: QueueEntry[];
};
```

Seed data lives in `data/courts.json` and `data/players.json`. On app load, `lib/seedMerge.ts` merges seed into localStorage state: seed entries are added if their `id` isn't already present (localStorage wins on conflict so user edits stick). Seed is treated as additive-only — deleting a seeded player locally does not re-add it on next load (v1: simplest behaviour, can be revisited if duplicates appear).

## Screen layout (single route `/`)

Top → bottom, full-viewport flex column, large fonts (min `text-2xl` on TV breakpoint):

1. **Header band**
   - Live clock (HH:MM, ticking each second).
   - "Duty manager:" dropdown bound to today's present players. Selecting sets `dutyManagerId`. Player stays selectable for courts.
2. **Courts row** (3 cards, horizontal)
   - Each card: coloured tab with court name (blue for 3, green for 4/5), 4 player slots, queue zone below labelled "Next", count-up timer (mm:ss) once `startedAt` is set, "Finish game" button when in play.
   - Card is a dnd-kit *droppable* that accepts player chips into either `assigned` or `queue` sub-zones.
3. **Present panel** ("Here today")
   - Chips for `presentPlayerIds` not currently on a court or in a queue.
4. **Roster panel** (bottom)
   - Search input filtering the full alphabetised roster.
   - Quick-add button → Shadcn Dialog with a name field → creates player and marks present.
   - "Finish club day" button bottom-right → Shadcn confirm Dialog → clears `presentPlayerIds`, `dutyManagerId`, `allocations`, `queues`.

Every player chip exposes:
- Drag handle (whole chip).
- Overflow kebab → "Add to today", "Queue to Court N", "Assign to Court N", "Remove from today" — provides keyboard/non-DnD fallback per brief.

## Interaction rules

- **Add to today**: drag a chip from Roster onto Present panel, or use overflow → Add to today.
- **Assign to court**: drag chip onto a court's assigned zone. Rejects if 4 already assigned.
- **Queue to court**: drag onto the court's queue zone. Rejects if 4 already queued.
- **Game auto-start**: when an allocation reaches 4 `playerIds`, store sets `startedAt = Date.now()`.
- **Finish game**: clears `playerIds` on the court; if its queue has 4 players, promotes them and starts a new game (`startedAt = Date.now()`); otherwise leaves the court idle.
- **Move/swap**: dragging a chip already on Court A onto Court B re-homes them. Chip-level moves only in v1 (queue-group swap is flagged out of scope).
- **Finish club day**: confirm dialog → reset day-state but preserve player roster and courts.

## File layout

```
package.json
next.config.mjs              # output: 'export', basePath for GH Pages
tsconfig.json
.eslintrc.json
.prettierrc
tailwind.config.ts           # theme colors: court-blue, court-green, visitor-red
postcss.config.mjs
components.json              # shadcn config
public/                      # favicon, etc.
.github/workflows/deploy.yml # build + deploy-pages
app/
  layout.tsx
  page.tsx                   # composes the screen
  globals.css                # whiteboard background + chip styles
components/
  Header.tsx                 # clock + duty manager dropdown
  CourtCard.tsx              # court + queue + timer + finish
  PlayerChip.tsx             # whiteboard-style label, draggable
  PresentPanel.tsx
  RosterPanel.tsx            # search + list + quick-add + finish-day
  QuickAddDialog.tsx
  FinishDayDialog.tsx
  ui/                        # shadcn primitives
lib/
  store.ts                   # zustand + persist
  types.ts
  seedMerge.ts
  time.ts                    # mm:ss formatter, clock hook
data/
  courts.json
  players.json
tests/
  unit/                      # store reducers, seed merge, finish-game logic
  e2e/                       # playwright: add → assign → finish → finish-day
docs/
  plan.md                    # this document
```

## Critical files & responsibilities

- `lib/store.ts` — single source of truth. Actions: `markPresent`, `unmarkPresent`, `setDutyManager`, `assignToCourt`, `queueToCourt`, `finishGame(courtId)`, `removeFromCourt`, `quickAddPlayer`, `finishClubDay`. Persists `DayState` + `players` (roster grows via quick-add) to `localStorage` key `tennis-day:v1`. Court list is read-only from seed.
- `lib/seedMerge.ts` — id-keyed union, localStorage wins, additive-only.
- `components/CourtCard.tsx` — the only component that knows about timers; subscribes to a 1s tick and renders `now - startedAt`.
- `components/PlayerChip.tsx` — draggable + overflow menu; visual variant for `isVisitor` (red label) vs regular (white label, black border).
- `app/page.tsx` — `DndContext` wrapper, layout composition.

## Styling — match the whiteboard

- Body background: near-white (`#FAFAFA`).
- Court tab: pill, white text, drop-shadow; `court-blue ≈ #2EA5DC` (Court 3), `court-green ≈ #6FB344` (Courts 4 & 5).
- Player chip: white background, 2px black border, slight tilt allowed on drag, uppercase bold sans-serif (`font-sans tracking-wide`) to mimic the label-printer look.
- Visitor chip: red fill (`#D32F2F`), white text.
- Big TV target: design at 1920×1080, ensure no horizontal scroll; chip text ≥ 24px.

## GitHub Pages deploy

- `next.config.mjs`: `output: 'export'`, `images.unoptimized: true`, `basePath: '/thorndon-tennis-club-day'`, `assetPrefix` matching.
- `.github/workflows/deploy.yml`: on push to `master`, install, `next build`, `actions/upload-pages-artifact` against `out/`, `actions/deploy-pages`. Set `pages: write` and `id-token: write` permissions; enable Pages → "GitHub Actions" source manually once.

## Testing strategy

Unit (Vitest + RTL):
- `store.ts` actions: assign, queue, auto-start (4th triggers `startedAt`), finish-game promotes queue, finish-day clears.
- `seedMerge.ts`: localStorage wins, new seed entries appear, additive-only behaviour.

E2E (Playwright):
- Quick-add a player → drag to Present → drag to Court 3 → repeat to 4 → assert timer ticks.
- Queue 4 players → Finish game on Court 3 → queue promoted, new `startedAt`.
- Finish club day → all courts/queues/present cleared, roster intact.

## Verification (manual)

1. `npm run dev`, open `localhost:3000` on laptop, mirror to TV.
2. Walk the golden path above; confirm timers, drag, and overflow menu work.
3. Reload page mid-session: state survives via localStorage.
4. `npm run build && npx serve out` to confirm static export renders identically.
5. Push to a branch, open PR, verify GH Action runs and Pages preview deploys.

## Out of scope for first cut

- Supabase / multi-device sync.
- Per-player attendance history / stats.
- Drag of an entire *queue group* between courts (chip-level moves suffice for v1).
- Sound on game finish.
- Auth.

## Open follow-ups

- Confirm `basePath` (repo name `thorndon-tennis-club-day`) is what GH Pages will serve under, or whether a custom domain is in play.
- Transcribe ~80 names off the photos for `players.json`; user reviews/corrects.

## Execution order

1. Scaffold Next.js + TS + Tailwind + Shadcn; commit baseline.
2. Add ESLint/Prettier configs and `npm run lint`/`format` scripts.
3. `data/courts.json` (3 entries) and `data/players.json` (transcribed names).
4. `lib/types.ts`, `lib/store.ts`, `lib/seedMerge.ts`, `lib/time.ts`.
5. Components in order: `PlayerChip` → `PresentPanel` → `CourtCard` → `RosterPanel` → `Header` → wire into `app/page.tsx` with `DndContext`.
6. Quick-add and Finish-day dialogs.
7. Theme + whiteboard styling pass.
8. Unit tests, then Playwright E2E.
9. `next.config.mjs` static export + GH Actions workflow.
10. Smoke test on a Pages preview.
