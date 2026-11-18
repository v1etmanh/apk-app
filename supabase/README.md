# Supabase setup for the mobile app

Apply [`migrations/202611140001_mobile_app_storage.sql`](./migrations/202611140001_mobile_app_storage.sql) to the same Supabase project configured by:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

With Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

The migration creates the profile, health metric, allergy, settings, recommendation history, feedback, and saved-dish tables. Every table has Row Level Security and restricts access to `auth.uid() = user_id`.

The app authenticates directly with Supabase Auth. It then uses the authenticated session for both Supabase table access and the Bearer token sent to `demo_server`.

## Family profile limit

Apply `migrations/202611180001_profile_member_limit.sql` before releasing the automatic cat-avatar client. It limits new profiles to five per authenticated account, including `profile_default`. It preserves existing profiles (even accounts already above five), updates, and idempotent upserts.

The trigger locks the account's `auth.users` row before checking the count. A rejected creation raises `PROFILE_LIMIT_REACHED`; the client handles this separately from network errors. Existing RLS policies remain in force. No birth-year backfill or avatar column is required: avatars are derived on-device.

Verify in a test Supabase project: create four profiles, send two concurrent inserts with different ids for the same user, and assert exactly one succeeds and the total is five. Then repeat an upsert of the winning id, edit at capacity, delete a profile, and add another. Verify another authenticated account cannot access these rows. Do not run these fixture writes against production users.
