#!/usr/bin/env python3
"""
AI Asset Processor — 让文生图可直接用于游戏

处理三种规格：
  1. Sprite (16x24)     — Overworld 行走
  2. Walk (64x24)       — 4帧行走 spritesheet
  3. Portrait (64x64)   — 对话框立绘

用法：
    python3 scripts/process_ai_assets.py
"""

from PIL import Image
import os
import glob

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'images')

# 输出规格
SPRITE_W, SPRITE_H = 16, 24
WALK_FRAME_W, WALK_FRAME_H = 16, 24
PORTRAIT_W, PORTRAIT_H = 64, 64
BG_W, BG_H = 320, 180

BG_THRESHOLD = 230
RESAMPLE = Image.LANCZOS


def remove_near_white_bg(img: Image.Image, threshold: int = 230) -> Image.Image:
    img = img.convert('RGBA')
    data = bytearray(img.tobytes())
    for i in range(0, len(data), 4):
        r, g, b = data[i], data[i+1], data[i+2]
        if r > threshold and g > threshold and b > threshold:
            data[i+3] = 0
    return Image.frombytes('RGBA', img.size, bytes(data))


def get_content_bbox(img: Image.Image):
    alpha = img.split()[3]
    return alpha.getbbox()


def crop_and_resize(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    bbox = get_content_bbox(img)
    if bbox:
        img = img.crop(bbox)

    iw, ih = img.size
    target_ratio = target_w / target_h
    current_ratio = iw / ih

    if current_ratio > target_ratio:
        new_w = target_w
        new_h = max(1, int(target_w / current_ratio))
    else:
        new_h = target_h
        new_w = max(1, int(target_h * current_ratio))

    resized = img.resize((new_w, new_h), RESAMPLE)
    canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
    x = (target_w - resized.width) // 2
    y = (target_h - resized.height) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def generate_walk_spritesheet(img: Image.Image, frame_w: int, frame_h: int) -> Image.Image:
    sheet = Image.new('RGBA', (frame_w * 4, frame_h), (0, 0, 0, 0))
    frame0 = crop_and_resize(img, frame_w, frame_h)
    sheet.paste(frame0, (0, 0), frame0)

    frame1_src = img.resize((img.width, int(img.height * 0.92)), RESAMPLE)
    frame1 = crop_and_resize(frame1_src, frame_w, frame_h)
    sheet.paste(frame1, (frame_w, 0), frame1)

    sheet.paste(frame0, (frame_w * 2, 0), frame0)

    frame3_src = img.resize((img.width, int(img.height * 1.08)), RESAMPLE)
    frame3 = crop_and_resize(frame3_src, frame_w, frame_h)
    sheet.paste(frame3, (frame_w * 3, 0), frame3)

    return sheet


def process_sprite(src_path: str, dst_path: str) -> None:
    if os.path.exists(dst_path):
        with Image.open(dst_path) as existing:
            if existing.size == (SPRITE_W, SPRITE_H):
                return  # destination already correct
    with Image.open(src_path) as img:
        print(f"  Sprite: {os.path.basename(src_path)} {img.size} -> {SPRITE_W}x{SPRITE_H}")
        img = remove_near_white_bg(img.convert('RGBA'), BG_THRESHOLD)
        out = crop_and_resize(img, SPRITE_W, SPRITE_H)
        out.save(dst_path, 'PNG')


def process_walk(src_path: str, dst_path: str) -> None:
    if os.path.exists(dst_path):
        with Image.open(dst_path) as existing:
            if existing.size == (WALK_FRAME_W * 4, WALK_FRAME_H):
                return  # destination already correct
    with Image.open(src_path) as img:
        print(f"  Walk: {os.path.basename(src_path)} {img.size} -> {WALK_FRAME_W*4}x{WALK_FRAME_H}")
        img = remove_near_white_bg(img.convert('RGBA'), BG_THRESHOLD)
        out = generate_walk_spritesheet(img, WALK_FRAME_W, WALK_FRAME_H)
        out.save(dst_path, 'PNG')


def process_portrait(src_path: str, dst_path: str) -> None:
    with Image.open(src_path) as img:
        if img.size == (PORTRAIT_W, PORTRAIT_H):
            return  # already correct
        print(f"  Portrait: {os.path.basename(src_path)} {img.size} -> {PORTRAIT_W}x{PORTRAIT_H}")
        img = remove_near_white_bg(img.convert('RGBA'), BG_THRESHOLD)
        out = crop_and_resize(img, PORTRAIT_W, PORTRAIT_H)
        out.save(dst_path, 'PNG')


def process_background(src_path: str, dst_path: str) -> None:
    with Image.open(src_path) as img:
        if img.size == (BG_W, BG_H):
            return
        print(f"  BG: {os.path.basename(src_path)} {img.size} -> {BG_W}x{BG_H}")
        resized = img.resize((BG_W, BG_H), Image.NEAREST)
        resized.save(dst_path, 'PNG')


def main():
    print("=" * 60)
    print("AI Asset Processor")
    print("=" * 60)
    print()

    chars_dir = os.path.join(BASE_DIR, 'characters')

    # --- Player ---
    player_sprite = os.path.join(chars_dir, 'player', 'player_sprite.png')
    player_walk = os.path.join(chars_dir, 'player', 'player_walk_spritesheet.png')
    player_portrait = os.path.join(chars_dir, 'player', 'player_portrait.png')

    if os.path.exists(player_sprite):
        process_walk(player_sprite, player_walk)
        process_sprite(player_sprite, player_sprite)
    if os.path.exists(player_portrait):
        process_portrait(player_portrait, player_portrait)

    # --- NPCs ---
    npc_dir = os.path.join(chars_dir, 'npcs')
    for npc_sprite in sorted(glob.glob(os.path.join(npc_dir, 'npc_*_sprite.png'))):
        basename = os.path.basename(npc_sprite)
        walk_path = npc_sprite.replace('_sprite.png', '_walk.png')
        process_walk(npc_sprite, walk_path)
        process_sprite(npc_sprite, npc_sprite)

    for npc_portrait in sorted(glob.glob(os.path.join(npc_dir, 'npc_*_portrait.png'))):
        process_portrait(npc_portrait, npc_portrait)

    # --- Backgrounds ---
    bg_dir = os.path.join(BASE_DIR, 'backgrounds')
    for bg in sorted(glob.glob(os.path.join(bg_dir, 'bg_*.png'))):
        process_background(bg, bg)

    print()
    print("Done.")


if __name__ == '__main__':
    main()
