"""Render the homepage's 1200x630 social sharing image from local assets."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SCALE = 2
WIDTH, HEIGHT = 1200 * SCALE, 630 * SCALE
OUT = ROOT / "social-card.jpg"


def scaled(value):
    return round(value * SCALE)


def font(size, bold=False):
    names = ["C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"]
    names += ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    for name in names:
        try:
            return ImageFont.truetype(name, scaled(size))
        except OSError:
            pass
    raise FileNotFoundError("A Segoe UI or DejaVu font is required to render the social card")


def rect(box):
    return tuple(scaled(n) for n in box)


y, x = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)
mix = np.clip((x / WIDTH * .58 + y / HEIGHT * .42), 0, 1)
top = np.array([23, 42, 58], dtype=np.float32)
bottom = np.array([12, 27, 40], dtype=np.float32)
pixels = top[None, None, :] * (1 - mix[:, :, None]) + bottom[None, None, :] * mix[:, :, None]
for cx, cy, radius, color, strength in [
    (240, 260, 340, (74, 147, 189), .29),
    (1010, 110, 320, (69, 132, 172), .25),
    (970, 650, 410, (49, 114, 157), .23),
]:
    distance = ((x / SCALE - cx) ** 2 + (y / SCALE - cy) ** 2) / (radius ** 2)
    glow = np.exp(-distance * 2.1)[:, :, None] * strength
    pixels = pixels * (1 - glow) + np.array(color, dtype=np.float32) * glow
card = Image.fromarray(np.uint8(np.clip(pixels, 0, 255)), "RGB").convert("RGBA")

# The offset translucent sheets echo the layered glass controls on the site.
layers = Image.new("RGBA", card.size)
draw = ImageDraw.Draw(layers)
draw.rounded_rectangle(rect((74, 76, 1140, 584)), radius=scaled(50), fill=(122, 180, 212, 14), outline=(211, 239, 252, 30), width=scaled(1))
draw.rounded_rectangle(rect((63, 65, 1150, 579)), radius=scaled(49), fill=(150, 200, 226, 18), outline=(224, 246, 255, 39), width=scaled(1))
card = Image.alpha_composite(card, layers)

shadow = Image.new("RGBA", card.size)
ImageDraw.Draw(shadow).rounded_rectangle(rect((52, 49, 1148, 573)), radius=scaled(44), fill=(1, 12, 24, 105))
card = Image.alpha_composite(card, shadow.filter(ImageFilter.GaussianBlur(scaled(24))))

glass = Image.new("RGBA", card.size)
draw = ImageDraw.Draw(glass)
draw.rounded_rectangle(rect((52, 49, 1148, 573)), radius=scaled(44), fill=(185, 222, 241, 27), outline=(222, 245, 255, 111), width=scaled(2))
draw.rounded_rectangle(rect((61, 58, 1139, 564)), radius=scaled(39), outline=(233, 248, 255, 31), width=scaled(1))
card = Image.alpha_composite(card, glass)

# Portrait is the same photo used by the homepage, inside its glass halo.
halo = Image.new("RGBA", card.size)
draw = ImageDraw.Draw(halo)
draw.ellipse(rect((107, 111, 513, 517)), fill=(198, 230, 245, 19), outline=(224, 246, 255, 100), width=scaled(2))
draw.ellipse(rect((119, 123, 501, 505)), outline=(224, 246, 255, 53), width=scaled(2))
card = Image.alpha_composite(card, halo)

photo = Image.open(ROOT / "profile.jpeg").convert("RGB").resize((scaled(358), scaled(358)), Image.Resampling.LANCZOS)
mask = Image.new("L", photo.size)
ImageDraw.Draw(mask).ellipse((0, 0, photo.width - 1, photo.height - 1), fill=255)
card.paste(photo, (scaled(131), scaled(135)), mask)
draw = ImageDraw.Draw(card)
draw.ellipse(rect((130, 134, 490, 494)), outline=(237, 250, 255, 212), width=scaled(5))

# Compact site label and oversized wordmark remain readable in small embeds.
details = Image.new("RGBA", card.size)
detail_draw = ImageDraw.Draw(details)
detail_draw.rounded_rectangle(rect((566, 122, 826, 168)), radius=scaled(23), fill=(154, 210, 239, 31), outline=(207, 238, 252, 79), width=scaled(1))
detail_draw.ellipse(rect((584, 139, 593, 148)), fill=(145, 214, 241, 255))
detail_draw.rounded_rectangle(rect((565, 397, 1025, 400)), radius=scaled(1), fill=(138, 198, 227, 133))
card = Image.alpha_composite(card, details)
draw = ImageDraw.Draw(card)
draw.text((scaled(606), scaled(132)), "MOTTAMEISTER.XYZ", font=font(16, True), fill=(203, 231, 245, 255), stroke_width=0)

draw.text((scaled(555), scaled(197)), "MOTTA", font=font(78, True), fill=(247, 251, 254, 255), stroke_width=0)
draw.text((scaled(555), scaled(279)), "MEISTER", font=font(78, True), fill=(160, 209, 233, 255), stroke_width=0)
draw.text((scaled(565), scaled(421)), "TOCA DA CORUJA", font=font(29, True), fill=(241, 250, 254, 255))
draw.text((scaled(566), scaled(465)), "GAMES  ·  COMUNIDADE  ·  VIDA REAL", font=font(16, True), fill=(181, 209, 224, 255))

card.convert("RGB").resize((1200, 630), Image.Resampling.LANCZOS).save(OUT, "JPEG", quality=88, optimize=True, subsampling=0)
print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
