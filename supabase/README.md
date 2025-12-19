## Supabase setup

Follow these steps to align the Supabase project with the app:

1) **Env vars (local dev):**
   - Keep secrets out of git. Use `.env.local` (already created) with:
     - `EXPO_PUBLIC_SUPABASE_URL=https://ixavruhkfwkunkzetovp.supabase.co`
     - `EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>`
   - Expo picks up `EXPO_PUBLIC_*` automatically when present in your shell or `.env.local`.

2) **Apply schema + RLS + audit:**
   - Open Supabase Dashboard -> SQL Editor.
   - Run `supabase/migrations/20251218_schema_rls_audit.sql` (tables from `docs/schema.md`, RLS policies from `docs/rls.md`, helper functions, audit triggers, and `updated_at`/org settings triggers).
   - Then run `supabase/migrations/20251219_member_contact_view.sql` (admin-only member contact view + RPC that exposes email for the Settings panel).
   - Run `supabase/migrations/20251220_invites.sql` (email-based invite flow: org_invites table + admin invite/accept RPCs).
   - Run `supabase/migrations/20251222_invite_accept_policies.sql` and `supabase/migrations/20251224_accept_invites_fix2.sql` (invite acceptance hardening + RLS policy for invited users).
   - Run `supabase/migrations/20251225_org_member_contacts_hardening.sql` (prevents exposing `auth.users` via `org_member_contacts`; use admin RPC instead).
   - Run `supabase/migrations/20251226_org_contacts.sql` (adds `org_contacts` for offline people/homes + linking RPCs; adds optional contact assignment FKs to dogs/transports).
   - Run `supabase/migrations/20251221_storage_buckets.sql` (creates `dog-photos`/`documents` buckets + storage policies).
   - If you prefer CLI (already linked): `npx supabase db push` from repo root to apply pending migrations.

3) **Storage (next):**
   - Buckets: `dog-photos` and `documents` with path patterns `{org_id}/dogs/{dog_id}/...` and `{org_id}/{entity_type}/{entity_id}/...`.
   - Add storage policies requiring `is_active_org_member(<org_id_from_path>)` once buckets are created.

4) **Verification checks (post-migration):**
   - Confirm RLS helpers exist: `select public.is_active_org_member('<org_uuid>');`
   - Confirm policies: `select policyname, tablename from pg_policies where schemaname = 'public';`
   - Confirm admin membership email RPC exists: `select * from public.admin_list_org_memberships('<org_uuid>');` (should error when not an org admin)
   - Confirm invite RPC exists: `select * from public.admin_invite_member_by_email('<org_uuid>', '<email>', array['admin'], 'Name');`
   - Confirm storage buckets: `select id from storage.buckets;`
   - Smoke fetch via SQL: `select * from public.orgs limit 1;` (should return rows only when the session user has a membership).

5) **Run the app:**
   - `npm install` (if not already), then `npm start`.
   - With env vars set, the Supabase client in `lib/supabase.ts` will initialize instead of mocks.
   - Regenerate types after migrations: `npx supabase gen types typescript --linked --schema public > database.types.ts`.

## User management (manual admin steps)

Until we ship an invite UI, use these SQL snippets in the Supabase SQL Editor:

- **Find user id:** `select id from auth.users where email = 'you@example.com';`
- **Add membership (admin):**
  ```sql
  insert into public.memberships (org_id, user_id, roles, active)
  values ('<org_id>', '<user_id>', array['admin'], true)
  on conflict (org_id, user_id) do update
    set roles = excluded.roles, active = excluded.active;
  ```
- **Set profile name (optional):**
  ```sql
  insert into public.profiles (user_id, full_name)
  values ('<user_id>', 'Your Name')
  on conflict (user_id) do update set full_name = excluded.full_name;
  ```
- **Mark email verified (dev shortcut):**
  ```sql
  update auth.users
  set email_confirmed_at = now(), confirmed_at = now()
  where email = 'you@example.com';
  ```
- **Change user email safely:**
  ```sql
  -- 1) Update auth.users
  update auth.users
  set email = 'new@example.com', email_confirmed_at = null, confirmed_at = null
  where id = '<user_id>';
  -- 2) Update auth.identities to match
  update auth.identities
  set email = 'new@example.com',
      identity_data = jsonb_set(identity_data, '{email}', to_jsonb('new@example.com'))
  where user_id = '<user_id>';
  -- 3) Re-verify (dev shortcut)
  update auth.users set email_confirmed_at = now(), confirmed_at = now() where id = '<user_id>';
  ```
- **List members with email (admin-only RPC used by Settings panel):**
  ```sql
  select * from public.admin_list_org_memberships('<org_id>');
  ```

## Seed mock data into Supabase

Use this to load the same sample records the mock layer uses (orgs, memberships, dogs, transports, activity events).

1) Open `supabase/seed_mocks.sql` and replace `REPLACE_WITH_YOUR_AUTH_USER_ID` with your actual `auth.users.id` (run `select id,email from auth.users;` in the SQL Editor if needed). The membership FK will fail if the user id does not exist.
2) Paste the entire file into the Supabase SQL Editor and run it. It upserts safely, so re-running is fine.
3) Sign in with that same user in the app and switch to the “Stray Love Found NGO” org; the seeded dogs live there. RLS will hide them if you are not a member of that org.
