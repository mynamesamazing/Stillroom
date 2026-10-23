# Stillroom

Stillroom is a mobile-first personal life management prototype built with Next.js App Router, TypeScript, Tailwind CSS, and Lucide icons. Its Spaces organize tasks, notes, lists, links, and pinned overview items for different parts of life.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The app uses realistic fictional seed data and stores changes in browser local storage.

## Quality checks

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Architecture and prototype boundaries

- Typed models live in `lib/models.ts`, including stable IDs, timestamps, and reserved `ownerId` fields for future accounts.
- UI behavior is in `components/StillroomApp.tsx`; persistence is behind `lib/repositories/types.ts`.
- `lib/repositories/localRepository.ts` is the prototype implementation and can be replaced with Supabase without changing UI contracts.
- Local storage is not secure, private, or synchronized across devices. Do not enter sensitive personal data, API keys, or secrets.
- Link tags are stored in a workspace-wide registry and can be reused across Spaces. Unused tags are retained because tag rename/removal management is not part of this release; the registry is normalized to avoid duplicate names and orphaned Link references.
- Calendar, journal, day portrait, and Catchall records use additive schema version 2 fields in the existing `stillroom-data-v1` key. Habit records continue using `stillroom-habits-v1`.
- Photos are compressed to a maximum 1600px edge and 1.5 MB per image, with a 12 MB upload limit and 32 MB browser-local photo budget. Image blobs live in the versioned `stillroom-private-media-v1` IndexedDB database; application records contain photo IDs only. Photos and all other prototype data remain local to this browser and are not synced or backed up.

## Milestone 0.1B

The next milestone should add Supabase Auth, database tables and constraints, Row Level Security policies, server-backed repositories, conflict-safe timestamps, real cross-device sync, and richer list/task interactions. A production migration should be explicit and require user confirmation so prototype data is handled deliberately.

## Known limitations

This milestone is a local prototype. There are no production accounts, server-side authorization, encryption guarantees, offline sync, file attachments, sharing, or automated backups. Browser data can be cleared by the user or browser settings.