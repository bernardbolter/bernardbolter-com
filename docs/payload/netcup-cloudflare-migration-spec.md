# Archive Hosting Migration — Netcup + Cloudflare
*bernardbolter.com · Cursor Implementation Spec · July 2026*

Read alongside: `corpus-caching-spec.md`, `spec-1-image-resizing-r2.md`

This spec supersedes the previous plan of running Payload on Netcup while keeping Next.js on Vercel. That split was rejected — it would force every server-rendered request to make a network round-trip from Vercel to the Netcup box for data, which is slower and defeats the point of leaving Vercel's metered compute. Everything for the **archive** now runs colocated on one Netcup box, fronted by Cloudflare.

**This spec does NOT apply to the future Vendure commerce/series sites.** Those stay on Vercel, on their own project, hitting the archive's live endpoints directly for whatever product/artwork data they need. Do not fold commerce hosting decisions into this migration.

---

## Target architecture

**Box:** Netcup VPS Lite 3 G12s (8 vCore, 16 GB RAM, 320 GB SSD)

Running on it, colocated:
- Postgres (already running here)
- Payload CMS (admin + API)
- Next.js (standalone build, production server)
- A reverse proxy (Caddy recommended over nginx — automatic HTTPS, simpler config) routing by path
- pg-boss (already planned) for background jobs — inference jobs run in a scheduled overnight window, not during live traffic

**In front of the box:** Cloudflare, DNS proxied (orange-clouded), handling:
- TLS termination at the edge
- Edge caching of public archive pages and the corpus JSON endpoint
- Cache purge triggered by Payload's `afterChange` hook (replaces the old Vercel revalidate call)

**Unaffected by this migration:**
- Cloudflare R2 for artwork images — already direct-from-R2, no change
- The Arweave/GitHub Pages permanent-archive export pipeline — separate, later-stage concern
- Vercel hosting for Vendure series sites — stays as-is, separate project

---

## Do NOT

- Do NOT keep Next.js on Vercel while Payload runs on Netcup — colocate both on the same box.
- Do NOT point Vendure/series sites at this spec's caching layer — they hit the archive's live data directly and are out of scope here.
- Do NOT use `force-dynamic` or `no-store` on public archive routes — follow the existing `corpus-caching-spec.md` revalidate/tag approach, just pointed at Cloudflare instead of Vercel.
- Do NOT cache `/admin` or any Art/Official session routes — these must stay fully dynamic and bypassed at the Cloudflare layer.
- Do NOT run inference batch jobs (Whisper/Moondream/CLIP backfills) at the same time as active Payload admin editing sessions during testing — schedule them for an overnight window instead. (No hard technical blocker if they do overlap — just slower for both — but scheduling avoids it entirely.)
- Do NOT switch the domain's nameservers to Cloudflare until the server migration below is tested and working via IP or a temporary subdomain. Don't debug DNS propagation and a server migration at the same time.
- Do NOT move the domain registrar. Only the nameservers move to Cloudflare — registration can stay wherever it is now.

---

## Implementation steps

### 1. Confirm the box

Netcup VPS Lite 3 G12s, 8 vCore / 16 GB RAM / 320 GB SSD. Postgres already installed. Confirm Node 18+, pnpm/npm available.

### 2. Deploy Payload

Get Payload CMS running on the box as its own process (systemd service or pm2), pointed at the existing local Postgres instance. Confirm `/admin` login works via the box's IP or a temporary subdomain before moving on.

### 3. Build and deploy Next.js in standalone mode

```bash
# next.config.js should already have output: 'standalone'
next build
```

Run the standalone server as its own process (systemd/pm2), separate from Payload's process. Confirm it renders pages correctly hitting local Payload via the box's IP or temp subdomain.

### 4. Reverse proxy routing

Install Caddy. Route by path on the single domain:
- `/admin/*` and Payload API routes → Payload process
- Everything else → Next.js process

Caddy handles TLS automatically once DNS points at it — but leave this in HTTP-only / self-signed mode until Cloudflare is in front (Step 7), since Cloudflare will handle edge TLS and connect to origin separately.

### 5. Update the revalidation hook

Per `corpus-caching-spec.md`, the existing Payload `afterChange` hook currently calls a Vercel revalidate endpoint. Replace that call with a call to Cloudflare's Purge Cache API, targeting the specific URLs affected (artwork page, vision page, corpus endpoint, relevant series page). Note: URL-list purging, not tag-based purging — tag-based purge is a Cloudflare Enterprise feature. A handful of explicit URLs per edit is enough at this scale.

```ts
// afterChange hook — replace Vercel revalidate call with:
await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    files: [
      `https://bernardbolter.com/${doc.slug}`,
      `https://bernardbolter.com/${doc.slug}/vision`,
      `https://bernardbolter.com/api/corpus`,
    ],
  }),
})
```

`CLOUDFLARE_API_TOKEN` and `ZONE_ID` go in server env vars on the Netcup box, never committed.

### 6. Test end-to-end before touching DNS

With the domain still pointed elsewhere (or using a temp subdomain / IP access), confirm:
- Public pages render correctly through the reverse proxy
- Payload admin edits trigger the Cloudflare purge call successfully (check Cloudflare's API response, not just that the call fired)
- pg-boss jobs run correctly, ideally test one during off-hours

### 7. Move DNS to Cloudflare

Add the domain to Cloudflare, update nameservers at the registrar to Cloudflare's. Keep registration where it is — only nameservers move. Add a DNS A record for the domain pointed at the Netcup box's IP, **proxied (orange cloud) on**.

Set Cloudflare SSL/TLS mode to Full (Strict) — this requires a valid cert on the origin (Netcup box). Caddy can obtain a Let's Encrypt cert automatically once Cloudflare is routing traffic to it, or use Cloudflare's origin certificate instead.

Expect a propagation window (a few hours, occasionally up to 24–48h) — plan this cutover for a moment when brief flakiness is acceptable.

### 8. Cloudflare Cache Rules

Set a Cache Rule for public archive routes (artwork pages, vision pages, series pages, `/api/corpus`) to honor origin `Cache-Control` headers with a long edge TTL. Set a bypass rule for `/admin/*` and any Art/Official session routes so they're never cached.

---

## Verification checklist

- [ ] Payload admin accessible and functional on the Netcup box (pre-DNS-cutover, via IP/temp subdomain)
- [ ] Next.js standalone build renders all public routes correctly, hitting local Payload
- [ ] Caddy correctly routes `/admin` and API paths to Payload, everything else to Next.js
- [ ] Editing an artwork in Payload triggers a successful Cloudflare purge call (check API response code, not just that the fetch fired)
- [ ] pg-boss inference jobs run correctly in a test overnight window without interfering with daytime Payload use
- [ ] Domain nameservers updated to Cloudflare, DNS proxied (orange cloud) on for the main A record
- [ ] SSL/TLS mode set to Full (Strict), valid cert present on origin
- [ ] Cache Rule active for public archive routes; bypass rule active for `/admin` and Art/Official routes
- [ ] A live edit after full cutover shows the updated content on the public site within seconds, not the 1hr backstop window
- [ ] R2 image delivery unaffected — confirm images still load directly from R2, not routed through this new layer
- [ ] Vendure/series site plans on Vercel remain untouched and unaffected by this migration

---

*Read alongside: `corpus-caching-spec.md`, `spec-1-image-resizing-r2.md`*
*Supersedes: the split Payload-on-Netcup / Next.js-on-Vercel plan*
