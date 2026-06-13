# thorndon-tennis-club-day

Electronic board for tennis club day court allocations.

## Live site

📍 **[thorndon-tennis-club-day.pages.dev](https://jaronsteenson.github.io/thorndon-tennis-club-day/)**

Open it on a TV, tablet, or phone on club day to manage player queues and court assignments.

## About

A Next.js 15 + React 19 + Zustand app for the Thorndon Tennis Club. Supports:

- Drag-and-drop player assignments to courts or queues
- Automatic game start when 4 players land on a court
- Queue auto-promotion on finish
- Undo with a toast notification
- Dedicated sign-in mode with one-tap check-in
- Auto-fill (ordered or random) for bulk court assignment
- Mobile-friendly responsive layout
- Persistent state via localStorage (per day)

## Develop

```bash
npm install
NODE_OPTIONS=--no-experimental-webstorage npm run dev
npm test
npm run e2e
```

Builds to a static export for GitHub Pages (`npm run build`).
