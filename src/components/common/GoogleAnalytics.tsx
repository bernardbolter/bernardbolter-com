// app/components/GoogleAnalytics.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname.startsWith('/studio') || pathname.startsWith('/admin')) return;
    if (!process.env.NEXT_PUBLIC_GA_ID) return;

    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '');

    // Only send if consent was given
    if (window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
        page_path: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}