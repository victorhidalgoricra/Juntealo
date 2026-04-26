const EXPLORE_JOIN_INTENT_KEY = 'jd-explore-join-intent';

type ExploreJoinIntent = {
  juntaId: string;
  createdAt: string;
};

export function saveExploreJoinIntent(juntaId: string) {
  if (typeof window === 'undefined') return;
  const payload: ExploreJoinIntent = { juntaId, createdAt: new Date().toISOString() };
  window.sessionStorage.setItem(EXPLORE_JOIN_INTENT_KEY, JSON.stringify(payload));
}

export function readExploreJoinIntent() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(EXPLORE_JOIN_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExploreJoinIntent;
    if (!parsed?.juntaId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearExploreJoinIntent() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(EXPLORE_JOIN_INTENT_KEY);
}
