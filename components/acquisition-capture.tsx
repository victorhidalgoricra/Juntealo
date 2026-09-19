'use client';

import { useEffect } from 'react';
import { resolveFirstTouchAttribution } from '@/lib/acquisition-attribution';

export function AcquisitionCapture() {
  useEffect(() => {
    // Invite pages bind only after the token is validated server-side.
    const search = new URLSearchParams(window.location.search);
    if (search.has('invite')) return;
    resolveFirstTouchAttribution();
  }, []);
  return null;
}

