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
