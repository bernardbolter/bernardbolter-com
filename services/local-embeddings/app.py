"""
Local CLIP + DINOv2 embedding sidecar for Netcup.

POST /v1/embed/clip   { "image_url": "https://..." | "data:image/..." }
POST /v1/embed/dinov2 { "image_url": "https://..." | "data:image/..." }
GET  /health

Lazy-loads one model at a time to limit RAM (unloads the other when switching).
"""

from __future__ import annotations

import base64
import io
import os
from typing import Literal

import httpx
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from PIL import Image

CLIP_MODEL_ID = os.environ.get("CLIP_MODEL_ID", "openai/clip-vit-large-patch14")
DINOV2_MODEL_ID = os.environ.get("DINOV2_MODEL_ID", "facebook/dinov2-large")
CLIP_DIMS = 768
DINOV2_DIMS = 1024
DEVICE = "cpu"

app = FastAPI(title="local-embeddings", version="1.0.0")

_loaded: Literal["clip", "dinov2", None] = None
_clip_model = None
_clip_processor = None
_dino_model = None
_dino_processor = None


class EmbedRequest(BaseModel):
    image_url: str = Field(..., description="HTTPS URL or data:image/...;base64,...")


class EmbedResponse(BaseModel):
    embedding: list[float]
    model: str
    dimensions: int


def _unload_all() -> None:
    global _loaded, _clip_model, _clip_processor, _dino_model, _dino_processor
    _clip_model = None
    _clip_processor = None
    _dino_model = None
    _dino_processor = None
    _loaded = None
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def _ensure_clip() -> None:
    global _loaded, _clip_model, _clip_processor
    if _loaded == "clip" and _clip_model is not None:
        return
    _unload_all()
    from transformers import CLIPModel, CLIPProcessor

    print(f"[local-embeddings] loading CLIP {CLIP_MODEL_ID}…", flush=True)
    _clip_processor = CLIPProcessor.from_pretrained(CLIP_MODEL_ID)
    _clip_model = CLIPModel.from_pretrained(CLIP_MODEL_ID)
    _clip_model.eval()
    _clip_model.to(DEVICE)
    _loaded = "clip"
    print("[local-embeddings] CLIP ready", flush=True)


def _ensure_dinov2() -> None:
    global _loaded, _dino_model, _dino_processor
    if _loaded == "dinov2" and _dino_model is not None:
        return
    _unload_all()
    from transformers import AutoImageProcessor, AutoModel

    print(f"[local-embeddings] loading DINOv2 {DINOV2_MODEL_ID}…", flush=True)
    _dino_processor = AutoImageProcessor.from_pretrained(DINOV2_MODEL_ID)
    _dino_model = AutoModel.from_pretrained(DINOV2_MODEL_ID)
    _dino_model.eval()
    _dino_model.to(DEVICE)
    _loaded = "dinov2"
    print("[local-embeddings] DINOv2 ready", flush=True)


def _load_image(image_url: str) -> Image.Image:
    if image_url.startswith("data:"):
        try:
            header, b64 = image_url.split(",", 1)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid data URI") from exc
        try:
            raw = base64.b64decode(b64)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid base64 in data URI") from exc
        return Image.open(io.BytesIO(raw)).convert("RGB")

    try:
        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            res = client.get(image_url)
            res.raise_for_status()
            return Image.open(io.BytesIO(res.content)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch image: {exc}") from exc


@torch.inference_mode()
def _embed_clip(image: Image.Image) -> list[float]:
    _ensure_clip()
    assert _clip_model is not None and _clip_processor is not None
    inputs = _clip_processor(images=image, return_tensors="pt")
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
    feats = _clip_model.get_image_features(**inputs)
    feats = feats / feats.norm(dim=-1, keepdim=True)
    vec = feats[0].detach().cpu().tolist()
    if len(vec) != CLIP_DIMS:
        raise HTTPException(
            status_code=500,
            detail=f"CLIP dim mismatch: expected {CLIP_DIMS}, got {len(vec)}",
        )
    return vec


@torch.inference_mode()
def _embed_dinov2(image: Image.Image) -> list[float]:
    _ensure_dinov2()
    assert _dino_model is not None and _dino_processor is not None
    inputs = _dino_processor(images=image, return_tensors="pt")
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
    outputs = _dino_model(**inputs)
    # CLS token
    feats = outputs.last_hidden_state[:, 0, :]
    feats = feats / feats.norm(dim=-1, keepdim=True)
    vec = feats[0].detach().cpu().tolist()
    if len(vec) != DINOV2_DIMS:
        raise HTTPException(
            status_code=500,
            detail=f"DINOv2 dim mismatch: expected {DINOV2_DIMS}, got {len(vec)}",
        )
    return vec


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "loaded": _loaded,
        "clip_model": CLIP_MODEL_ID,
        "dinov2_model": DINOV2_MODEL_ID,
    }


@app.post("/v1/embed/clip", response_model=EmbedResponse)
def embed_clip(body: EmbedRequest) -> EmbedResponse:
    image = _load_image(body.image_url)
    embedding = _embed_clip(image)
    return EmbedResponse(embedding=embedding, model=CLIP_MODEL_ID, dimensions=CLIP_DIMS)


@app.post("/v1/embed/dinov2", response_model=EmbedResponse)
def embed_dinov2(body: EmbedRequest) -> EmbedResponse:
    image = _load_image(body.image_url)
    embedding = _embed_dinov2(image)
    return EmbedResponse(embedding=embedding, model=DINOV2_MODEL_ID, dimensions=DINOV2_DIMS)
