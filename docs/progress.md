# Progress Log (Phase 1 – Visual MVP)

Reference: `docs/implementation_plan.md`

## Completed / In-Progress (this update)
- Dog schema: in_progress (aligned to `org_id`; used for mocks and queries).
- Mock data: dogs dataset expanded (org-scoped) in `lib/mocks/dogs.ts`.
- Data layer: `fetchDogs` with filters (status/search) and `useDogs` hook added; `useDog` still in use for detail.
- UI navigation: Tabs now include Dogs; Dogs tab uses a nested stack (`app/(tabs)/dogs/_layout.tsx`).
- Dogs list screen: implemented with search + stage filters; cards navigate to dog detail.
- Dog detail: moved to `/dogs/[id]`, Overview tab retained (mock data), org-aware.
- Dashboard tab: placeholder added to keep tab structure intact.
- Tenant context (mocked): Added `stores/sessionStore.ts` with mock user/memberships, strict boot fallback to first active org, and wired Dogs list/detail to use `activeOrgId` instead of a hard-coded org.
- Data hooks: `useDogs` and `useDog` now accept optional `orgId` and gate queries via `enabled`.
- Org selector UI: Added simple org switcher on Dogs list header and detail top bar; supports multiple mock orgs and persists `last_org_id` via localStorage (best-effort) plus in-memory fallback.
- Dog tabs: kept Overview content; other tabs show placeholders; added guard when no active org.
- Forms (mock): added Create Dog (`app/(tabs)/dogs/create.tsx`) and Edit Dog (`app/(tabs)/dogs/[id]/edit.tsx`) with Zod validation stubs (mock submit).
- List CTA: “Add dog” button routes to create form.

## Outstanding (Phase 1 items not started)
- Mock orgs/memberships + strict tenant boot sequence (activeOrg store, last_org_id persistence).
- Mock transports + timelines + other dog tabs (Medical, Timeline, Files, etc.).
- Mock auth guard, org guard.
- Persist last_org_id beyond in-memory mock; load memberships dynamically (current boot is static mock).
- Add empty-state UX for “no memberships” and “no dogs” aligned to org guard flow (list has basic empty state; guard for detail added).
- Expand mock timelines/activities to fuel Timeline tab later.

## Watch-outs / Next Steps
- Replace hard-coded `ORG_ID` with mock tenant context once session store is built.
- Keep Zod schemas aligned to future `database.types.ts` when generated (Phase 2).
- Maintain RLS/atomic logging expectations when swapping mocks for Supabase (no client-side audit writes).
- Add mock org selector UI and guard flow; expand dog tabs with placeholders; add create/edit dog form stubs with Zod validation.
