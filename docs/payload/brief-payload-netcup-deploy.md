# Brief — Payload Deployment on Netcup
## art-official.org · Prerequisite for Process Photo & Video Capture
*July 2026*

---

## What this is

A build specification for getting Payload v3 running live on the Netcup VPS against the already-migrated Postgres database, with `studio.art-official.org` serving the admin. This is the missing middle step between "Postgres migrated" and the rest of `brief-architecture-split.md` — DNS, public API, and the Vercel refactor all depend on this working first.

**This brief is a hard prerequisite for `brief-process-photo-capture.md` and `brief-video-capture.md`.** Neither can go live until Payload is writing to a local-disk-capable server.

Read alongside: `brief-architecture-split.md` (full target architecture and migration sequence — this brief expands §2–3 of that sequence into concrete steps), `hetzner-migration-brief.md` (server is Netcup VPS Lite, not Hetzner — same architecture, same stack versions).

---

## Current state (as of last session)

- Netcup VPS Lite 3 G12s provisioned — 8 vCore, 16GB RAM, 320GB SSD, Debian 13, IP `46.38.251.18`
- SSH key set up, user `bernard` created with sudo
- SSH hardening written to `sshd_config` (`PermitRootLogin no`, `PasswordAuthentication no`) — **`sudo systemctl restart ssh` not yet confirmed**
- UFW firewall — **not yet configured**
- Postgres migration status from Neon — **needs verification this session** (row counts, pgvector extension, data integrity)
- Payload — **not yet deployed anywhere on Netcup**

Nothing below should proceed until the items above are confirmed. Losing SSH access mid-migration is the one failure mode worth being paranoid about.

---

## Step 0 — Confirm server access and hardening

1. From a **second terminal/session** (don't close the one you're in), test SSH as `bernard` with key auth:
   ```
   ssh bernard@46.38.251.18
   ```
2. If that connects and sudo works, only then run:
   ```
   sudo systemctl restart ssh
   ```
3. Immediately test a fresh connection in a third terminal before closing either existing session. If it fails, the two open sessions are the recovery path — do not close both until a fresh connection is confirmed working.
4. Confirm password auth is actually rejected and root login is actually rejected (quick negative test).

---

## Step 1 — UFW firewall

```
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

Port 5432 (Postgres) is **not** opened here — it stays closed to the public internet. The temporary Vercel-to-Netcup remote connection noted in memory ("port 5432 temporarily open... during transition") should only be opened scoped to Vercel's known egress IPs if truly needed, and closed again once Payload itself moves onto the box (which this brief is about to do — so that temporary opening may already be moot by the time this is done).

```
sudo ufw enable
sudo ufw status verbose
```

---

## Step 2 — Verify the Postgres migration

Before touching Payload, confirm the database that's actually there is trustworthy.

1. Check pgvector is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```
2. Spot-check row counts against Neon for the main tables (artworks, media, sessions — whatever the largest/most important collections are). A quick `SELECT count(*) FROM ...` on both sides is enough for a sanity check, not a full diff.
3. Confirm the three-database structure exists per `hetzner-migration-brief.md`:
   ```sql
   \l
   ```
   Expect (or create empty, ready for later): `bernardbolter`, `vendure`, `pronuance`.
4. If anything looks short or missing, stop here and re-run the dump/restore from Neon before proceeding — don't deploy Payload against a partial database.

---

## Step 3 — DNS (do this early — propagation takes time)

At Cloudflare, add A records pointing at `46.38.251.18`:

| Host | Proxy mode |
|---|---|
| `studio.art-official.org` | DNS-only (grey cloud) |
| `collector.art-official.org` | DNS-only (grey cloud) |
| `api.art-official.org` | DNS-only (grey cloud) |

**Grey-cloud is not optional** — Cloudflare's proxy caps upload bodies at 100MB, which breaks the video capture brief later. Set it correctly now so it's not a mystery bug in three weeks.

The `art-official.org` apex stays exactly as-is (Cloudflare Pages, static info page) — don't touch it.

Kick this off now since DNS propagation can lag; by the time Payload is actually running (Step 5–6) it should already have resolved.

---

## Step 4 — Wildcard TLS

Using Certbot's Cloudflare DNS-01 plugin (needed because these are DNS-only records — HTTP-01 challenges would require the proxy):

```
sudo apt install certbot python3-certbot-dns-cloudflare
```

Create a Cloudflare API token scoped to DNS edit on `art-official.org` only, then:

```
sudo certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
  -d "*.art-official.org" -d "art-official.org"
```

One wildcard cert covers `studio`, `collector`, `api`, and any future subdomain — no per-subdomain cert requests as things grow. Confirm auto-renew is registered (`certbot renew --dry-run`).

---

## Step 5 — Deploy Payload

1. Install Node.js 22 LTS, PM2, Nginx if not already present.
2. Clone the Payload repo onto the box (e.g. `/home/bernard/apps/art-official`).
3. Environment variables:
   - `DATABASE_URL` → `postgresql://localhost/bernardbolter` (or whatever the local connection string is — **localhost, not Neon**)
   - `PAYLOAD_PUBLIC_SERVER_URL` → `https://studio.art-official.org`
   - Cookie domain → `.art-official.org`
4. Install deps, build:
   ```
   npm install
   npm run build
   ```
5. Run under PM2:
   ```
   pm2 start npm --name payload-app -- start
   pm2 save
   pm2 startup
   ```

---

## Step 6 — Nginx reverse proxy

Server block for `studio.art-official.org` proxying to `localhost:3000`:

```nginx
server {
    listen 443 ssl;
    server_name studio.art-official.org;

    ssl_certificate /etc/letsencrypt/live/art-official.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/art-official.org/privkey.pem;

    client_max_body_size 512m;
    proxy_read_timeout 300s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`client_max_body_size 512m` and the extended `proxy_read_timeout` are set now even though video upload isn't built yet — per `brief-architecture-split.md`, this is video-ready from the start rather than something to remember to raise later.

Test and reload:
```
sudo nginx -t
sudo systemctl reload nginx
```

Leave `collector.art-official.org` and `api.art-official.org` server blocks for their own briefs (Pro/Nuance deploy, and the `/api/public/*` build in the architecture-split brief) — not needed to validate this step.

---

## Step 7 — Verify

1. Visit `https://studio.art-official.org/admin` — confirm login works, collections are present, a few records render correctly with images loading from R2.
2. Confirm this is **read/write** against the Netcup database, not accidentally still pointed at Neon (check an env var, or make a trivial edit and confirm it shows up in a `psql` query on the box).
3. **Do not yet point Vercel's Payload at anything, and do not yet take Vercel's Payload down.** Per the architecture-split brief: Payload should never run writable in two places against the same database. Right now Vercel's Payload is writable against Neon, and Netcup's Payload is writable against the migrated copy on Netcup — these are two different databases, so this is safe *only as a temporary state*, and only for as long as nothing is being written on the Vercel side.
4. As a practical rule for this transition: **stop making edits through the Vercel/Neon Payload admin now.** Treat Netcup as the live write target from this point forward. Neon becomes read-only history until it's decommissioned per the architecture-split brief's later steps.

---

## What NOT to do

- Don't skip Step 0 — confirming SSH survives the hardening is cheap insurance against losing the box entirely
- Don't open port 5432 to the public internet, even temporarily, without scoping it
- Don't proxy the Netcup subdomains through Cloudflare (orange cloud) — breaks large uploads later
- Don't deploy Payload against a Postgres copy you haven't sanity-checked
- Don't keep writing through both the Vercel/Neon Payload and the Netcup Payload once Netcup is confirmed working — pick one write target and stick to it
- Don't start on `/api/public/*`, the Vercel refactor, or process-photo/video-capture code until Step 7 is fully green

---

## What this unlocks

Once this brief is done, `brief-architecture-split.md` §3–5 (public API, Vercel refactor, cutover) and both `brief-process-photo-capture.md` and `brief-video-capture.md` become buildable against real infrastructure instead of a plan.

---

*Brief — Payload Deployment on Netcup · July 2026*
*art-official.org · For handoff to Cursor*
*Companion documents: brief-architecture-split.md · hetzner-migration-brief.md · brief-process-photo-capture.md · brief-video-capture.md*
