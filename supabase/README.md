## Supabase setup

Follow these steps to align the Supabase project with the app:

1) **Env vars (local dev):**
   - Keep secrets out of git. Use `.env.local` (already created) with:
     - `EXPO_PUBLIC_SUPABASE_URL=https://ixavruhkfwkunkzetovp.supabase.co`
     - `EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>`
   - Expo picks up `EXPO_PUBLIC_*` automatically when present in your shell or `.env.local`.

2) **Apply schema + RLS + audit:**
   - Open Supabase Dashboard → SQL Editor.
   - Paste and run `supabase/migrations/20251218_schema_rls_audit.sql` (contains tables from `docs/schema.md`, RLS policies from `docs/rls.md`, helper functions, audit triggers, and `updated_at`/org settings triggers).
   - If you prefer CLI: `supabase link --project-ref ixavruhkfwkunkzetovp` then `supabase db push` after placing the migration under `supabase/migrations/` (already done).

3) **Storage (next):**
   - Buckets: `dog-photos` and `documents` with path patterns `{org_id}/dogs/{dog_id}/...` and `{org_id}/{entity_type}/{entity_id}/...`.
   - Add storage policies requiring `is_active_org_member(<org_id_from_path>)` once buckets are created.

4) **Verification checks (post-migration):**
   - Confirm RLS helpers exist: `select public.is_active_org_member('<org_uuid>');`
   - Confirm policies: `select policyname, tablename from pg_policies where schemaname = 'public';`
   - Smoke fetch via SQL: `select * from public.orgs limit 1;` (should return rows only when the session user has a membership).

5) **Run the app:**
   - `npm install` (if not already), then `npm start`.
   - With env vars set, the Supabase client in `lib/supabase.ts` will initialize instead of mocks.
