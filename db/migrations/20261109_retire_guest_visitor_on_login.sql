-- ============================================================
-- E-Learniz v3 — MIGRATION (idempotent)
-- 2026-11-09: Hilangkan jejak visitor tamu saat login dengan akun
--
-- 1. Tambah function internal v3.retire_guest_visitor
-- 2. Update v3.log_visitor: saat p_user_id > 0 dan p_guest_id ada,
--    sembunyikan (is_visible = false) baris tamu milik perangkat ini.
-- 3. Tambah wrapper public.retire_guest_visitor (grant ke anon, authenticated)
-- 4. Pastikan replica identity full pada v3.visitors untuk CDC Realtime
-- ============================================================

begin;

-- ---------- 1. Function internal: retire guest visitor ----------
create or replace function v3.retire_guest_visitor(p_guest_id text)
returns boolean
language plpgsql
security definer
set search_path = v3, public
as $$
declare
    v_gid text;
begin
    if p_guest_id is null or trim(p_guest_id) = '' then
        return false;
    end if;

    v_gid := regexp_replace(trim(p_guest_id), '^g:', '');

    update v3.visitors
       set is_visible = false
     where (visitor_key = 'g:' || v_gid or guest_id = v_gid or guest_id = p_guest_id)
       and role = 'guest'
       and is_visible = true;

    return true;
end;
$$;

-- ---------- 2. Function internal: log tamu/user (diperbarui) ----------
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

        -- Jika ada jejak guest_id dari perangkat yang sama sebelum login,
        -- sembunyikan/hilangkan baris tamu tersebut agar tidak duplikat.
        if p_guest_id is not null and trim(p_guest_id) <> '' then
            perform v3.retire_guest_visitor(p_guest_id);
        end if;

        -- Untuk akun terdaftar, kolom guest_id dikosongkan
        p_guest_id := null;
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
        guest_id          = excluded.guest_id,
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

-- ---------- 3. Wrapper publik: retire_guest_visitor ----------
create or replace function public.retire_guest_visitor(p_guest_id text)
returns boolean
language plpgsql
security definer
set search_path = v3, public
as $$
begin
    return v3.retire_guest_visitor(p_guest_id);
end;
$$;

-- ---------- 4. Grants ----------
revoke all on function v3.retire_guest_visitor(text) from public, anon, authenticated;
grant execute on function v3.retire_guest_visitor(text) to service_role;

revoke all on function public.retire_guest_visitor(text) from public, anon, authenticated;
grant execute on function public.retire_guest_visitor(text) to anon, authenticated;

-- ---------- 5. Replica Identity untuk Realtime ----------
alter table v3.visitors replica identity full;

notify pgrst, 'reload schema';

commit;
