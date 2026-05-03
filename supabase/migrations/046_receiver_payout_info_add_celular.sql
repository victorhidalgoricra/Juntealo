-- Extend get_receiver_payout_info to also return celular from profiles.
-- Required so the payment mapper can use celular as a fallback phone number
-- for Yape/Plin when payout_phone_number has not been explicitly set.

create or replace function public.get_receiver_payout_info(
  p_junta_id uuid,
  p_profile_id uuid
)
returns table (
  first_name text,
  second_name text,
  paternal_last_name text,
  nombre text,
  celular text,
  preferred_payout_method text,
  payout_account_name text,
  payout_phone_number text,
  payout_bank_name text,
  payout_account_number text,
  payout_cci text,
  payout_notes text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Caller must be admin or active member of the junta
  if not (
    exists (
      select 1 from public.juntas j
      where j.id = p_junta_id
        and j.admin_id = auth.uid()
    )
    or exists (
      select 1 from public.junta_members jm
      where jm.junta_id = p_junta_id
        and jm.profile_id = auth.uid()
        and jm.estado = 'activo'
    )
  ) then
    raise exception 'No autorizado para ver los datos de pago de esta junta';
  end if;

  -- Target must be an active member of the same junta (prevents reading arbitrary profiles)
  if not exists (
    select 1 from public.junta_members jm
    where jm.junta_id = p_junta_id
      and jm.profile_id = p_profile_id
      and jm.estado = 'activo'
  ) then
    raise exception 'El perfil solicitado no es miembro activo de esta junta';
  end if;

  return query
  select
    p.first_name,
    p.second_name,
    p.paternal_last_name,
    p.nombre,
    p.celular,
    p.preferred_payout_method,
    p.payout_account_name,
    p.payout_phone_number,
    p.payout_bank_name,
    p.payout_account_number,
    p.payout_cci,
    p.payout_notes
  from public.profiles p
  where p.id = p_profile_id;
end;
$$;

revoke all on function public.get_receiver_payout_info(uuid, uuid) from public;
grant execute on function public.get_receiver_payout_info(uuid, uuid) to authenticated;
