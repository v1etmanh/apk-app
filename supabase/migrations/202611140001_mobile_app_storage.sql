create table if not exists public.app_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, profile_id)
);

create table if not exists public.app_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table if not exists public.app_body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  profile_id text not null,
  data jsonb not null,
  measured_at timestamptz not null default now(),
  foreign key (user_id, profile_id) references public.app_profiles on delete cascade
);

create table if not exists public.app_allergies (
  user_id uuid not null,
  profile_id text not null,
  allergy_key text not null,
  display_name text,
  added_at timestamptz not null default now(),
  primary key (user_id, profile_id, allergy_key),
  foreign key (user_id, profile_id) references public.app_profiles on delete cascade
);

create table if not exists public.app_recommendation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create table if not exists public.app_recommended_dishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  rank integer not null,
  data jsonb not null,
  foreign key (user_id, session_id) references public.app_recommendation_sessions(user_id, id) on delete cascade
);

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid,
  data jsonb not null,
  feedback_at timestamptz not null default now(),
  foreign key (user_id, session_id) references public.app_recommendation_sessions(user_id, id) on delete cascade
);

create table if not exists public.app_saved_dishes (
  user_id uuid not null references auth.users(id) on delete cascade,
  dish_id text not null,
  data jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, dish_id)
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'app_profiles', 'app_settings', 'app_body_metrics', 'app_allergies',
    'app_recommendation_sessions', 'app_recommended_dishes', 'app_feedback', 'app_saved_dishes'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    if not exists (
      select from pg_policies where schemaname = 'public' and tablename = table_name and policyname = 'own_rows'
    ) then
      execute format(
        'create policy own_rows on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
        table_name
      );
    end if;
  end loop;
end $$;
