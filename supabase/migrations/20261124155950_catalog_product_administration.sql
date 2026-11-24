create schema if not exists joggelo_private;
revoke all on schema joggelo_private from public;
grant usage on schema joggelo_private to authenticated;

create table joggelo_private.catalog_admin_emails (
  email text primary key check (email = lower(btrim(email)) and email <> '')
);
revoke all on table joggelo_private.catalog_admin_emails from public, anon, authenticated;

create function joggelo_private.is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join joggelo_private.catalog_admin_emails a on a.email = lower(u.email)
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function joggelo_private.is_catalog_admin() from public, anon;
grant execute on function joggelo_private.is_catalog_admin() to authenticated;

create function public.pode_gerenciar_catalogo()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select joggelo_private.is_catalog_admin();
$$;
revoke all on function public.pode_gerenciar_catalogo() from public, anon;
grant execute on function public.pode_gerenciar_catalogo() to authenticated;

alter table public.produtos add column revisao bigint not null default 0;

create function joggelo_private.increment_catalog_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revisao := old.revisao + 1;
  return new;
end;
$$;
revoke all on function joggelo_private.increment_catalog_revision() from public, anon, authenticated;

create trigger increment_catalog_revision
before update on public.produtos
for each row execute function joggelo_private.increment_catalog_revision();

grant insert, update on table public.produtos to authenticated;

create policy produtos_admin_leitura on public.produtos
  for select to authenticated
  using ((select joggelo_private.is_catalog_admin()));

create policy produtos_admin_criacao on public.produtos
  for insert to authenticated
  with check ((select joggelo_private.is_catalog_admin()));

create policy produtos_admin_edicao on public.produtos
  for update to authenticated
  using ((select joggelo_private.is_catalog_admin()))
  with check ((select joggelo_private.is_catalog_admin()));

create policy produtos_admin_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'produtos'
    and name ~ '^catalogo/[0-9a-f-]+[.](jpg|png|webp|glb)$'
    and (select joggelo_private.is_catalog_admin())
  );
