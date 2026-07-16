# Local CLIP + DINOv2 embedding sidecar (Netcup)

HTTP service used by `npm run backfill:clip` / `backfill:dinov2` when
`CLIP_EMBEDDING_URL` / `DINOV2_EMBEDDING_URL` point here.

## Install (once, on Netcup)

```bash
python3 -m venv ~/apps/embeddings-venv
~/apps/embeddings-venv/bin/pip install -U pip
~/apps/embeddings-venv/bin/pip install -r ~/apps/bernardbolter/services/local-embeddings/requirements.txt
# First run downloads HuggingFace weights (~2–3GB total, cached under ~/.cache/huggingface)
```

## Run

```bash
cd ~/apps/bernardbolter/services/local-embeddings
~/apps/embeddings-venv/bin/uvicorn app:app --host 127.0.0.1 --port 2030
```

PM2:

```bash
pm2 start ~/apps/embeddings-venv/bin/uvicorn \
  --name embeddings \
  --interpreter none \
  -- \
  --app-dir /home/bernard/apps/bernardbolter/services/local-embeddings \
  app:app --host 127.0.0.1 --port 2030
pm2 save
```

## Env on the site (`.env`)

```bash
CLIP_EMBEDDING_URL=http://127.0.0.1:2030/v1/embed/clip
DINOV2_EMBEDDING_URL=http://127.0.0.1:2030/v1/embed/dinov2
```

## Smoke

```bash
curl -s http://127.0.0.1:2030/health
curl -s -X POST http://127.0.0.1:2030/v1/embed/clip \
  -H 'Content-Type: application/json' \
  -d '{"image_url":"https://bernardbolter.com/…"}'
```

Models load lazily and **one at a time** (switching CLIP↔DINOv2 unloads the other) to limit RAM alongside Moondream.
