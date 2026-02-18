'use client';

import { useEffect } from 'react';
import { initMixpanel, MixpanelEvent, trackEvent } from '@/utils/mixpanel';
import { usePathname } from 'next/navigation';

export function MixpanelInitializer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Initialize once
  useEffect(() => {
    initMixpanel();
  }, []);

  useEffect(() => {
    trackEvent(MixpanelEvent.PageView, { url: pathname });
  }, [pathname]);

  return <>{children}</>;
}

export default MixpanelInitializer;


