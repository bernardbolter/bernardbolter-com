'use client'

import { useEffect } from 'react'
import 'klaro/dist/klaro.css'

const GA_SCRIPT_ID = 'ga-gtag'

function loadGoogleAnalyticsScript(measurementId: string): void {
  if (typeof document === 'undefined' || !measurementId) return
  if (document.getElementById(GA_SCRIPT_ID)) return

  window.dataLayer = window.dataLayer ?? []
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args)
  }

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
  })

  window.gtag('consent', 'update', { analytics_storage: 'granted' })

  const script = document.createElement('script')
  script.id = GA_SCRIPT_ID
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  script.onload = () => {
    window.gtag?.('js', new Date())
    window.gtag?.('config', measurementId, { send_page_view: false })
  }
  document.head.appendChild(script)
}

export default function KlaroComponent() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const path = window.location.pathname
    if (path.startsWith('/studio') || path.startsWith('/admin')) return

    const measurementId = process.env.NEXT_PUBLIC_GA_ID
    if (!measurementId) return

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
            privacyPolicy: { name: 'Datenschutz', url: '/datenschutz' },
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
              if (!consent) return
              loadGoogleAnalyticsScript(measurementId)
            },
          },
        ],
      }

      klaro.setup(config)

      const manager = klaro.getManager?.()
      if (manager?.getConsent?.('googleAnalytics')) {
        loadGoogleAnalyticsScript(measurementId)
      }
    })
  }, [])

  return null
}
