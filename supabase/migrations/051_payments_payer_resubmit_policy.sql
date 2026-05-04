-- Allow non-admin payers to update their own payment when re-submitting after rejection.
--
-- Without this, submitPayment's UPDATE path fails for non-admin members because
-- the only existing UPDATE policy ("payments approve by admin") requires is_junta_admin().
--
-- USING:      only target rows the payer owns and that are not yet approved
--             (prevents undoing an admin approval)
-- WITH CHECK: the new estado must be 'pendiente_aprobacion' — payers cannot self-approve
--             or self-reject

create policy "payments resubmit by payer" on public.payments
  for update
  using (profile_id = auth.uid() and estado <> 'aprobado')
  with check (profile_id = auth.uid() and estado = 'pendiente_aprobacion');
