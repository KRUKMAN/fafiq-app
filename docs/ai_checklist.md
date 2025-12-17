# AI Checklist (Future Agents)

This project has an authoritative system context: `Fafik_System_Context.md`. Do not override it with assumptions.

## Non-negotiables
1. **Tenant scoping:** use `org_id` on every business table, query, and mutation (no `tenant_id` naming).
2. **RLS from day one:** do not build features that bypass RLS.
3. **Data flow:** UI → hooks → query/mutation → Supabase → Zod parse → UI.
4. **No direct DB calls from UI:** all access goes through domain data modules (hooks + lib/api).
5. **Zod is authoritative:** define/validate domain data shapes with Zod and reuse across UI/queries/Edge Functions.
6. **Activity logging required:** every meaningful mutation inserts into `activity_events` and invalidates relevant queries.
7. **Modular monolith:** add new work under `features/<domain>`; avoid dumping into `lib/` or giant screens.
8. **Web-first:** ensure React Native for Web compatibility; do not add native-only libraries without a web plan.

## Before coding
- Read `docs/schema.md`, `docs/rls.md`, `docs/roles.md`, `docs/storage.md`.
- Identify which feature module you are working in (e.g., `features/dogs`).
- Confirm how `org_id` is resolved and passed through hooks.

## While coding
- Prefer small, testable functions and components.
- Keep UI files lean; move business logic into feature modules.
- Use TanStack Query for server state; Zustand only for UI state.

## Before shipping a change
- Confirm RLS policies cover new table/query paths.
- Confirm `org_id` is always passed and validated.
- Confirm activity events are written for new mutations.
- Confirm web build still works (routing, styling, dependencies).
