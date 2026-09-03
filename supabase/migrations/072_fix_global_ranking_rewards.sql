-- Restore ranking visibility and include the persisted reward signals used by
-- the client score. Zero-score profiles stay private except for the caller.

create or replace function public.get_global_ranking()
returns table (
  profile_id uuid, display_name text, initials text, score integer,
  level text, position bigint, is_current_user boolean
)
language sql stable security definer set search_path = public as $$
  with score_inputs as (
    select
      p.id,
      case
        when nullif(trim(p.first_name), '') is not null then trim(p.first_name) ||
          case when nullif(trim(p.paternal_last_name), '') is not null
            then ' ' || upper(left(trim(p.paternal_last_name), 1)) || '.' else '' end
        when array_length(regexp_split_to_array(trim(p.nombre), '\s+'), 1) > 1 then
          split_part(trim(p.nombre), ' ', 1) || ' ' ||
          upper(left((regexp_split_to_array(trim(p.nombre), '\s+'))[
            array_length(regexp_split_to_array(trim(p.nombre), '\s+'), 1)
          ], 1)) || '.'
        else coalesce(nullif(trim(p.nombre), ''), 'Miembro')
      end as public_name,
      public.current_junta_score(p.id) as base_score,
      least((select count(*) from public.referrals r
        where r.referrer_id = p.id and r.status = 'active'), 4) as active_referrals,
      (select count(*) from public.juntas j where j.estado::text = 'cerrada' and
        (j.admin_id = p.id or exists (
          select 1 from public.junta_members jm
          where jm.junta_id = j.id and jm.profile_id = p.id
            and jm.estado::text in ('activo', 'moroso')
        ))) as completed_cycles,
      p.created_at
    from public.profiles p
  ), scored as (
    select *, greatest(0, least(100, round(
      base_score + ((active_referrals::numeric / 7) * 10)
    )))::integer as user_score
    from score_inputs
  ), visible as (
    select * from scored where user_score > 0 or id = auth.uid()
  ), ranked as (
    select *, row_number() over (
      order by user_score desc, completed_cycles desc, created_at asc, public_name asc
    ) as rank_position
    from visible
  )
  select id, public_name,
    upper(left(split_part(public_name, ' ', 1), 1) ||
      left(coalesce(nullif(split_part(public_name, ' ', 2), ''),
      split_part(public_name, ' ', 1)), 1)),
    user_score,
    case when user_score >= 85 then 'Élite'
      when user_score >= 70 then 'Oro'
      when user_score >= 50 then 'Plata'
      when user_score >= 30 then 'Bronce' else 'Nuevo' end,
    rank_position, id = auth.uid()
  from ranked order by rank_position;
$$;

revoke all on function public.get_global_ranking() from public, anon;
grant execute on function public.get_global_ranking() to authenticated;
