const STORAGE_KEY = 'jd-junta-invite-intent';

export type JuntaInviteIntent = {
  juntaId: string;
  inviteToken: string;
  signupPending?: boolean;
};

export function readJuntaInviteIntent(): JuntaInviteIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as JuntaInviteIntent | null;
    if (!parsed?.juntaId || !parsed.inviteToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveJuntaInviteIntent(intent: JuntaInviteIntent) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(intent));
}

export function markJuntaInviteSignupPending() {
  const intent = readJuntaInviteIntent();
  if (intent) saveJuntaInviteIntent({ ...intent, signupPending: true });
}

export function clearJuntaInviteSignupPending() {
  const intent = readJuntaInviteIntent();
  if (intent) saveJuntaInviteIntent({ ...intent, signupPending: false });
}

