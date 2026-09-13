'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { openJuntaInvite, saveInviteTokenForJunta } from '@/services/juntas.repository';
import { saveJuntaInviteIntent } from '@/lib/junta-invite-intent';

export default function InviteLandingPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const openedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (openedRef.current) return;
    openedRef.current = true;

    const sessionKey = `jd-invite-open:${params.token}`;
    const existingOpenId = window.sessionStorage.getItem(sessionKey);
    const openId = existingOpenId ?? crypto.randomUUID();
    if (!existingOpenId) window.sessionStorage.setItem(sessionKey, openId);

    openJuntaInvite({ inviteToken: params.token, openId }).then((result) => {
      if (!result.ok || !result.data?.id) {
        setError(result.ok ? 'La invitación no es válida o ya no está disponible.' : result.message);
        return;
      }

      const juntaId = result.data.id;
      saveInviteTokenForJunta({ juntaId, inviteToken: params.token });
      saveJuntaInviteIntent({ juntaId, inviteToken: params.token });
      const destination = `/juntas/${juntaId}?invite=1`;
      router.replace(user ? destination : `/login?redirect=${encodeURIComponent(destination)}`);
    });
  }, [params.token, router, user]);

  return <Card>{error ?? 'Validando invitación…'}</Card>;
}
