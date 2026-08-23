-- Record the legal-document versions accepted during registration.
-- Existing users intentionally remain NULL: acceptance must not be inferred retroactively.
alter table public.profiles
  add column terms_accepted_at timestamptz,
  add column terms_version text,
  add column privacy_accepted_at timestamptz,
  add column privacy_version text,
  add column marketing_consent boolean not null default false,
  add column marketing_consent_at timestamptz;

alter table public.profiles
  add constraint profiles_terms_consent_pair_check
    check ((terms_accepted_at is null) = (terms_version is null)),
  add constraint profiles_privacy_consent_pair_check
    check ((privacy_accepted_at is null) = (privacy_version is null)),
  add constraint profiles_marketing_consent_timestamp_check
    check (
      (marketing_consent and marketing_consent_at is not null)
      or (not marketing_consent and marketing_consent_at is null)
    );

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text;
  normalized_dni text;
  accepted_at timestamptz := now();
  accepted_terms boolean := coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false);
  accepted_privacy boolean := coalesce((new.raw_user_meta_data->>'privacy_accepted')::boolean, false);
  accepts_marketing boolean := coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false);
  accepted_terms_version text := nullif(btrim(new.raw_user_meta_data->>'terms_version'), '');
  accepted_privacy_version text := nullif(btrim(new.raw_user_meta_data->>'privacy_version'), '');
begin
  normalized_phone := public.normalize_digits(new.raw_user_meta_data->>'phone');
  normalized_dni := public.normalize_digits(new.raw_user_meta_data->>'dni');

  if normalized_phone is null then
    raise exception 'El celular es obligatorio para el registro.';
  end if;

  if normalized_dni is null then
    raise exception 'El DNI es obligatorio para el registro.';
  end if;

  if not accepted_terms or accepted_terms_version is null then
    raise exception 'La aceptación de los Términos y Condiciones es obligatoria.';
  end if;

  if not accepted_privacy or accepted_privacy_version is null then
    raise exception 'La aceptación de la Política de Privacidad es obligatoria.';
  end if;

  insert into public.profiles (
    id,
    nombre,
    celular,
    email,
    dni,
    global_role,
    terms_accepted_at,
    terms_version,
    privacy_accepted_at,
    privacy_version,
    marketing_consent,
    marketing_consent_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    normalized_phone,
    new.email,
    normalized_dni,
    'user',
    accepted_at,
    accepted_terms_version,
    accepted_at,
    accepted_privacy_version,
    accepts_marketing,
    case when accepts_marketing then accepted_at else null end
  )
  on conflict (id) do update
    set email = excluded.email,
        nombre = coalesce(public.profiles.nombre, excluded.nombre),
        celular = coalesce(nullif(public.normalize_digits(public.profiles.celular), ''), excluded.celular),
        dni = coalesce(nullif(public.normalize_digits(public.profiles.dni), ''), excluded.dni),
        terms_accepted_at = coalesce(public.profiles.terms_accepted_at, excluded.terms_accepted_at),
        terms_version = coalesce(public.profiles.terms_version, excluded.terms_version),
        privacy_accepted_at = coalesce(public.profiles.privacy_accepted_at, excluded.privacy_accepted_at),
        privacy_version = coalesce(public.profiles.privacy_version, excluded.privacy_version),
        marketing_consent = excluded.marketing_consent,
        marketing_consent_at = excluded.marketing_consent_at;
  -- global_role is intentionally not updated on conflict to preserve elevated roles.

  return new;
end;
$$;
