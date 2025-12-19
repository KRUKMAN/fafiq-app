# FAFIQ / RescueOps app

React Native + Expo + React Native for Web client for the FAFIQ (RescueOps) dog rescue CRM.

## Current state
- Uses TanStack Query for server state and Zustand for UI state.
- Supabase client is stubbed; the app runs on validated mock data with tenant-aware lookups.
- Styling via NativeWind; TypeScript strict mode enabled.

## Running locally
1) Install dependencies: `npm install`
2) Start dev server: `npm start` (choose iOS, Android, or Web in the Expo prompt)

## Notes for contributors
- Domain schemas live in `schemas/` (see `schemas/dog.ts` for the authoritative dog shape with `org_id` and `extra_fields`).
- Mock data and data access helpers live in `lib/`.
- Screens live under `app/`; the dog detail experience is in `app/(tabs)/index.tsx`.
- UI is built using an **Atomic Design System**: read `docs/ui_system.md` and use `components/ui/*` + `components/patterns/*` instead of inline styling in screens.
