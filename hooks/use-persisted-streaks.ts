'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RachaResult } from '@/lib/racha';

type StreakSnapshot = { streaks: RachaResult[]; rewardPoints: number };

/** Read-through refresh also catches deadlines passing while the page is open. */
export function usePersistedStreaks(userId: string | undefined, revision: string) {
  const [snapshot, setSnapshot] = useState<(StreakSnapshot & { userId: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setSnapshot(null);
    setError(null);
    if (!userId || !supabase) return;
    let cancelled = false;
    let running = false;
    const refresh = async () => {
      if (running) return;
      running = true;
      try {
        const { data, error: rpcError } = await supabase!.rpc('get_my_streaks');
        if (cancelled) return;
        if (rpcError || !data || !Array.isArray(data.streaks)) {
          setError('No pudimos confirmar tu racha. Vuelve a intentarlo en unos momentos.');
          setSnapshot(null);
        } else {
          setSnapshot({ ...data as StreakSnapshot, userId });
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('No pudimos confirmar tu racha. Vuelve a intentarlo en unos momentos.');
          setSnapshot(null);
        }
      } finally { running = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [userId, revision]);
  return { snapshot: snapshot?.userId === userId ? snapshot : null, error, connected: Boolean(supabase) };
}
