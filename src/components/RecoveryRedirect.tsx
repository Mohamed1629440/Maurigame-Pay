'use client';

import { useEffect } from 'react';

export function RecoveryRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery') && !window.location.pathname.includes('update-password')) {
      window.location.replace('/auth/update-password' + hash);
    }
  }, []);

  return null;
}
