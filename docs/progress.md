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
- Hardened guards/empty states on People/Finance; People and Transports now reuse the Dogs DataTable layout with pagination/search and toggles (members vs fosters, transports vs transporters).


## Watch-outs / Next Steps
- Compare regenerated `database.types.ts` with Zod and resolve any drift after recent migrations.
- Maintain RLS/atomic logging expectations when wiring remaining mutations (no client-side audit writes).
- Continue moving session boot fully onto Supabase memberships (minimize mock fallback) and keep org-aware cache invalidation.

## Next Steps (short-term)
- Wire transport mutations and invite RPCs into UI flows beyond Settings if/when edit/create surfaces are added; add activity logging for transport updates.
- Continue hardening tenant boot/org guard UX for users with no memberships/orgs across tabs (reduce mock fallback when Supabase present).
- Populate remaining empty states and org guard flows across tabs; add storage upload integration in UI on top of the new buckets/policies.
- Keep dependency audit list in sync; prune only after Phase 2 wiring if still unused.
