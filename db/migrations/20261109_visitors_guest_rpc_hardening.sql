-- ============================================================
-- E-Learniz v3 — MIGRATION (idempotent)
-- 2026-11-09: Dukungan tamu + RPC visitor + hardening akses
--
-- 1. Samakan v3.visitors dengan bentuk live (visitor_key, guest_id, dst.)
-- 2. Tambah sequence v3.guest_seq
-- 3. Recreate v3.log_visitor / public.log_visitor
-- 4. Recreate v3.clear_visitors / public.clear_visitors (staff-only)
-- 5. Cabut tulis langsung ke tabel dari anon (tulis hanya via RPC)
-- 6. Pastikan realtime publication
-- ============================================================

begin;

-- ---------- 1. Kolom baru ----------
alter table v3.visitors
    add column if not exists visitor_key      text,
    add column if not exists guest_id         text,
    add column if not exists display_name     text,
    add column if not exists role             text default 'guest';

alter table v3.visitors alter column user_id drop not null;

-- Backfill baris lama (schema lama: PK user_id, user_id not null).
update v3.visitors
set visitor_key = case
    when user_id is not null then 'u:' || user_id
    when coalesce(guest_id, '') <> '' then 'g:' || guest_id
    else 'g:legacy_' || md5(random()::text || clock_timestamp()::text)
end
where visitor_key is null;

alter table v3.visitors alter column visitor_key set not null;

-- Ganti PK user_id -> visitor_key (aman untuk DB baru & lama).
do $$
declare
    v_pk_name text;
    v_pk_cols text;
begin
    select c.conname,
           (select string_agg(a.attname, ',' order by a.attnum)
            from pg_attribute a
            where a.attrelid = c.conrelid and a.attnum = any(c.conkey))
      into v_pk_name, v_pk_cols
    from pg_constraint c
    where c.conrelid = 'v3.visitors'::regclass
      and c.contype = 'p'
    limit 1;

    if v_pk_name is null then
        alter table v3.visitors add constraint visitors_pkey primary key (visitor_key);
    elsif v_pk_cols <> 'visitor_key' then
        execute format('alter table v3.visitors drop constraint %I', v_pk_name);
        alter table v3.visitors add constraint visitors_pkey primary key (visitor_key);
    end if;
end $$;

-- ---------- 2. Sequence nomor tamu ----------
create sequence if not exists v3.guest_seq;

-- ---------- 3. Function internal: log tamu/user ----------
create or replace function v3.log_visitor(
    p_class_id bigint,
    p_user_id bigint default null,
    p_guest_id text default null,
    p_display_name text default null,
    p_role text default null,
    p_last_page text default '',
    p_user_agent text default '',
    p_device_type text default '',
    p_platform text default '',
    p_screen_resolution text default '',
    p_browser_language text default ''
)
returns v3.visitors
language plpgsql
security definer
set search_path = v3, public
as $$
declare
    v_key text;
    v_name text;
    v_role text;
    v_row v3.visitors;
begin
    if p_user_id is not null and p_user_id > 0 then
        v_key := 'u:' || p_user_id;

        select coalesce(u.full_name, u.nickname, 'Pengguna #' || p_user_id),
               coalesce(u.role, 'student')
          into v_name, v_role
          from v3.users u
         where u.id = p_user_id;

        if v_name is null then
            v_name := coalesce(p_display_name, 'Pengguna #' || p_user_id);
            v_role := coalesce(p_role, 'student');
        end if;
    else
        if p_guest_id is null or trim(p_guest_id) = '' then
            p_guest_id := gen_random_uuid()::text;
        end if;

        v_key := 'g:' || p_guest_id;
        v_role := 'guest';

        select display_name
          into v_name
          from v3.visitors
         where visitor_key = v_key;

        if v_name is null or v_name = '' or v_name = 'Tamu' then
            if p_display_name is not null
               and p_display_name <> ''
               and p_display_name <> 'Tamu' then
                v_name := p_display_name;
            else
                v_name := 'Tamu #' || nextval('v3.guest_seq');
            end if;
        end if;
    end if;

    insert into v3.visitors (
        visitor_key, user_id, guest_id, display_name, role, class_id,
        last_page, is_visible, visited_at,
        user_agent, device_type, platform, screen_resolution, browser_language
    ) values (
        v_key, p_user_id, p_guest_id, v_name, v_role, p_class_id,
        coalesce(p_last_page, ''), true, now(),
        coalesce(p_user_agent, ''), coalesce(p_device_type, ''),
        coalesce(p_platform, ''), coalesce(p_screen_resolution, ''),
        coalesce(p_browser_language, '')
    )
    on conflict (visitor_key) do update set
        class_id          = excluded.class_id,
        last_page         = excluded.last_page,
        is_visible        = true,
        visited_at        = now(),
        display_name      = coalesce(v_name, v3.visitors.display_name),
        role              = coalesce(v_role, v3.visitors.role),
        user_agent        = case when excluded.user_agent <> ''        then excluded.user_agent        else v3.visitors.user_agent        end,
        device_type       = case when excluded.device_type <> ''       then excluded.device_type       else v3.visitors.device_type       end,
        platform          = case when excluded.platform <> ''          then excluded.platform          else v3.visitors.platform          end,
        screen_resolution = case when excluded.screen_resolution <> '' then excluded.screen_resolution else v3.visitors.screen_resolution end,
        browser_language  = case when excluded.browser_language <> ''  then excluded.browser_language  else v3.visitors.browser_language  end
    returning * into v_row;

    return v_row;
end;
$$;

-- ---------- 4. Function internal: clear ----------
-- Sengaja TANPA cek staff di sini supaya bisa dipakai pg_cron/service_role.
-- Jangan grant ke anon/authenticated; hanya public wrapper yang boleh.
create or replace function v3.clear_visitors(p_class_id bigint default null)
returns boolean
language plpgsql
security definer
set search_path = v3, public
as $$
begin
    if p_class_id is not null and p_class_id > 0 then
        update v3.visitors
           set is_visible = false
         where class_id = p_class_id
           and is_visible = true;
    else
        update v3.visitors
           set is_visible = false
         where is_visible = true;

        begin
            alter sequence v3.guest_seq restart with 1;
        exception when others then
            null;
        end;
    end if;

    return true;
end;
$$;

-- ---------- 5. Wrapper publik ----------
create or replace function public.log_visitor(
    p_class_id bigint,
    p_user_id bigint default null,
    p_guest_id text default null,
    p_display_name text default null,
    p_role text default null,
    p_last_page text default '',
    p_user_agent text default '',
    p_device_type text default '',
    p_platform text default '',
    p_screen_resolution text default '',
    p_browser_language text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = v3, public
as $$
declare
    v_res v3.visitors;
begin
    v_res := v3.log_visitor(
        p_class_id, p_user_id, p_guest_id, p_display_name, p_role,
        p_last_page, p_user_agent, p_device_type, p_platform,
        p_screen_resolution, p_browser_language
    );
    return to_jsonb(v_res);
end;
$$;

create or replace function public.clear_visitors(p_class_id bigint default null)
returns boolean
language plpgsql
security definer
set search_path = v3, public
as $$
begin
    -- Hanya staff terautentikasi (Supabase Auth) yang boleh clear.
    if not v3.is_staff() then
        raise exception 'not authorized' using errcode = '42501';
    end if;
    return v3.clear_visitors(p_class_id);
end;
$$;

-- ---------- 6. Hardening privilege ----------
-- Tulis tabel hanya lewat RPC (security definer). Anon cukup SELECT.
revoke insert, update, delete on v3.visitors from anon;
grant select on v3.visitors to anon, authenticated;

-- Pastikan anon tidak bisa memakai function internal langsung.
revoke all on function v3.log_visitor(bigint,bigint,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;

revoke all on function v3.clear_visitors(bigint) from public, anon, authenticated;
grant execute on function v3.clear_visitors(bigint) to service_role;

-- Wrapper: log boleh anon (tamu/siswa), clear hanya authenticated.
revoke all on function public.log_visitor(bigint,bigint,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.log_visitor(bigint,bigint,text,text,text,text,text,text,text,text,text) to anon, authenticated;

revoke all on function public.clear_visitors(bigint) from public, anon;
grant execute on function public.clear_visitors(bigint) to authenticated;

-- ---------- 7. RLS ----------
drop policy if exists upsert_write on v3.visitors;
drop policy if exists upsert_mod   on v3.visitors;
drop policy if exists staff_del    on v3.visitors;
drop policy if exists read_all     on v3.visitors;
drop policy if exists staff_write  on v3.visitors;

create policy read_all on v3.visitors
    for select to anon, authenticated
    using (true);

-- Tulis langsung hanya staff (RPC tetap jalan karena security definer).
create policy staff_write on v3.visitors
    for all to authenticated
    using (v3.is_staff())
    with check (v3.is_staff());

-- ---------- 8. Realtime ----------
do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'v3'
          and tablename = 'visitors'
    ) then
        alter publication supabase_realtime add table v3.visitors;
    end if;
end $$;

notify pgrst, 'reload schema';

commit;
