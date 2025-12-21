# Progress Log (Phase 1 - Visual MVP)

Reference: `docs/implementation_plan.md`

## Completed 
- Dog domain aligned to `schema.md`: Zod dog schema now uses `stage` plus audit/membership fields; mocks refreshed with org-scoped timestamps/membership IDs; UI list/detail/form render stage-based badges/filters.
- Data layer: `fetchDogs`/`useDogs` filter on `stage`; dog detail/notes/timeline remain mock-backed; transport list hook unchanged.
- Session/auth guards: mock auth guard in `_layout`; sessionStore bootstraps memberships + `activeOrgId` and persists `last_org_id`; screens gate on org/memberships. Supabase-aware bootstrap fallback added; org switch now invalidates caches; sign-out clears cache.
- Dependency audit: kept Expo/Supabase extras (haptics, image, fonts, symbols, system-ui, web-browser, Supabase client, Query Devtools) to wire in Phase 2; prune if unused after integration.
- Org selector lives on Dogs list header; org switch drives query keys per org (no selector inside dog detail drawer yet).
- Added `database.types.ts` aligned to `docs/schema.md` for Supabase typing parity; remaining alignment gaps between Zod/DB are minimal.
- Added transport detail shell (`app/(tabs)/transports/[id].tsx`) and navigation from list; dog detail now includes Financial, People & Housing, and Chat mock tabs.
- Cleaned stray encoding artifacts and bad ternaries in `app/(tabs)/dogs/[id].tsx` (dog detail drawer now compiles cleanly on web).
- Applied Supabase schema + RLS + audit triggers; wired Dogs/Transports/Activity fetchers to Supabase-first with mock fallback and Zod parsing; documented auth/login plan and hook swap status in `docs/implementation_plan.md`.
- Added Supabase-first auth wiring: new `app/sign-in` screen with email/password sign-in and sign-up, demo/mock fallback button, Supabase-typed client, and auth-aware tab guard redirect to sign-in.
- Documented manual Supabase user management steps (add membership/admin, verify/change email) in `supabase/README.md` until invite UI ships.
- Added org guard empty state for authed users with no memberships and a visible sign-out control in the sidebar shell.
- Added Settings membership panel (lists members for active org via Supabase; mock fallback reads mock memberships).
- Added admin-only member contact view/RPC (joins memberships + profiles + auth.users) and wired the membership panel to show member email for org admins (falls back to non-email data if not authorized or using mocks).
- Added email-based invite flow: `org_invites` table, admin invite RPC, auto-accept RPC invoked on session bootstrap, Settings UI now invites by email (shows pending invites) and no longer needs manual user_id entry.
- Added invite management actions (resend/cancel) in Settings; invites list shows status and role summary.
- Added storage foundation: created `dog-photos` and `documents` buckets + storage policies aligned to `org_id` path; added path helpers and upload helpers (signed URL + direct upload) for dog photos/documents.
- Added transport create/update Supabase mutations (with Zod parsing) to complete the transport swap surface; tightened dog schema nullability alignment with DB. Storage buckets/policies applied via Supabase migration.
- Hardened guards/empty states on People/Finance; People and Transports now reuse the Dogs DataTable layout with pagination/search, toggles (members vs fosters, transports vs transporters), and drawer-style detail views consistent with Dogs.
- Session bootstrap is now Supabase-first with explicit demo/mocks; dashboard tab now shares the same org guard empty states.
- Transports tab supports create/edit via Supabase mutations with a side-drawer form (status, schedule, assignments); transport/transporter drawers use solid side panels. People drawer styling matches the Dogs/Transports pattern.
- Added password reset flow on sign-in and verified Supabase-first session boot persists org selection; added dog detail document upload using Supabase Storage helpers (documents bucket).
- Added `org_contacts` model + People & Homes contacts directory (supports offline contacts, invite/link flows, and assigning transports to contacts); updated schema/RLS docs and diagrams.
- Round 3 deep polish (UI + architecture): introduced semantic tokens `bg-background/bg-card/text-foreground` (+ status colors), centralized copy in `constants/strings.ts`, standardized inline feedback with `components/ui/StatusMessage.tsx` (no toasts), extracted `lib/pagination.ts` and `lib/viewModels/dogProfile.ts`, and replaced RowActionsMenu overlay hack with a `Modal`-based implementation; lint clean.
- Calendar/tasks refactor staged: added `tasks` table + org-scoped indexes/RLS, removed legacy `handle_calendar_workflows` trigger/function, cleaned `system_task` artifacts, updated `get_calendar_events` to surface tasks with inline reminders, refreshed Zod enum/docs/diagrams.
- UX review and spacing standardization: fixed TabBar alignment (wrapped ScrollView in View container to prevent vertical misalignment), standardized spacing across detail views (`mb-6` for TabBar, `py-8` for timeline empty states, `mt-4` for load more buttons), removed unwired button and unnecessary spacers from Dog detail view, ensured all timeline components have consistent formatting across Dogs/Transports/People views; updated `docs/ui_system.md` and `docs/architecture_round3_polish.md` with spacing standards.
- Persisted notes in `notes` with audit logging (dog/transport/contact), replaced sample dog document upload with real file picker, added transport document upload, and added audit triggers for org settings + tasks.


## Watch-outs / Next Steps
- Compare regenerated `database.types.ts` with Zod and resolve any drift after recent migrations. (Done; keep checking after future migrations.)
- Audit triggers are already in place; ensure any new mutations rely on them (no client-side audit writes).
- Session boot is Supabase-first; keep an eye on membership fetch failures and org selection persistence when switching orgs or reloading.
- Run the new tasks/calendar migration and regenerate Supabase types to remove manual edits to `database.types.ts`.

## Next Steps (short-term)
- Invites remain settings-only; add other invite surfaces only if the product needs them (reuse existing RPCs).
- Finish storage UI polish (download buttons, iconography refinements).
- Keep dependency audit list in sync; likely-unused today: `expo-haptics`, `expo-image`, `expo-font`, `expo-symbols`, `expo-system-ui`, `expo-web-browser`, `expo-constants`, `expo-linking`, `@tanstack/react-query-devtools`.
