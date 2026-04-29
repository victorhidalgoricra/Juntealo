-- Fix regex escaping bug in normalize_digits and related constraints.
--
-- Root cause: migrations 020 and 032 used '\\D' / '\\d' in regular SQL string literals.
-- With standard_conforming_strings = on (PostgreSQL default since 9.1, used by Supabase),
-- backslashes are NOT escape characters in plain string literals, so:
--   '\\D' is the 3-char string \\D  →  regex sees \\D = literal backslash + D  (NOT non-digit)
--   '\\d' is the 3-char string \\d  →  regex sees \\d = literal backslash + d  (NOT digit class)
-- This caused normalize_digits() to not strip anything, and the check constraint to
-- never match a real DNI, violating profiles_dni_format_chk on every non-null DNI insert.
-- Fix: use [^0-9] and [0-9] which need no backslash escaping.

create or replace function public.normalize_digits(input text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(input, ''), '[^0-9]', '', 'g'), '');
$$;

-- Recreate dni check constraint with correct regex
alter table public.profiles
  drop constraint if exists profiles_dni_format_chk;

alter table public.profiles
  add constraint profiles_dni_format_chk
  check (dni is null or public.normalize_digits(dni) ~ '^[0-9]{8}$');

-- Recreate celular check constraint with correct regex
alter table public.profiles
  drop constraint if exists profiles_celular_format_chk;

alter table public.profiles
  add constraint profiles_celular_format_chk
  check (public.normalize_digits(celular) ~ '^[0-9]{9,11}$');
