
alter table public.profiles add column if not exists language text not null default 'en';

alter table public.transcriptions add column if not exists is_public boolean not null default false;
alter table public.transcriptions add column if not exists share_token text unique;

create index if not exists idx_transcriptions_share_token on public.transcriptions(share_token) where share_token is not null;

drop policy if exists "Public can view shared transcriptions" on public.transcriptions;
create policy "Public can view shared transcriptions"
on public.transcriptions
for select
to anon, authenticated
using (is_public = true);

drop policy if exists "Users update own transcriptions" on public.transcriptions;
create policy "Users update own transcriptions"
on public.transcriptions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

drop policy if exists "Admins manage roles insert" on public.user_roles;
drop policy if exists "Admins manage roles update" on public.user_roles;
drop policy if exists "Admins manage roles delete" on public.user_roles;
drop policy if exists "Admins view all roles" on public.user_roles;

create policy "Admins view all roles"
on public.user_roles for select
to authenticated
using (public.is_admin());

create policy "Admins insert roles"
on public.user_roles for insert
to authenticated
with check (public.is_admin());

create policy "Admins update roles"
on public.user_roles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins delete roles"
on public.user_roles for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins view all profiles" on public.profiles;
create policy "Admins view all profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

create or replace function public.set_user_role(target_user_id uuid, new_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  delete from public.user_roles where user_id = target_user_id;
  insert into public.user_roles (user_id, role) values (target_user_id, new_role);
end;
$$;

revoke all on function public.set_user_role(uuid, public.app_role) from public;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
