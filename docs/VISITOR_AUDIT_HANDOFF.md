# Handoff: Audit & Perbaikan Fitur Pengunjung (Visitor)

> Dokumen ini untuk agent/dev berikutnya. Ditulis setelah audit kode + verifikasi langsung schema Supabase.
> Semua path relatif terhadap root repo: `C:\nimi\e-learniz-v3`.
> Stack: HTML + vanilla JS (tanpa build step), Supabase schema `v3`, Cloudflare R2.

---

## 1. TL;DR (baca ini dulu)

Fitur visitor secara fungsional jalan di production, **tapi ada 4 masalah serius**:

1. **SECURITY**: RPC `public.clear_visitors` bisa dipanggil `anon` (siapa saja bisa menghapus/menyembunyikan seluruh daftar pengunjung). Ditambah policy RLS `UPDATE using (true)` + grant `update` ke `anon`, tamu bisa mengubah/hide/unhide baris pengunjung mana pun.
2. **SCHEMA DRIFT**: `db/schema.sql` masih mendefinisikan `v3.visitors` versi lama (PK `user_id`, tanpa `visitor_key/guest_id/display_name/role`). Kolom baru, sequence `v3.guest_seq`, dan RPC `log_visitor`/`clear_visitors` **tidak ada di repo**. Kalau `db/reset.sql` + `db/schema.sql` dijalankan ulang, fitur visitor langsung rusak.
3. **BUG BADGE**: Badge jumlah pengunjung praktis tidak update realtime saat modal tertutup, karena `refreshBadge()` memakai `cachedVisitors` yang tidak pernah di-refresh.
4. **BUG CLEAR**: `clearVisitors()` tidak mengecek `{ error }` dari `client.rpc(...)` sehingga bisa melaporkan sukses padahal gagal. Selain itu daftar langsung terisi lagi oleh entri Presence (online), jadi “Bersihkan” terlihat tidak bekerja.

Sisanya bug menengah/rendah (debounce, presence super_admin, auto-reset client-side, dll) ada di §6.

**Urutan pengerjaan yang disarankan:** §7.1 (security + schema) → §7.2 (badge) → §7.3 (clear) → §7.4 (presence) → §7.5 (debounce) → §7.6 (opsional auto-reset).

---

## 2. Konteks & batasan proyek

- Tidak ada bundler/build step. Edit file langsung, load lewat static server (bukan `file://`).
- UI berbahasa Indonesia.
- Skema DB: `v3.*` lewat PostgREST (`client.schema('v3')`).
- `anon` = tamu **dan** siswa (login siswa hanya “pilih nama”, tanpa Supabase Auth).
- `authenticated` + role staff di `v3.users` = staff/guru/admin.
- Semua migrasi harus **idempotent**, dibungkus `begin; ... commit;`, dan diakhiri `notify pgrst, 'reload schema';`.
- Jangan jalankan perintah destruktif (`db/reset.sql`, drop table) di database live tanpa konfirmasi manusia. Untuk uji, gunakan Supabase branch/local.
- Tool Supabase MCP tersedia (`list_tables`, `execute_sql`, `apply_migration`) — pakai untuk verifikasi, tapi tetap hati-hati karena langsung ke project.

### File utama

| File | Tanggung jawab |
|---|---|
| `js/app.js` | Router SPA; baris `160` memanggil `initVisitorCounter(classId, currentUser)`. |
| `js/visitor.js` | Seluruh UI/behavior visitor: badge, modal, presence, realtime, auto-reset. |
| `js/db.js` | Data layer: `logVisit`, `listVisitors`, `countVisitors`, `clearVisitors`, `getDeviceInfo`. Bagian visitor di `~450-863`. |
| `js/auth.js` | Sesi siswa (localStorage) + verifikasi staff Supabase Auth. |
| `js/ui.js` | Popup/modal (`openModal`/`closeModal` pakai class `is-open`), toast, confirm. |
| `db/schema.sql` | Schema idempotent (saat ini **stale** untuk visitors). |
| `db/migrations/` | Migrasi incremental; pola nama `YYYYMMDD_snake_case.sql`. |
| `index.html` | Markup badge `#visitorCount`, modal `#visitorModal`, body `#visitorModalBody`; load `js/visitor.js` di baris `627`. |
| `css/style.css` | Komponen `.visitor-*` (~baris `6512-6690`). |

---

## 3. Cara kerja saat ini (detail)

### 3.1 Inisialisasi

`js/app.js:101-161` (`loadClassAndData`) memuat kelas/user, lalu:

```js
// js/app.js:160
window.ELearnizVisitor.initVisitorCounter(classId, state.currentUser);
```

`js/visitor.js:849-868`:

```js
async function initVisitorCounter(classId, currentUser) {
  cleanupAll();                    // unsubscribe presence + realtime + timer
  activeClassId = classId ? Number(classId) : null;
  activeUser = currentUser || null;
  selectedClassId = activeClassId;

  bindRouteLogging();              // hashchange -> logCurrentVisit + Ctrl+Q
  await loadClasses();             // tab kelas di modal
  await logCurrentVisit();         // catat kunjungan

  setupPresence();                 // channel global 'elearniz-v3-online'
  setupVisitorsChannel();          // postgres_changes v3.visitors

  await refreshVisitors();         // isi cachedVisitors
  await refreshBadge();
  bindTrigger();
  startAutoResetWatcher();
}
```

### 3.2 Pencatatan kunjungan

`logCurrentVisit` (`visitor.js:370-393`) → `ELearnizDB.logVisit` (`db.js:560-683`):

1. Bangun `visitor_key`:
   - login: `u:<user_id>`
   - tamu: `g:<guest_id>` (`guest_id` disimpan di `localStorage.elearniz_v3_guest_id`)
2. **Selalu** tulis ke `localStorage` key `elearniz_v3_visitors_<classId>_<YYYY-MM-DD>` (fallback offline/RLS).
3. Debounce 2 menit: key `elearniz_v3_visit_log_<visitorKey>`; kalau halaman sama dalam < 2 menit, **return** tanpa ke DB.
4. RPC `log_visitor` (prioritas 1), lalu fallback `upsert` langsung ke `v3.visitors` (prioritas 2).
5. RPC mengembalikan `display_name` (mis. `Tamu #3`) yang disimpan balik ke localStorage.

### 3.3 Daftar & badge

- `listVisitors(classId)` (`db.js:685-754`):
  - query `v3.visitors` `is_visible = true`, `order visited_at desc`, `limit 80`;
  - join nama/role/avatar di memory dari `listUsers(null)`;
  - merge dengan localStorage (DB dulu, lalu lokal; dedupe by `visitor_key`).
- `countVisitors(classId)` (`db.js:762-777`): `count exact` baris `is_visible = true`.
- `refreshBadge()` (`visitor.js:209-229`): kalau `selectedClassId === activeClassId` **dan** `cachedVisitors.length > 0`, badge memakai `cachedVisitors.length`; selain itu `countVisitors(activeClassId)`.
- `mergedVisitorList()` (`visitor.js:497-531`): `cachedVisitors` + **semua** `onlineUsers` (di-`unshift`, tanpa cek `is_visible`).
- `renderVisitorBody()` (`visitor.js:602-646`): render tab kelas, ringkasan, daftar, admin bar staff.

### 3.4 Realtime

- `setupVisitorsChannel()` (`visitor.js:268-287`): channel `postgres_changes` event `*`, `schema:'v3'`, `table:'visitors'`, filter `class_id=eq.<id>` → `scheduleRefresh()`.
- `setupPresence()` (`visitor.js:325-365`): channel global `elearniz-v3-online`, key `u:<id>` / `g:<guestId>`, `track({ id, user_id, guest_id, nickname, role, class_id, avatar_url, online_at })`.
- `rebuildOnlineUsers()` (`visitor.js:300-323`) mengisi `onlineUsers` dari `presenceState()`.

### 3.5 Reset

- Tombol “Bersihkan” (`visitor.js:587-600`, handler `694-727`) → `clearVisitors(selectedClassId || activeClassId)`.
- Auto-reset 15:00 WIB (`visitor.js:424-478`): flag per-browser `localStorage.elearniz_v3_visitor_auto_reset`, dicek tiap 60 detik **hanya kalau staff sedang membuka web**.

### 3.6 Database live (hasil verifikasi saat audit)

Tabel `v3.visitors` live **sudah** punya bentuk baru:

```
visitor_key text PK (not null)
user_id bigint null FK -> v3.users(id)
guest_id text null
display_name text null
role text null default 'guest'
class_id bigint null FK -> v3.classes(id)
last_page text default ''
is_visible boolean not null default true
visited_at timestamptz not null default now()
user_agent/device_type/platform/screen_resolution/browser_language text not null default ''
```

- Sequence: `v3.guest_seq` (bigint, start 1).
- Function: `v3.log_visitor(...) returns v3.visitors`, `public.log_visitor(...) returns jsonb` (wrapper).
- Function: `v3.clear_visitors(p_class_id bigint default null) returns boolean`, `public.clear_visitors(...)` (wrapper).
- **GRANT yang bermasalah:** `public.clear_visitors` dan `v3.clear_visitors` punya `EXECUTE` untuk `PUBLIC` + `anon`.
- RLS `v3.visitors`: `read_all` (select true), `upsert_write` (insert true untuk anon+authenticated), `upsert_mod` (update true untuk anon+authenticated), `staff_del` (delete staff).
- Tabel terdaftar di publication `supabase_realtime`.

> Catatan: angka/isi baris tidak ditulis di sini karena data pribadi. Struktur di atas yang penting.

---

## 4. Temuan (severity + bukti)

| # | Severity | Temuan | Bukti |
|---|---|---|---|
| 1 | 🔴 Critical | `clear_visitors` dapat dieksekusi `anon` → siapa pun bisa menyembunyikan semua pengunjung | Grant `EXECUTE` ke `anon`/`PUBLIC` pada `public.clear_visitors`; function `SECURITY DEFINER` tanpa cek staff |
| 2 | 🔴 Critical | `anon` bisa `UPDATE` semua kolom semua baris `v3.visitors` (hide/rename/unhide) | Policy `upsert_mod ... using (true) with check (true)` + `grant insert, update ... to anon` (`schema.sql:306-307,320`) |
| 3 | 🔴 High | Schema repo tidak sinkron dengan DB live; rebuild dari repo bikin visitor rusak | `schema.sql:101-113` masih PK `user_id`; tidak ada `visitor_key/guest_id/display_name/role`, `guest_seq`, atau RPC di semua file `.sql` |
| 4 | 🟠 High | Badge tidak update realtime saat modal tertutup | `scheduleRefresh()` (`visitor.js:248-255`) tidak memanggil `refreshVisitors()` saat `!modalOpen`; `refreshBadge()` pakai cache stale |
| 5 | 🟠 High | `clearVisitors()` menelan error RPC | `db.js:781-798` hanya `try/catch`; `client.rpc()` tidak throw untuk error PostgREST (`{ error }` diabaikan) |
| 6 | 🟠 Medium | “Bersihkan” terlihat tidak bekerja karena Presence langsung mengisi daftar | `mergedVisitorList()` meng-`unshift` semua `onlineUsers` tanpa cek `is_visible` (`visitor.js:508-527`) |
| 7 | 🟠 Medium | Debounce 2 menit menghalangi baris yang baru di-clear untuk muncul lagi; juga tidak per-kelas | `db.js:600-609`; key `elearniz_v3_visit_log_<visitorKey>` tanpa classId; tidak dibersihkan saat clear |
| 8 | 🟡 Medium | Presence super_admin melaporkan kelas yang salah setelah pindah kelas | `visitor.js:340`: `activeUser.class_id || activeClassId` |
| 9 | 🟡 Medium | Auto-reset 15:00 bukan server-side; hanya jalan jika staff online; setting per-browser | `visitor.js:424-478` |
| 10 | 🟢 Low | Limit daftar 80 vs badge count exact → angka beda | `db.js:698` vs `db.js:766-772` |
| 11 | 🟢 Low | `listUsers(null)` (semua user) dipanggil setiap refresh/polling 20 detik | `db.js:702`; `visitor.js:743-750` |
| 12 | 🟢 Low | Baris tamu lama tetap tampil setelah tamu login sebagai siswa | guest row tidak dihapus/di-hide saat upgrade identitas |
| 13 | 🟢 Low | Client cache lama mengirim presence tanpa prefix → duplikat sementara | presence key berubah `22` → `u:22` di commit `visitorfix` |
| 14 | 🟢 Low | Siswa bisa membuka tab kelas lain di modal | `classes` dimuat semua; `switchVisitorClass()` tanpa cek role |
| 15 | 🟢 Low | Identitas `user_id` bisa dipalsukan lewat RPC | `log_visitor(p_user_id ...)` menerima nilai dari client; siswa tidak punya Supabase Auth |
| 16 | 🟢 Low | Duplikasi `getOrGenerateGuestId` | `db.js:547-558` dan `visitor.js:157-168` |

---

## 5. Root cause ringkas

- **Security**: Desain awal memberi `insert/update` bebas ke `anon` untuk siswa, lalu menambahkan `SECURITY DEFINER` RPC tanpa membatasi eksekusi. `clear` adalah operasi staff tapi pintunya terbuka untuk `anon`.
- **Schema drift**: Perubahan live dilakukan manual lewat SQL Editor, tidak pernah ditulis ke `db/schema.sql`/migration.
- **Badge**: Optimasi “pakai cache supaya tamu lokal ikut terhitung” dibarengi optimasi “jangan refresh saat modal tertutup” → cache jadi stale.
- **Clear**: Salah asumsi bahwa `supabase.rpc()` melempar error; sebenarnya mengembalikan `{ data, error }`.
- **Presence**: Presence dipakai sebagai *sumber baris* (menambah user ke daftar), padahal seharusnya hanya *dekorasi status online*.

---

## 6. Rencana perbaikan teknis

### 6.1 🔴 Security + schema drift (WAJIB)

#### A. Migration baru

Buat file `db/migrations/20261109_visitors_guest_rpc_hardening.sql`.
Isi lengkap (idempotent):

```sql
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
```

> **Catatan penting:** dengan `revoke insert, update ... from anon`, fallback `upsert` langsung di `db.js:636-661` tidak akan pernah berhasil. Itu memang disengaja: satu-satunya jalur tulis adalah RPC `log_visitor`. Hapus/abaikan fallback tersebut (lihat §6.1C).

#### B. Sinkronkan `db/schema.sql`

Ganti blok `create table ... v3.visitors` (`schema.sql:101-113`) dengan bentuk baru:

```sql
create table if not exists v3.visitors (
    visitor_key       text primary key,
    user_id           bigint references v3.users(id) on delete cascade,
    guest_id          text,
    display_name      text default '',
    role              text not null default 'guest',
    class_id          bigint references v3.classes(id) on delete cascade,
    last_page         text default '',
    is_visible        boolean not null default true,
    visited_at        timestamptz not null default now(),
    user_agent        text not null default '',
    device_type       text not null default '',
    platform          text not null default '',
    screen_resolution text not null default '',
    browser_language  text not null default ''
);
```

Lalu di `schema.sql`:
- tambahkan `create sequence if not exists v3.guest_seq;`
- salin function `v3.log_visitor`, `public.log_visitor`, `v3.clear_visitors`, `public.clear_visitors` dari migration di atas (setelah helper `v3.is_staff()`).
- ganti policy visitors: hapus `upsert_write`/`upsert_mod` untuk visitors, tambah `staff_write`.
- ganti grant: `revoke insert, update, delete on v3.visitors from anon;` dan `grant select` saja.
- update komentar header `schema.sql:17` dan `db.js:11`.

#### C. Rapikan `js/db.js`

1. **`clearVisitors`** (`db.js:781-813`) — cek error dan jangan klaim sukses palsu:

```js
async function clearVisitors(classId) {
  const client = getClient();
  let dbError = null;

  if (client) {
    const { data, error } = await client.rpc('clear_visitors', {
      p_class_id: classId ? Number(classId) : null
    });
    if (error) dbError = error;
    else if (data === false) dbError = new Error('Reset pengunjung gagal.');
  } else {
    dbError = new Error('Koneksi Supabase tidak tersedia.');
  }

  // Selalu bersihkan cache lokal (agar UI offline konsisten).
  try {
    if (classId) {
      writeLocalVisitors(classId, []);
    } else {
      const prefix = 'elearniz_v3_visitors_';
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (key && key.indexOf(prefix) === 0) localStorage.removeItem(key);
      }
    }
    // Hapus debounce agar kunjungan berikutnya langsung tercatat.
    const debouncePrefix = 'elearniz_v3_visit_log_';
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.indexOf(debouncePrefix) === 0) localStorage.removeItem(key);
    }
  } catch (_) {}

  if (dbError) throw dbError;
  return true;
}
```

2. **`logVisit`** — hapus fallback upsert langsung (sudah tidak diizinkan), atau minimal beri komentar jelas. Cukup:

```js
// Prioritas 1: RPC atomik (satu-satunya jalur tulis).
let serverRow = null;
try {
  const { data, error } = await client.rpc('log_visitor', { ... });
  if (!error && data) serverRow = data;
} catch (err) {
  console.warn('logVisit rpc error:', err);
}
```

3. **Debounce per kelas** (`db.js:601`):

```js
const debounceKey = `elearniz_v3_visit_log_${Number(classId)}_${visitorKey}`;
```

4. (Opsional) hapus duplikasi `getOrGenerateGuestId` — cukup satu helper di `db.js`, expose lewat `window.ELearnizDB.getGuestId` bila `visitor.js` butuh.

---

### 6.2 🟠 Fix badge realtime (`js/visitor.js`)

**Pilihan minimal (rekomendasi):** saat modal tertutup, jangan pakai cache; pakai count DB.

```js
async function refreshBadge() {
  if (!activeClassId) {
    updateBadge(0);
    return;
  }

  let count = 0;
  try {
    // Cache hanya boleh dipakai saat modal terbuka pada kelas aktif,
    // karena saat itu istilahnya baru di-refresh.
    if (modalOpen &&
        Number(selectedClassId) === Number(activeClassId) &&
        cachedVisitors.length > 0) {
      count = cachedVisitors.length;
    } else {
      count = await window.ELearnizDB.countVisitors(activeClassId);
    }
    updateBadge(count);
    if (!modalOpen) updateModalCount(count);
  } catch (err) {
    console.warn('refreshBadge error:', err);
  }
}
```

Alternatif: biarkan `refreshBadge` apa adanya, tapi ubah `scheduleRefresh` agar **selalu** refresh cache:

```js
function scheduleRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(async () => {
    refreshTimer = null;
    await refreshVisitors();   // selalu, walau modal tertutup
    await refreshBadge();
  }, 450);
}
```

Test: buka web di 2 browser/incognito, login sebagai user berbeda. Badge di browser A harus naik/turun dalam ~1-2 detik saat browser B membuka halaman.

---

### 6.3 🟠 Fix “Bersihkan” + Presence

**A. `visitor.js:508-527` — presence jangan menambah baris.**

Rekomendasi: presence hanya sebagai dekorasi status online (dot), bukan sumber baris. Hapus blok `onlineUsers.forEach(... list.unshift(...))`, atau minimal hanya masukkan presence yang key-nya sudah ada di `cachedVisitors`:

```js
// Presence HANYA untuk status online; baris tetap dari DB/local.
onlineUsers.forEach((u, k) => {
  if (target && u.class_id && Number(u.class_id) !== Number(target)) return;
  const key = k || (u.user_id ? `u:${u.user_id}` : (u.guest_id ? `g:${u.guest_id}` : ''));
  if (!key || !seen.has(key)) return; // <-- kunci perubahan
  // (tidak perlu unshift; item sudah ada, dot online dihitung via isUserOnline)
});
```

Efek: setelah “Bersihkan”, daftar benar-benar kosong sampai ada kunjungan baru. Ini perubahan perilaku — **konfirmasi ke product owner** kalau ingin user online tetap tampil.

**B. Badge/modal count konsisten.** Setelah A, `list.length` = `cachedVisitors.length`; badge dan modal count akan sama. Pastikan `updateModalCount()` dipanggil dari sumber yang sama.

**C. Toast error.** `handleReset` sudah `catch` + `toast('Gagal reset...')`; dengan `clearVisitors` yang sekarang throw, ini akan benar-benar muncul saat gagal.

---

### 6.4 🟡 Fix presence kelas super_admin (`visitor.js:339-340`)

```js
// Presence merepresentasikan kelas yang SEDANG dilihat.
const classId = activeClassId || (activeUser ? activeUser.class_id : null);
```

Untuk siswa, `activeClassId` sudah dikunci ke kelas mereka di `app.js:127-133`, jadi aman. Untuk super_admin yang pindah kelas, `initVisitorCounter` dipanggil ulang (`app.js:329`) sehingga presence re-track dengan kelas baru.

---

### 6.5 🟡 Debounce & waktu kunjungan

- Key debounce sudah diperbaiki di §6.1C (per kelas).
- Saat `clearVisitors`, hapus semua key `elearniz_v3_visit_log_*` (§6.1C), supaya reload halaman yang sama langsung tercatat lagi.
- (Opsional) Saat merge di `listVisitors` (`db.js:740-753`), untuk key duplikat pilih `visited_at` terbaru (bukan selalu DB), agar waktu lokal yang lebih baru tidak “kalah” dari DB yang lama karena debounce.

Contoh merge yang lebih benar:

```js
const byKey = new Map();
const keyOf = (v) => v.visitor_key || (v.user_id ? `u:${v.user_id}` : (v.guest_id ? `g:${v.guest_id}` : ''));
const put = (v) => {
  const k = keyOf(v);
  if (!k) return;
  const prev = byKey.get(k);
  if (!prev) { byKey.set(k, v); return; }
  const tNew = new Date(v.visited_at || 0).getTime();
  const tOld = new Date(prev.visited_at || 0).getTime();
  // Pilih timestamp terbaru, tapi pertahankan field lengkap dari DB bila ada.
  byKey.set(k, tNew >= tOld ? { ...prev, ...v, source: v.source || prev.source } : prev);
};
dbVisitors.forEach(put);
local.forEach(put);
return [...byKey.values()].sort((a, b) => new Date(b.visited_at || 0) - new Date(a.visited_at || 0));
```

> Hati-hati: `{ ...prev, ...v }` bisa menimpa `display_name` DB dengan nama lokal `Tamu`. Kalau mau, prioritaskan field identitas dari DB (`source === 'db'`).

---

### 6.6 🟡 Auto-reset 15:00 (opsional, tapi disarankan)

Saat ini client-side dan per-browser. Opsi server-side dengan `pg_cron`:

```sql
-- 08:00 UTC = 15:00 WIB
select cron.schedule(
  'v3-visitors-daily-reset',
  '0 8 * * *',
  $$ select v3.clear_visitors(null); $$
);
```

Syarat:
- ekstensi `pg_cron` aktif;
- job berjalan sebagai role yang punya `EXECUTE` pada `v3.clear_visitors` (postgres/owner/service_role sesuai §6.1A);
- kalau memakai ini, matikan/ubah checkbox “Auto reset 15:00” di UI supaya tidak double-clear dan tidak menyesatkan.

Kalau tetap client-side, minimal:
- reset juga `guest_seq` konsisten (saat ini hanya clear global yang reset nomor);
- dokumentasikan bahwa reset hanya terjadi jika staff membuka web setelah 15:00;
- simpan status auto-reset di DB (mis. tabel `v3.settings`) kalau ingin konsisten antar-browser/staff.

---

### 6.7 🟢 Perbaikan kecil (boleh menyusul)

- Samakan jumlah: pakai `countVisitors` untuk badge dan `listVisitors` untuk isi; atau naikkan `limit(80)` dan tampilkan “80+”.
- Cache `listUsers(null)` per sesi di `db.js` (jangan query 135 user setiap 20 detik).
- Saat siswa login dari mode tamu, hide/delete baris guest lama (`is_visible=false`) untuk guest_id browser tersebut.
- Presence: normalisasi key agar kompatibel dengan client lama (terima `meta.id` angka dan `u:`).
- Batasi tab kelas di modal untuk non-staff (atau sembunyikan).
- `log_visitor`: kalau `auth.uid()` tidak null, validasi `p_user_id` milik user tersebut. Untuk siswa anon, spoofing tetap mungkin — catat sebagai risiko residual model login tanpa password.

---

## 7. Acceptance criteria / QA checklist

### Security
- [ ] `anon` memanggil `rpc('clear_visitors')` → error `42501 not authorized` (bukan sukses).
- [ ] `anon` `PATCH /rest/v1/visitors` → 401/403 (tidak bisa update/hide/rename).
- [ ] `anon` `POST /rest/v1/visitors` → 401/403.
- [ ] `anon` `rpc('log_visitor', ...)` tetap sukses dan memberi `Tamu #n`.
- [ ] Staff login → tombol “Bersihkan” sukses, baris `is_visible` jadi false.
- [ ] `select` visitors tetap bisa untuk anon (daftar & realtime).
- [ ] `EXECUTE` `public.clear_visitors` tidak lagi ada untuk `anon`/`PUBLIC`.

### Fungsional
- [ ] Login siswa → muncul di daftar dengan nama & role benar.
- [ ] Mode tamu baru → dapat `Tamu #1`, `Tamu #2`, dst.
- [ ] Reload halaman yang sama < 2 menit → tidak menambah baris/angka.
- [ ] Navigasi Beranda → Materi → Tugas → `last_page` berubah.
- [ ] Badge berubah realtime saat browser lain membuka halaman (modal tertutup).
- [ ] Modal terbuka: daftar update realtime dan polling 20 detik.
- [ ] Presence online dot muncul/hilang saat user keluar.
- [ ] Super admin pindah kelas → presence ikut kelas baru; visitor list ikut kelas baru.
- [ ] “Bersihkan” → daftar kosong (setelah fix presence) dan badge 0.
- [ ] Auto-reset (jika dipakai) jalan sekali per hari.

### Regresi
- [ ] `db/reset.sql` + `db/schema.sql` di DB kosong → fitur visitor langsung jalan.
- [ ] Apply migration di DB yang sudah berisi → tidak ada data hilang, PK pindah ke `visitor_key`.
- [ ] `sw.js` cache version dinaikkan jika ada perubahan file frontend.
- [ ] Tidak ada error console saat load/modal/clear.

---

## 8. Perintah verifikasi SQL yang berguna

```sql
-- Struktur kolom
select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'v3' and table_name = 'visitors'
order by ordinal_position;

-- PK
select c.conname, pg_get_constraintdef(c.oid)
from pg_constraint c
where c.conrelid = 'v3.visitors'::regclass and c.contype = 'p';

-- Function & grant
select routine_schema, routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_name in ('log_visitor','clear_visitors')
order by 1,2,3;

-- Policy
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'v3' and tablename = 'visitors'
order by policyname;

-- Data ringkas (hindari PII saat share)
select count(*) filter (where is_visible) as visible,
       count(*) as total,
       count(*) filter (where role = 'guest') as guests,
       count(*) filter (where user_id is not null) as users
from v3.visitors;
```

Contoh pembuktian bug (jangan dijalankan di live tanpa izin; cukup di branch/local):

```js
// Di console sebagai anon
await window.supabase
  .createClient(V3_SUPABASE_URL, V3_SUPABASE_ANON_KEY)
  .rpc('clear_visitors');   // saat ini sukses -> BUG
```

---

## 9. Catatan implementasi untuk agent berikutnya

1. **Jangan** edit database live langsung untuk eksperimen. Pakai branch/local atau minta konfirmasi.
2. Terapkan migration dulu, verifikasi grant/policy, baru ubah frontend.
3. Frontend tidak punya build step; cukup edit `js/*.js`. Naikkan versi cache `sw.js` bila perlu agar service worker tidak menyajikan file lama.
4. Jaga bahasa UI tetap Indonesia dan gaya kode yang ada (IIFE, `esc()`, `window.ELearniz*`).
5. Kalau mengubah bentuk data visitor, update juga komentar header `js/db.js:11` dan README bagian autentikasi/keamanan (`README.md:44`) serta bagian fitur (`README.md:17`).
6. Setelah selesai, jalankan QA checklist §7 dan lampirkan hasil query verifikasi §8.

---

## 10. Keputusan produk yang perlu dikonfirmasi

1. Setelah “Bersihkan”, apakah user yang **sedang online** harus tetap tampil? (Rekomendasi: tidak; presence hanya dekorasi.)
2. Apakah auto-reset ingin dipindah ke server (`pg_cron`), atau tetap client-side?
3. Apakah siswa boleh melihat tab kelas lain di modal pengunjung?
4. Apakah baris tamu lama perlu di-hide otomatis saat tamu login sebagai siswa?
5. Apakah `log_visitor` perlu rate-limit untuk mencegah spam baris tamu?

---

*Selesai. Dokumen ini dibuat dari audit kode + verifikasi schema live. Nomor baris dapat bergeser setelah perubahan; gunakan nama fungsi/selector sebagai acuan utama.*
