#!/usr/bin/env node
/**
 * Homepage FCP / LCP / TTI approx via Playwright.
 * Usage: node scripts/measure-homepage-vitals.mjs [url]
 */
import { chromium } from 'playwright'

const url = process.argv[2] || 'http://127.0.0.1:3000/'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
})
const page = await context.newPage()
const cdp = await context.newCDPSession(page)
await cdp.send('Network.enable')

let redirectCount = 0
let criticalCh = false
let acceptCh = false
cdp.on('Network.requestWillBeSent', (e) => {
  if (e.type === 'Document' && e.redirectResponse) redirectCount += 1
})
cdp.on('Network.responseReceived', (e) => {
  if (e.type !== 'Document') return
  const h = e.response.headers || {}
  for (const [k, v] of Object.entries(h)) {
    if (/^critical-ch$/i.test(k)) criticalCh = true
    if (/^accept-ch$/i.test(k)) acceptCh = String(v)
  }
})

await page.addInitScript(() => {
  window.__lt = []
  window.__lcp = null
  window.__fcp = null
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.entryType === 'largest-contentful-paint') {
          window.__lcp = { t: e.startTime, url: e.url, size: e.size }
        }
        if (e.entryType === 'paint' && e.name === 'first-contentful-paint') {
          window.__fcp = e.startTime
        }
        if (e.entryType === 'longtask') {
          window.__lt.push({ t: e.startTime, d: e.duration })
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.name === 'first-contentful-paint') window.__fcp = e.startTime
      }
    }).observe({ type: 'paint', buffered: true })
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__lt.push({ t: e.startTime, d: e.duration })
    }).observe({ type: 'longtask', buffered: true })
  } catch {}
})

await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 })
await page.waitForTimeout(1200)

const out = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0]
  const lastLt = (window.__lt || []).reduce((m, x) => Math.max(m, x.t + x.d), 0)
  const longTaskTotal = (window.__lt || []).reduce((s, x) => s + x.d, 0)
  const html = document.documentElement.outerHTML.length
  const flight = Array.from(document.querySelectorAll('script')).reduce((s, el) => {
    const t = el.textContent || ''
    if (t.includes('self.__next_f.push')) return s + t.length
    return s
  }, 0)
  const preloads = Array.from(document.querySelectorAll('link[rel=preload][as=image]')).map(
    (l) => l.href,
  )
  const firstImg = document.querySelector('img')
  return {
    ttfb: nav.responseStart,
    redirectCount: nav.redirectCount,
    fcp: window.__fcp,
    lcp: window.__lcp,
    ttiApprox: Math.max(lastLt, nav.domContentLoadedEventEnd),
    longTaskTotal,
    longTasks: window.__lt,
    htmlChars: html,
    flightChars: flight,
    imagePreloads: preloads.length,
    preloadUrls: preloads.slice(0, 3),
    firstImg: firstImg
      ? {
          src: firstImg.currentSrc || firstImg.src,
          srcset: firstImg.getAttribute('srcset'),
          sizes: firstImg.getAttribute('sizes'),
          natural: { w: firstImg.naturalWidth, h: firstImg.naturalHeight },
          display: {
            w: Math.round(firstImg.getBoundingClientRect().width),
            h: Math.round(firstImg.getBoundingClientRect().height),
          },
          loading: firstImg.loading,
          fetchPriority: firstImg.getAttribute('fetchpriority'),
        }
      : null,
  }
})

console.log(
  JSON.stringify(
    {
      url,
      redirectCountNetwork: redirectCount,
      criticalCh,
      acceptCh,
      ...out,
    },
    null,
    2,
  ),
)

await browser.close()
