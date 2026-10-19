-- 0014_profile_avatars.sql
-- Each person may upload one profile photo (PRD §6.14). The file lives in a private
-- Storage bucket; profiles.avatar_path only records that it exists. A freelancer can
-- read their own object. An Admin can read every object. Writes stay inside the
-- caller's own folder, and the path is recorded only by set_my_avatar.

alter table public.profiles
  add column avatar_path text,
  add constraint profiles_avatar_path_check
    check (
      avatar_path is null
      or avatar_path = id::text || '/avatar.jpg'
      or avatar_path = id::text || '/avatar.png'
      or avatar_path = id::text || '/avatar.webp'
    );

create or replace function public.set_my_avatar(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.require_active();
  v_path  text := nullif(btrim(p_path), '');
begin
  if v_path is not null
     and v_path is distinct from v_actor::text || '/avatar.jpg'
     and v_path is distinct from v_actor::text || '/avatar.png'
     and v_path is distinct from v_actor::text || '/avatar.webp' then
    raise exception 'invalid_avatar_path' using errcode = 'check_violation';
  end if;

  update public.profiles set avatar_path = v_path where id = v_actor;
  perform app.log_event(
    'person.avatar_changed', null, null, v_actor, v_actor,
    jsonb_build_object('present', v_path is not null)
  );
end;
$$;

revoke execute on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Own photo, or any photo for an Admin. Deactivated people fail app.viewer_id().
create policy avatars_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (select app.viewer_id()) is not null
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar\.(jpg|png|webp)$'
    and (
      (select app.is_admin())
      or name like (select app.viewer_id())::text || '/%'
    )
  );

create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and name ~ ('^' || (select app.viewer_id())::text || '/avatar\.(jpg|png|webp)$')
  );

create policy avatars_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and name ~ ('^' || (select app.viewer_id())::text || '/avatar\.(jpg|png|webp)$')
  )
  with check (
    bucket_id = 'avatars'
    and name ~ ('^' || (select app.viewer_id())::text || '/avatar\.(jpg|png|webp)$')
  );

create policy avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and name ~ ('^' || (select app.viewer_id())::text || '/avatar\.(jpg|png|webp)$')
  );
