-- ============================================================
-- E-Learniz v3 — MIGRATION (idempotent)
-- 2026-11-08: Detail perangkat pengunjung + realtime
--
-- Menyamakan popup "Pengunjung" dengan versi v2:
--   • simpan info perangkat (device, platform, resolusi, bahasa, UA)
--   • aktifkan realtime untuk tabel v3.visitors supaya daftar
--     pengunjung & badge jumlah update tanpa reload.
--
-- Aman dijalankan ulang. Tidak menghapus data.
-- ============================================================

begin;

alter table v3.visitors
    add column if not exists user_agent        text not null default '',
    add column if not exists device_type       text not null default '',
    add column if not exists platform          text not null default '',
    add column if not exists screen_resolution text not null default '',
    add column if not exists browser_language  text not null default '';

-- Index untuk daftar pengunjung per kelas (kalau belum ada).
create index if not exists visitors_class_idx
    on v3.visitors (class_id, visited_at desc);

-- Realtime: daftarkan v3.visitors ke publication (idempotent).
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
