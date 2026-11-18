-- Serialize profile creation per account, including writes from older clients.
-- Existing accounts above the limit retain all their profiles and can edit/delete.
create or replace function public.enforce_app_profile_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'UPDATE' and NEW.user_id = OLD.user_id then
    return NEW;
  end if;

  -- The auth row exists before any profile. Lock it even when the account has
  -- zero profiles; locking profile rows alone cannot protect an empty account.
  perform id from auth.users where id = NEW.user_id for update;

  -- BEFORE INSERT also runs for upserts that ultimately update an existing id.
  if exists (
    select 1 from public.app_profiles
    where user_id = NEW.user_id and profile_id = NEW.profile_id
  ) then
    return NEW;
  end if;

  if (select count(*) from public.app_profiles where user_id = NEW.user_id) >= 5 then
    raise exception using errcode = 'P0001', message = 'PROFILE_LIMIT_REACHED';
  end if;
  return NEW;
end;
$$;

revoke all on function public.enforce_app_profile_limit() from public;
drop trigger if exists app_profile_member_limit on public.app_profiles;
create trigger app_profile_member_limit
before insert or update of user_id on public.app_profiles
for each row execute function public.enforce_app_profile_limit();
