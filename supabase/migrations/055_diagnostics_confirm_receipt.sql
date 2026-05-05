-- Diagnostic queries for confirm_round_receipt mismatches.
-- Run these manually in the Supabase SQL editor to detect data inconsistencies.
-- This file contains NO schema changes — only diagnostic SELECTs and a helper view.

-- ─── 1. Profiles with duplicate email (auth.uid ≠ profiles.id for same email) ───
-- If any row appears here, the profile resolution in confirm_round_receipt will
-- pick the wrong profile_id for that user.
select
  p.email,
  p.id                as profile_id,
  au.id               as auth_uid,
  (p.id = au.id)      as ids_match
from public.profiles p
join auth.users au on au.email = p.email
where p.id <> au.id
order by p.email;

-- ─── 2. Duplicate junta_members (same junta_id + profile_id) ─────────────────
-- Duplicates cause jm.profile_id lookups to be ambiguous and may return the wrong member.
select
  junta_id,
  profile_id,
  count(*) as member_count,
  array_agg(id) as member_ids,
  array_agg(estado) as estados,
  array_agg(orden_turno) as turnos
from public.junta_members
group by junta_id, profile_id
having count(*) > 1
order by junta_id, profile_id;

-- ─── 3. Rounds where receiver_profile_id is not an active member ─────────────
-- Detects payouts whose profile_id is no longer (or was never) an active member
-- of that junta.  The receiver check in confirm_round_receipt only looks at active members,
-- so an inactive/missing member in junta_members is invisible to the function.
select
  po.id               as payout_id,
  po.junta_id,
  po.ronda_numero,
  po.profile_id       as receiver_profile_id,
  jm.id               as member_id,
  jm.estado           as member_estado
from public.payouts po
left join public.junta_members jm
       on jm.junta_id   = po.junta_id
      and jm.profile_id = po.profile_id
where jm.id is null or jm.estado <> 'activo'
order by po.junta_id, po.ronda_numero;

-- ─── 4. Current round mismatch between actual payouts and expected receiver ───
-- For each active junta, shows the backend-computed current round and who the
-- receiver should be.  Compare this with what the UI is showing.
select
  j.id                                                    as junta_id,
  j.nombre,
  (select count(*)::int from public.payouts where junta_id = j.id) as completed_payouts,
  (select count(*)::int from public.payouts where junta_id = j.id) + 1
                                                          as current_round_backend,
  jm.profile_id                                           as expected_receiver_profile_id,
  jm.orden_turno                                          as receiver_orden_turno,
  pr.email                                                as receiver_email
from public.juntas j
join public.junta_members jm
  on jm.junta_id = j.id
 and jm.estado   = 'activo'
 and jm.orden_turno = (select count(*)::int + 1 from public.payouts where junta_id = j.id)
left join public.profiles pr on pr.id = jm.profile_id
where j.estado = 'activa'
order by j.nombre;

-- ─── 5. auth.uid vs profiles.id consistency check ────────────────────────────
-- Users where the JWT sub (auth.uid) does NOT equal their profiles.id but the
-- email matches a profile.  These users would fail the direct id=v_uid lookup
-- and rely on the email fallback, which could pick the wrong profile if there
-- are duplicates (see query 1).
select
  au.id               as auth_uid,
  au.email,
  p.id                as profile_id,
  (au.id = p.id)      as uid_matches_profile
from auth.users au
join public.profiles p on p.email = au.email
where au.id <> p.id
order by au.email;

-- ─── 6. Junta members whose orden_turno is NULL or 0 while junta is active ──
-- A NULL/0 orden_turno means confirm_round_receipt can never find this member
-- as receiver, but may still block the junta if payments are expected from them.
select
  jm.junta_id,
  j.nombre            as junta_nombre,
  jm.profile_id,
  jm.orden_turno,
  jm.estado,
  p.email
from public.junta_members jm
join public.juntas j on j.id = jm.junta_id
left join public.profiles p on p.id = jm.profile_id
where j.estado = 'activa'
  and jm.estado = 'activo'
  and (jm.orden_turno is null or jm.orden_turno = 0)
order by j.nombre;
