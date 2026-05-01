// app/components/Klaro.tsx
'use client';

import { useEffect } from 'react';
import 'klaro/dist/klaro.css';

export default function KlaroComponent() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    void import('klaro').then((klaro) => {
      const config = {
        elementID: 'klaro',
        storageMethod: 'cookie',
        storageName: 'klaro',
        cookieExpiresAfterDays: 120,
        mustConsent: true,
        acceptAll: true,
        hideLearnMore: false,

        translations: {
          en: {
            consentModal: {
              title: 'Privacy Preferences',
              description: 'We use cookies to improve your experience and analyze site performance.',
              acceptAll: 'Accept All',
              acceptSelection: 'Save Preferences',
              rejectAll: 'Reject All',
            },
            consentNotice: {
              title: 'We value your privacy',
              description: 'This site uses essential cookies and optional analytics/video services.',
              learnMore: 'Learn more',
            },
            purposes: {
              analytics: 'Analytics',
              videos: 'Videos',
            },
            privacyPolicy: { name: 'Privacy Policy', url: '/privacy' },
          },
        },

        services: [
          {
            name: 'youtube',
            title: 'YouTube Videos',
            purposes: ['videos'],
            contextualConsentOnly: false,
            required: false,
            default: true,
          },
          {
            name: 'googleAnalytics',
            title: 'Google Analytics',
            purposes: ['analytics'],
            cookies: [
              [/^_ga(_.*)?$/, '/', '.bernardbolter.com'],
              ['_gid', '/', '.bernardbolter.com'],
            ],
            callback: (consent: boolean) => {
              if (!consent) return;

              window.dataLayer = window.dataLayer || [];
              const gtag: any = (...args: any[]) => window.dataLayer.push(args);
              window.gtag = gtag;

              gtag('consent', 'default', {
                ad_storage: 'denied',
                analytics_storage: 'denied',
                functionality_storage: 'denied',
                personalization_storage: 'denied',
                security_storage: 'granted',
              });

              if (consent) {
                gtag('consent', 'update', { analytics_storage: 'granted' });
              }

              gtag('js', new Date());
              gtag('config', process.env.NEXT_PUBLIC_GA_ID!, { send_page_view: true });
            },
          },
        ],
      };

      // Setup Klaro and ensure klaroConfig is exposed
      const manager = klaro.setup(config);
      
      // Explicitly expose to window for components to access
      (window as any).klaroConfig = config;
      (window as any).klaro = klaro;
      
      console.log('[Klaro] Setup complete, manager:', manager);
      console.log('[Klaro] window.klaroConfig:', (window as any).klaroConfig);
    });
  }, []);

  return null;
}