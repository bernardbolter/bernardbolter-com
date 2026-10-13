#!/usr/bin/env node
/**
 * Ensure a Cloudflare Cache Rule caches public artwork HTML:
 *   /{slug}, /{slug}/vision
 * Bypasses /admin, /studio, /preview (separate rule, higher priority).
 *
 * Requires CLOUDFLARE_ZONE_ID + CLOUDFLARE_API_TOKEN (Zone → Cache Rules Edit).
 * Idempotent: updates the named rules if they already exist.
 *
 * Usage: node scripts/ensure-cloudflare-artwork-html-cache-rule.mjs
 */
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID?.trim()
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN?.trim()
const BYPASS_NAME = 'bernardbolter-bypass-admin-studio-preview'
const CACHE_NAME = 'bernardbolter-artwork-html-cache'

if (!ZONE_ID || !API_TOKEN) {
  console.error('Missing CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN')
  process.exit(1)
}

const api = async (path, init = {}) => {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const body = await res.json()
  if (!res.ok || body.success === false) {
    const err = JSON.stringify(body.errors || body, null, 2)
    throw new Error(`${init.method || 'GET'} ${path} failed: ${err}`)
  }
  return body
}

const bypassRule = {
  description: BYPASS_NAME,
  expression:
    '(starts_with(http.request.uri.path, "/admin") or starts_with(http.request.uri.path, "/studio") or starts_with(http.request.uri.path, "/preview"))',
  action: 'set_cache_settings',
  action_parameters: {
    cache: false,
  },
}

// Match artwork HTML surfaces. Exclude api/, known site sections, and file-like paths.
const cacheRule = {
  description: CACHE_NAME,
  expression: `(
    not starts_with(http.request.uri.path, "/api/")
    and not starts_with(http.request.uri.path, "/admin")
    and not starts_with(http.request.uri.path, "/studio")
    and not starts_with(http.request.uri.path, "/preview")
    and not starts_with(http.request.uri.path, "/_next/")
    and (
      http.request.uri.path matches "^/[^/]+$"
      or http.request.uri.path matches "^/[^/]+/vision$"
    )
  )`.replace(/\s+/g, ' ').trim(),
  action: 'set_cache_settings',
  action_parameters: {
    cache: true,
    edge_ttl: {
      mode: 'override_origin',
      default: 3600,
    },
    browser_ttl: {
      mode: 'override_origin',
      default: 0,
    },
  },
}

const list = await api(`/zones/${ZONE_ID}/rulesets/phases/http_request_cache_settings/entrypoint`)
const rulesetId = list.result?.id
if (!rulesetId) throw new Error('No cache_settings entrypoint ruleset')

const existing = list.result?.rules || []
const nextRules = [...existing]

const upsert = (rule) => {
  const idx = nextRules.findIndex((r) => r.description === rule.description)
  if (idx >= 0) {
    nextRules[idx] = { ...nextRules[idx], ...rule, id: nextRules[idx].id }
    console.log(`update: ${rule.description}`)
  } else {
    nextRules.push(rule)
    console.log(`create: ${rule.description}`)
  }
}

// Bypass first so it wins when both match.
upsert(bypassRule)
upsert(cacheRule)

await api(`/zones/${ZONE_ID}/rulesets/${rulesetId}`, {
  method: 'PUT',
  body: JSON.stringify({
    rules: nextRules.map(({ id, ...rest }) => (id ? { id, ...rest } : rest)),
  }),
})

console.log('Cloudflare artwork HTML cache rules applied.')
