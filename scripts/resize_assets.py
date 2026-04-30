#!/usr/bin/env python3
"""
Batch-resize AI-generated large images to pixel-art sprite dimensions.
Converts JPEG -> PNG, resizes with NEAREST neighbor to preserve hard edges.
"""

from PIL import Image
import os
import sys

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'images')

# Target dimensions for each asset type
TARGETS = {
    # Player sprites
    'characters/player/player_sprite.png': (16, 24),
    'characters/player/player_walk_spritesheet.png': (64, 24),  # 4 frames

    # NPC sprites (each unique NPC)
    'characters/npcs/npc_master_sprite.png': (16, 24),
    'characters/npcs/npc_senior_brother_sprite.png': (16, 24),
    'characters/npcs/npc_junior_sister_sprite.png': (16, 24),
    'characters/npcs/npc_spirit_pet_sprite.png': (16, 24),
    'characters/npcs/npc_xiaohan_sprite.png': (16, 24),
    'characters/npcs/npc_hongxiao_sprite.png': (16, 24),
    'characters/npcs/npc_baizhi_sprite.png': (16, 24),
    'characters/npcs/npc_moyan_sprite.png': (16, 24),  # may not exist yet
    'characters/npcs/npc_xuetuan_sprite.png': (16, 24),  # may not exist yet
    'characters/npcs/npc_disciple_sprite.png': (16, 24),
    'characters/npcs/npc_town_merchant_sprite.png': (16, 24),

    # Backgrounds (some are 1280x720, need 320x180)
    'backgrounds/bg_back_mountain.png': (320, 180),
    'backgrounds/bg_disciples_housing.png': (320, 180),
    'backgrounds/bg_gate.png': (320, 180),
    'backgrounds/bg_library.png': (320, 180),
    'backgrounds/bg_main_hall.png': (320, 180),
    'backgrounds/bg_meditation_room.png': (320, 180),
    'backgrounds/bg_yunlai_town.png': (320, 180),
    'backgrounds/bg_battle_forest.png': (320, 180),
}

# Files that are single-frame but need to become 4-frame walk spritesheets
WALK_SPRITESHEETS = {
    'characters/player/player_walk_spritesheet.png',
}


def remove_white_bg(img: Image.Image, threshold: int = 240) -> Image.Image:
    """Convert near-white pixels to transparent."""
    img = img.convert('RGBA')
    data = img.getdata()
    new_data = []
    for item in data:
        r, g, b, a = item
        if r > threshold and g > threshold and b > threshold:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    img.putdata(new_data)
    return img


def process_file(relative_path: str, target_size: tuple[int, int]) -> None:
    src_path = os.path.join(BASE_DIR, relative_path)
    if not os.path.exists(src_path):
        print(f"  SKIP (not found): {relative_path}")
        return

    # Check current size
    with Image.open(src_path) as img:
        w, h = img.size
        # Skip if already correct size (and PNG)
        if w == target_size[0] and h == target_size[1] and src_path.endswith('.png'):
            print(f"  SKIP (already correct): {relative_path}")
            return

        print(f"  PROCESS: {relative_path} ({w}x{h} -> {target_size[0]}x{target_size[1]})")

        # Convert to RGBA for consistent processing
        img = img.convert('RGBA')

        # For walk spritesheets: create 4-frame horizontal strip from single image
        if relative_path in WALK_SPRITESHEETS:
            # Resize single frame to 16x24 first
            frame = img.resize((16, 24), Image.NEAREST)
            # Remove near-white background
            frame = remove_white_bg(frame, threshold=200)
            # Create 4-frame horizontal strip (64x24)
            sheet = Image.new('RGBA', (64, 24), (0, 0, 0, 0))
            for i in range(4):
                sheet.paste(frame, (i * 16, 0))
            sheet.save(src_path, 'PNG')
            print(f"    -> Created 4-frame spritesheet {target_size}")
        else:
            # Normal resize
            resized = img.resize(target_size, Image.NEAREST)
            # For small sprites, try to remove white background
            if target_size[0] <= 64 and target_size[1] <= 64:
                resized = remove_white_bg(resized, threshold=200)
            resized.save(src_path, 'PNG')
            print(f"    -> Resized to {target_size}")


def main():
    print("Resizing game assets to target dimensions...")
    print(f"Base dir: {BASE_DIR}")
    print()

    processed = 0
    skipped = 0

    for rel_path, size in TARGETS.items():
        src_path = os.path.join(BASE_DIR, rel_path)
        if not os.path.exists(src_path):
            skipped += 1
            continue
        process_file(rel_path, size)
        processed += 1

    print()
    print(f"Done. Processed: {processed}, Skipped (missing): {skipped}")


if __name__ == '__main__':
    main()
