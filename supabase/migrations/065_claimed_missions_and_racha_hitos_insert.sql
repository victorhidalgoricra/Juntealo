-- claimed_missions: persists mission reward claims to prevent ghost benefits.
-- week_key (ISO Monday date 'YYYY-MM-DD') scopes each claim to one calendar week.
-- UNIQUE (profile_id, mission_id, week_key) prevents double-claiming the same mission.

CREATE TABLE IF NOT EXISTS claimed_missions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id   TEXT        NOT NULL,
  week_key     TEXT        NOT NULL, -- ISO date of Monday: 'YYYY-MM-DD'
  bonus_points INTEGER     NOT NULL DEFAULT 0 CHECK (bonus_points > 0 AND bonus_points <= 20),
  claimed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, mission_id, week_key)
);

ALTER TABLE claimed_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own claimed missions"
  ON claimed_missions FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can claim their own missions"
  ON claimed_missions FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- racha_hitos previously only had SELECT. Adding INSERT so the client can
-- record earned milestones (4/8/12 weeks). The UNIQUE constraint on the table
-- already prevents duplicate milestone entries per (profile, junta, weeks).

CREATE POLICY "Users can insert their own racha hitos"
  ON racha_hitos FOR INSERT
  WITH CHECK (profile_id = auth.uid());
