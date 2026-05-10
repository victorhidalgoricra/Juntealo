-- Racha (streak) tracking for payment consistency
--
-- racha_actual / record_racha on profiles: global cached values across all juntas
-- racha_semanas / racha_record on junta_members: per-junta cached values
-- The client derives racha from payment history; these columns are for server-side
-- caching and future trigger-based updates.
--
-- hitos table: milestone badges (4 / 8 / 12 weeks) — earned once, never lost.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS racha_actual INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS record_racha INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_racha TEXT NOT NULL DEFAULT 'activa'
    CONSTRAINT chk_profiles_estado_racha CHECK (estado_racha IN ('activa', 'en_riesgo', 'rota'));

ALTER TABLE junta_members
  ADD COLUMN IF NOT EXISTS racha_semanas INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS racha_record INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS racha_hitos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  junta_id     UUID        REFERENCES juntas(id) ON DELETE SET NULL,
  hito_semanas INTEGER     NOT NULL CHECK (hito_semanas IN (4, 8, 12)),
  earned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, junta_id, hito_semanas)
);

ALTER TABLE racha_hitos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hitos"
  ON racha_hitos FOR SELECT
  USING (profile_id = auth.uid());
