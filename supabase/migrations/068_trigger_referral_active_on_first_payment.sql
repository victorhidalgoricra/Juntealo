-- ============================================================
-- 068 — Activar referido al validar su primer pago
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_referral_active_on_first_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    NEW.estado::text = 'aprobado'
    OR NEW.payment_status = 'approved'
  ) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
    AND (
      OLD.estado::text = 'aprobado'
      OR OLD.payment_status = 'approved'
    )
  THEN
    RETURN NEW;
  END IF;

  UPDATE public.referrals
  SET status = 'active'
  WHERE referred_id = NEW.profile_id
    AND status = 'pending'
    AND NOT EXISTS (
      SELECT 1
      FROM public.payments p
      WHERE p.profile_id = NEW.profile_id
        AND p.id <> NEW.id
        AND (
          p.estado::text = 'aprobado'
          OR p.payment_status = 'approved'
        )
    );

  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_active
  AFTER INSERT OR UPDATE OF estado, payment_status ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_referral_active_on_first_payment();
