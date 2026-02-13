from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "ImageReference" / "Furina"
OUTPUT_DIR = ROOT / "assets" / "cutouts" / "furina"

# User request: process only these two files.
TARGET_FILES = [
    "elecpure_Furina_from_Genshin_Impact_dynamic_but_casual_full_bod_cc9b7414-353b-47d3-b2c5-74220bcb98e1.png",
    "elecpure_Furina_from_Genshin_Impact_upper_body_anime_illustrati_a6f0cab1-0149-49df-abbf-4de4074be603.png",
]


def border_mask(height: int, width: int, margin: int) -> np.ndarray:
    mask = np.zeros((height, width), dtype=bool)
    mask[:margin, :] = True
    mask[-margin:, :] = True
    mask[:, :margin] = True
    mask[:, -margin:] = True
    return mask


def flood_fill_from_border(candidates: np.ndarray) -> np.ndarray:
    h, w = candidates.shape
    visited = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        if candidates[0, x]:
            visited[0, x] = True
            queue.append((0, x))
        if candidates[h - 1, x] and not visited[h - 1, x]:
            visited[h - 1, x] = True
            queue.append((h - 1, x))

    for y in range(h):
        if candidates[y, 0] and not visited[y, 0]:
            visited[y, 0] = True
            queue.append((y, 0))
        if candidates[y, w - 1] and not visited[y, w - 1]:
            visited[y, w - 1] = True
            queue.append((y, w - 1))

    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and candidates[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

    return visited


def gradient_strength(gray: np.ndarray) -> np.ndarray:
    gx = np.abs(np.roll(gray, -1, axis=1) - np.roll(gray, 1, axis=1))
    gy = np.abs(np.roll(gray, -1, axis=0) - np.roll(gray, 1, axis=0))
    return np.sqrt(gx * gx + gy * gy)


def normalize_01(values: np.ndarray, low: float, high: float) -> np.ndarray:
    span = max(1e-6, high - low)
    return np.clip((values - low) / span, 0.0, 1.0)


def create_cutout(src_path: Path, dst_path: Path) -> None:
    image = Image.open(src_path).convert("RGB")
    rgb = np.asarray(image, dtype=np.float32)
    h, w, _ = rgb.shape

    margin = max(16, min(h, w) // 22)
    border = border_mask(h, w, margin)
    border_pixels = rgb[border]

    bg_median = np.median(border_pixels, axis=0)
    bg_std = np.std(border_pixels, axis=0) + 6.5

    # Z-distance in RGB with per-channel normalization.
    z_dist = np.sqrt(np.sum(((rgb - bg_median) / bg_std) ** 2, axis=2))

    rgb_max = np.maximum(np.max(rgb, axis=2), 1.0)
    rgb_min = np.min(rgb, axis=2)
    saturation = (rgb_max - rgb_min) / rgb_max

    gray = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    bg_gray = float(np.median(gray[border]))
    grad = gradient_strength(gray)

    # Conservative background candidates:
    # - close to border color
    # - low saturation and similar luminance
    # - not on strong edge
    bg_candidates = (
        (z_dist < 1.86)
        & (saturation < 0.14)
        & (np.abs(gray - bg_gray) < 34.0)
        & (grad < 14.0)
    )

    # Keep only connected background regions from image border.
    bg_connected = flood_fill_from_border(bg_candidates)

    # Clean tiny edge leftovers (single-pixel border residues).
    edge_bg = border & (z_dist < 2.7) & (saturation < 0.24)
    bg_connected = bg_connected | edge_bg

    # Remove thin top/bottom border bands that are still near background tone.
    yy = np.arange(h)[:, None]
    strip = max(8, h // 120)
    top_bottom_bg = ((yy < strip) | (yy >= h - strip)) & (z_dist < 2.5) & (saturation < 0.2) & (
        grad < 18.0
    )
    bg_connected = bg_connected | top_bottom_bg

    # Extra pass for full-body image: remove bottom skyline strip connected to border.
    if "dynamic_but_casual_full_bod" in src_path.name:
        lower_region = yy > int(h * 0.52)
        relaxed = (z_dist < 2.45) & (saturation < 0.22) & (grad < 20.0) & lower_region
        bg_connected = bg_connected | flood_fill_from_border(relaxed)

    # Hard alpha first to avoid destroying inner character colors.
    alpha_hard = np.where(bg_connected, 0, 255).astype(np.uint8)
    alpha_soft = np.asarray(
        Image.fromarray(alpha_hard, mode="L").filter(ImageFilter.GaussianBlur(radius=0.9)),
        dtype=np.uint8,
    )

    # Clamp to keep foreground solid and background transparent while preserving soft edges.
    alpha = np.where(alpha_hard == 255, np.maximum(alpha_soft, 246), np.minimum(alpha_soft, 12)).astype(
        np.uint8
    )
    out_rgba = np.dstack([rgb.astype(np.uint8), alpha])
    result = Image.fromarray(out_rgba, mode="RGBA")
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    result.save(dst_path)

    transparent_ratio = float(np.mean(alpha < 12))
    print(f"[OK] {dst_path.name} transparent={transparent_ratio:.3f}")


def output_name(filename: str) -> str:
    return filename.replace(".png", "-cutout.png")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    created = 0
    for filename in TARGET_FILES:
        src = SOURCE_DIR / filename
        if not src.exists():
            print(f"[SKIP] Missing source: {src}")
            continue

        dst = OUTPUT_DIR / output_name(filename)
        create_cutout(src, dst)
        created += 1

    print(f"\nDone. Rebuilt {created} high-quality cutouts in: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
