-- Drop the legacy no-arg admin_list_juntas() function left over from migration 027.
--
-- The problem: migrations 028/029 created admin_list_juntas(p_include_blocked boolean)
-- as a NEW overloaded function instead of replacing the original admin_list_juntas().
-- PostgREST cannot resolve overloaded functions and routes to one of them
-- non-deterministically. When it picks the no-arg version, the response has no
-- `bloqueada` column → row.bloqueada = undefined → isRowBlocked() returns false
-- → the delete button stays enabled after a soft-delete.
--
-- After dropping the no-arg version, PostgREST will unambiguously route to
-- admin_list_juntas(boolean) which correctly returns bloqueada.

drop function if exists public.admin_list_juntas();
