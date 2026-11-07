-- ============================================================
-- E-Learniz v3 — MIGRATION (idempotent)
-- 2026-11-07: Kunci hak DELETE anon di v3.task_progress & v3.visitors
--
-- Masalah: policy lama `upsert_del ... for delete to anon ... using (true)`
-- memperbolehkan siapa pun (tanpa login) menghapus SEMUA baris pada kedua
-- tabel tersebut.
--
-- Perbaikan:
--   1. Hapus policy `upsert_del` / `staff_del` lama (idempotent).
--   2. Buat `staff_del`: DELETE hanya untuk staff terautentikasi (v3.is_staff()).
--   3. Cabut grant DELETE dari role `anon`.
--
-- Catatan aplikasi: tombol "Tandai Belum Selesai" tidak lagi menghapus baris,
-- melainkan menyimpan done=false (js/db.js), jadi siswa tidak terdampak.
-- ============================================================

begin;

drop policy if exists upsert_del on v3.task_progress;
drop policy if exists upsert_del on v3.visitors;
drop policy if exists staff_del  on v3.task_progress;
drop policy if exists staff_del  on v3.visitors;

create policy staff_del on v3.task_progress
    for delete to authenticated using (v3.is_staff());
create policy staff_del on v3.visitors
    for delete to authenticated using (v3.is_staff());

revoke delete on v3.task_progress, v3.visitors from anon;
grant delete on v3.task_progress, v3.visitors to authenticated;

notify pgrst, 'reload schema';

commit;
