-- ============================================================
-- 067 — Sistema de referidos
-- ============================================================

-- 1. Agregar columna referral_code a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Función para generar código de referido único a partir del nombre
CREATE OR REPLACE FUNCTION generate_referral_code(p_nombre TEXT, p_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_base    TEXT;
  v_code    TEXT;
  v_attempt INTEGER := 0;
BEGIN
  -- Primer nombre → sin tildes → mayúsculas → solo letras → máx 8 chars
  v_base := LEFT(
    REGEXP_REPLACE(
      UPPER(TRANSLATE(
        COALESCE(SPLIT_PART(TRIM(p_nombre), ' ', 1), ''),
        'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
        'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'
      )),
      '[^A-Z]', '', 'g'
    ),
    8
  );

  -- Fallback si el nombre no produce al menos 2 letras
  IF length(COALESCE(v_base, '')) < 2 THEN
    v_base := LEFT(UPPER(REPLACE(p_id::TEXT, '-', '')), 6);
  END IF;

  -- Buscar código único con 2 dígitos aleatorios al final
  LOOP
    v_code := v_base || LPAD((FLOOR(RANDOM() * 100))::INTEGER::TEXT, 2, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = v_code);
    v_attempt := v_attempt + 1;
    -- Fallback extremo: usar UUID truncado + 4 dígitos
    IF v_attempt > 50 THEN
      v_code := LEFT(UPPER(REPLACE(p_id::TEXT, '-', '')), 6) || LPAD((FLOOR(RANDOM() * 10000))::INTEGER::TEXT, 4, '0');
      EXIT;
    END IF;
  END LOOP;

  RETURN v_code;
END;
$$;

-- 3. Trigger: generar referral_code automáticamente en INSERT de profiles
CREATE OR REPLACE FUNCTION handle_profile_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code(NEW.nombre, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_set_referral_code ON profiles;
CREATE TRIGGER profile_set_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_referral_code();

-- 4. Backfill: generar códigos para perfiles existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, nombre FROM profiles WHERE referral_code IS NULL LOOP
    UPDATE profiles
    SET referral_code = generate_referral_code(r.nombre, r.id)
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 5. Tabla de referidos
CREATE TABLE IF NOT EXISTS referrals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID NOT NULL REFERENCES profiles(id),
  referred_id  UUID NOT NULL UNIQUE REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  tokens_earned NUMERIC NOT NULL DEFAULT 0
);

-- 6. RLS en referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Un usuario solo puede leer las filas donde es el referidor
CREATE POLICY "referrals_select_as_referrer" ON referrals
  FOR SELECT USING (referrer_id = auth.uid());

-- INSERT y UPDATE: solo via funciones SECURITY DEFINER (service role bypass)

-- 7. RPC: validar código de referido (accesible sin autenticación para validación en signup)
CREATE OR REPLACE FUNCTION validate_referral_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre TEXT;
BEGIN
  SELECT nombre INTO v_nombre
  FROM profiles
  WHERE referral_code = UPPER(TRIM(p_code));

  IF v_nombre IS NULL THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  RETURN jsonb_build_object('exists', true, 'referrer_nombre', v_nombre);
END;
$$;

GRANT EXECUTE ON FUNCTION validate_referral_code(TEXT) TO anon, authenticated;

-- 8. RPC: usar código de referido (nuevo usuario autenticado post-registro)
CREATE OR REPLACE FUNCTION use_referral_code(p_referral_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referred_id UUID;
BEGIN
  v_referred_id := auth.uid();

  IF v_referred_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE referral_code = UPPER(TRIM(p_referral_code));

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'code_not_found');
  END IF;

  IF v_referrer_id = v_referred_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'self_referral');
  END IF;

  INSERT INTO referrals (referrer_id, referred_id, status)
  VALUES (v_referrer_id, v_referred_id, 'pending')
  ON CONFLICT (referred_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION use_referral_code(TEXT) TO authenticated;

-- 9. RPC: estadísticas de referidos para el dashboard
CREATE OR REPLACE FUNCTION get_referral_stats(p_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total  BIGINT;
  v_active BIGINT;
BEGIN
  -- Solo permite consultar las propias estadísticas
  IF auth.uid() IS NULL OR auth.uid() != p_profile_id THEN
    RETURN jsonb_build_object('total', 0, 'active', 0);
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'active')
  INTO v_total, v_active
  FROM referrals
  WHERE referrer_id = p_profile_id;

  RETURN jsonb_build_object(
    'total',  COALESCE(v_total, 0),
    'active', COALESCE(v_active, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated;
