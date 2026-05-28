export {}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    klaro?: unknown
    klaroConfig?: unknown
  }
}

declare module 'klaro'
