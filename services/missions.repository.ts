import { supabase } from '@/lib/supabase';

export type ClaimedMission = {
  mission_id: string;
  week_key: string;
  bonus_points: number;
  claimed_at: string;
};

export async function fetchClaimedMissions(profileId: string): Promise<ClaimedMission[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .schema('public')
    .from('claimed_missions')
    .select('mission_id, week_key, bonus_points, claimed_at')
    .eq('profile_id', profileId)
    .order('claimed_at', { ascending: false })
    .limit(200);
  return (data ?? []) as ClaimedMission[];
}

export type ClaimMissionResult =
  | { ok: true }
  | { ok: false; alreadyClaimed: boolean; message: string };

export async function claimMission(params: {
  profileId: string;
  missionId: string;
  weekKey: string;
  bonusPoints: number;
}): Promise<ClaimMissionResult> {
  if (!supabase) return { ok: true };

  const { error } = await supabase
    .schema('public')
    .from('claimed_missions')
    .insert({
      profile_id: params.profileId,
      mission_id: params.missionId,
      week_key: params.weekKey,
      bonus_points: params.bonusPoints
    });

  if (error) {
    const alreadyClaimed = error.code === '23505';
    return {
      ok: false,
      alreadyClaimed,
      message: alreadyClaimed
        ? 'Ya reclamaste esta misión esta semana.'
        : error.message
    };
  }
  return { ok: true };
}

export async function recordRachaMilestone(params: {
  profileId: string;
  juntaId: string | null;
  hitoSemanas: 4 | 8 | 12;
}): Promise<void> {
  if (!supabase) return;
  await supabase
    .schema('public')
    .from('racha_hitos')
    .upsert(
      {
        profile_id: params.profileId,
        junta_id: params.juntaId,
        hito_semanas: params.hitoSemanas
      },
      { onConflict: 'profile_id,junta_id,hito_semanas', ignoreDuplicates: true }
    );
}
