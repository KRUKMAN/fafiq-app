# Progress Log (Phase 1 – Visual MVP)

Reference: `docs/implementation_plan.md`

## Completed / In-Progress (this update)
- Dog schema: in_progress (aligned to `org_id`; used for mocks and queries).
- Mock data: dogs dataset expanded (org-scoped) in `lib/mocks/dogs.ts`; orgs, memberships, transports, and activity events added as mocks.
- Data layer: `fetchDogs` with richer filters and `useDogs` hook added; `useDog` still in use for detail; new fetchers/hooks for transports and activity events (`useTransports`, `useDogTimeline`).
- Activity timeline: added mock `activity_events`, `useDogTimeline` hook, and Timeline tab rendering in dog detail drawer.
- Data contracts: added Zod schemas for org, profile, membership, transport, activity_event with matching mocks/fetchers/hooks (e.g., `useTransports`).
- Advanced filters: Drawer now has location/responsible/date/alerts controls wired to `useDogs` filters for richer mock list filtering.
- UI navigation: Tabs now include Dogs; Dogs tab uses a nested stack (`app/(tabs)/dogs/_layout.tsx`).
- Dogs list screen: implemented with search + stage filters; cards navigate to dog detail.
- Dog detail: moved to `/dogs/[id]`, Overview tab retained (mock data), org-aware; Timeline tab populated with mock events.
- Dashboard tab: placeholder added to keep tab structure intact.
- Tenant context (mocked): Added `stores/sessionStore.ts` with mock user/memberships, strict boot fallback to first active org, and wired Dogs list/detail to use `activeOrgId` instead of a hard-coded org.
- Data hooks: `useDogs` and `useDog` now accept optional `orgId` and gate queries via `enabled`.
- Org selector UI: Added simple org switcher on Dogs list header and detail top bar; supports multiple mock orgs and persists `last_org_id` via localStorage (best-effort) plus in-memory fallback.
- Dog tabs: kept Overview content; other tabs show placeholders; added guard when no active org.
- Forms (mock): added Create Dog (`app/(tabs)/dogs/create.tsx`) and Edit Dog (`app/(tabs)/dogs/[id]/edit.tsx`) with Zod validation stubs (mock submit).
- List CTA: “Add dog” button routes to create form.

## Outstanding (Phase 1 items not started)
- Strict tenant boot sequence (activeOrg store, last_org_id persistence) beyond current static mock bootstrap.
- Mock auth guard, org guard.
- Fill remaining dog tabs (Medical, Files, etc.) with mock content.
- Add empty-state UX for “no memberships” aligned to org guard flow (list has basic empty state; guard for detail added).
- Expand mock timelines/activities to fuel Timeline tab with more event types.
- Persist last_org_id beyond in-memory mock; load memberships dynamically (current boot is static mock).
- Add “no dogs” empty state polish aligned to new advanced filters.

## Watch-outs / Next Steps
- Keep Zod schemas aligned to future `database.types.ts` when generated (Phase 2).
- Maintain RLS/atomic logging expectations when swapping mocks for Supabase (no client-side audit writes).
- Swap session boot/auth/org guard to real flow in Phase 2 without UI rewrites.

## Next Steps (short-term)
- Harden tenant boot: load memberships from mocks, persist `last_org_id`, and add org guard/empty-state flows.
- Wire mock auth guard stub so navigation respects a signed-in user (Phase 1 scope).
- Populate remaining dog tabs (Medical, Files) with placeholder/mock data; add “no dogs” and “no memberships” empty states matching the new filters.
- Add mock transports list/detail shells using `useTransports` to keep navigation consistent with Phase 1 DoD.
