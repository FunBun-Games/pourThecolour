#!/usr/bin/env python3
"""Drawn level map (stage 3, GPT-3b pictures): prepares each picture for the game and marks its platforms.

For every store/art/gpt3b/<name>.png (1024×1536, a road from the bottom edge to the top edge, 5 empty platforms):
  1. measures the road where it crosses the bottom and the top edge (its centre line and width, from the rims);
  2. bends the last ~300 px at both ends so the road leaves every picture exactly in the middle and at one common
     width (ROAD_HW) — then any picture continues any other, and a picture mirrored left↔right still fits;
  3. finds the 5 platforms on the result (by the golden rim around the blue top) and fits the blue top as an ellipse;
  4. writes src/art/mapart/<name>.webp (≤ ~120 KB) and src/art/mapart/<name>.json (all coordinates as 0..1 fractions),
     plus src/art/mapart/index.json — the order of pictures the game stitches into one road;
  5. with --debug, writes qa-out/mapart/<name>-debug.png: the measured road, the platforms and the bent bands.

Usage: python3 tools/map-art.py [--debug] [names…]      (default: every PNG in store/art/gpt3b, in name order)
Needs Pillow, numpy, scipy.  Fails loudly when a picture does not have exactly 5 platforms or the road is not found.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'store/art/gpt3b')
OUT = os.path.join(ROOT, 'src/art/mapart')
DBG = os.path.join(ROOT, 'qa-out/mapart')

W, H = 1024, 1536          # the picture size the prompt asks for (others are resized to this first)
ROAD_HW = 80               # common half-width of the road (rim centre to rim centre) where pictures meet
TAPER = 90                 # after the overlap band the bend eases off over this many rows (less if a platform is nearer)
OUT_W = 864                # width of the shipped WebP (phones show it at 320–640 css px; painterly art holds up when upscaled)
MAX_KB = 120
OVERLAP = 0.09             # the next picture covers this share of the picture height and fades in (the seam)


def hsv_of(img):
    a = np.asarray(img.convert('HSV')).astype(np.float32)
    return a[..., 0] * (360 / 255), a[..., 1] / 255, a[..., 2] / 255


# ---------- road where it crosses an edge ----------
def road_rows(rgb, rows, guess):
    """Per row: centre and half-width of the road, from its two glowing rims (the nearest prominent brightness peaks
    either side of the cyan dashes). Starts at the edge and follows the rims row by row (each rim is looked for only
    a few px from where it was), so other bright things in the scene are not mistaken for the road."""
    from scipy.signal import find_peaks
    lum = rgb[..., 0] * 0.3 + rgb[..., 1] * 0.55 + rgb[..., 2] * 0.15
    lum = nd.uniform_filter1d(lum, 5, axis=0)          # average a few rows: less noise, thin rims survive
    prof0 = nd.gaussian_filter1d(lum[rows[:8]].mean(0), 1)
    pk, pr = find_peaks(prof0, prominence=40)   # strong lines only: far roads have a faint inner rim next to the glow
    c = guess
    # the dash: the brightest peak near the guess
    near = [p for p in pk if abs(p - c) < 60]
    if near: c = max(near, key=lambda p: prof0[p])
    left = [p for p in pk if c - 240 < p < c - 14]
    right = [p for p in pk if c + 14 < p < c + 240]
    out = {}
    if not left or not right: return out
    l, r = float(max(left)), float(min(right))
    miss = 0
    for y in rows:
        L = nd.gaussian_filter1d(lum[y], 1)
        found = []
        for e in (l, r):
            lo, hi = int(e) - 6, int(e) + 7
            seg = L[lo:hi]
            k = int(np.argmax(seg))
            base = min(L[lo - 8:lo].min(initial=999), L[hi:hi + 8].min(initial=999))
            found.append(lo + k if 0 < k < len(seg) - 1 and seg[k] - base > 18 else None)
        if found[0] is not None and found[1] is not None:
            l, r = 0.6 * l + 0.4 * found[0], 0.6 * r + 0.4 * found[1]
            out[y] = ((l + r) / 2, (r - l) / 2); miss = 0
        else:
            miss += 1
            if miss > 30: break          # the road left the band (a sharp turn) — the rest is interpolated
    return out


def smooth_track(meas, rows):
    """Fill gaps (linear) and smooth (moving median + mean) the per-row road measurements."""
    ys = np.array(sorted(meas));
    if len(ys) < len(rows) * 0.35:
        raise SystemExit(f'road not found reliably near the edge ({len(ys)}/{len(rows)} rows)')
    cs = np.array([meas[y][0] for y in ys]); hs = np.array([meas[y][1] for y in ys])
    rows = np.array(rows)
    c = np.interp(rows, ys, cs); h = np.interp(rows, ys, hs)
    c = nd.uniform_filter1d(nd.median_filter(c, 21), 15); h = nd.uniform_filter1d(nd.median_filter(h, 31), 21)
    return dict(zip(rows.tolist(), zip(c.tolist(), h.tolist())))


def smoothstep(t): return t * t * (3 - 2 * t)


def dash_offset(rgb, track, rows):
    """How far the cyan centre dashes sit from the middle between the rims (in 3/4 view they are often a little off)."""
    offs = []
    for y in rows:
        c, h = track[y]
        lo, hi = int(c - h * 0.6), int(c + h * 0.6)
        xs = np.nonzero((rgb[y, lo:hi, 1] > 200) & (rgb[y, lo:hi, 2] > 230))[0]
        if len(xs) >= 3: offs.append(lo + (xs.min() + xs.max()) / 2 - c)
    return float(np.median(offs)) if len(offs) > 10 else 0.0


def bend_ends(img, limits):
    """Bend both ends of the road to the middle at ROAD_HW: the rims go to 512 ± ROAD_HW and the dash line to 512.
    Fully inside the overlap band (where the neighbouring picture fades in, so both roads lie exactly on top of each
    other), then easing back to the picture as drawn over TAPER rows — but never into a platform (limits[end] is
    how many rows from that edge the nearest platform starts). Returns the new image and what was measured."""
    rgb = np.asarray(img.convert('RGB')).astype(np.float32)
    info = {}
    out = rgb.copy()
    full = int(round(OVERLAP * H))
    for end in ('bottom', 'top'):
        span = min(full + TAPER, limits[end] - 12)
        if span < full + 20:
            raise SystemExit(f'a platform is too close to the {end} edge ({limits[end]} px): the road has no room to meet the next picture')
        rows = list(range(H - 1, H - 1 - span - 40, -1)) if end == 'bottom' else list(range(0, span + 40))
        # first guess: the brightest cyan column in the 12 rows at the edge
        edge = rgb[rows[:12]]
        cyan = ((edge[..., 1] > 200) & (edge[..., 2] > 230)).sum(0)
        cyan[:200] = 0; cyan[-200:] = 0
        guess = float(np.argmax(nd.uniform_filter1d(cyan.astype(float), 25)))
        track = smooth_track(road_rows(rgb, rows, guess), rows)
        d = dash_offset(rgb, track, rows[:full])
        c0, h0 = track[rows[0]]
        info[end] = {'x': round(c0 / W, 4), 'hw': round(h0 / W, 4), 'dash': round(d / W, 4)}
        xs = np.arange(W, dtype=np.float32)
        for k, y in enumerate(rows[:span]):
            t = 1.0 if k < full else smoothstep(1 - (k - full) / (span - full))
            c, h = track[y]
            tc, th = c + (W / 2 - c) * t, h + (ROAD_HW - h) * t
            # destination knots → source knots (piecewise linear, image edges stay put): rims and the dash line
            dd = d * (1 - t)
            src = np.interp(xs, [0, tc - th, tc + dd, tc + th, W - 1], [0, c - h, c + d, c + h, W - 1])
            for ch in range(3):
                out[y, :, ch] = np.interp(src, xs, rgb[y, :, ch])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), info


# ---------- platforms ----------
def platforms(img):
    """Platforms = a blue round button (the cap) standing on a golden ring, ~1/6 of the picture wide.
    The gold shows as a wide crescent under the cap; the cap is the big saturated-blue blob sitting on it.
    Returns the cap as an ellipse (the part the game tints and writes on) and the whole platform box (the tap area)."""
    Hh, S, V = hsv_of(img)
    gold = (Hh > 25) & (Hh < 60) & (S > 0.55) & (V > 0.7)
    gold = nd.binary_closing(gold, iterations=2)
    # the cap is bright (the road and floor around it are the same blue but darker); its flat top is lighter cyan-blue
    # (hue < 215), its side deeper blue; white highlights are closed over
    cap_m = (Hh > 191) & (Hh < 235) & (S > 0.9) & (V > 0.86)
    lab, n = nd.label(gold)
    found = []
    for i, sl in enumerate(nd.find_objects(lab), 1):
        ys, xs = sl
        w, h = xs.stop - xs.start, ys.stop - ys.start
        if not (0.12 * W < w < 0.26 * W and 1.5 < w / max(h, 1) < 3.6): continue
        if (lab[sl] == i).sum() < 0.0018 * W * H: continue
        # the cap: the blue blob over the middle of the ring (search a box from a bit above the ring to its middle)
        y0, y1 = max(0, ys.start - h), ys.start + h * 2 // 3
        sub = nd.binary_closing(cap_m[y0:y1, xs], iterations=2)
        sub = nd.binary_fill_holes(nd.binary_opening(sub, iterations=2))
        cl, cn = nd.label(sub)
        if not cn: continue
        mid = cl[:, w // 2]
        ids = [v for v in np.unique(mid) if v]
        if not ids: continue
        best = max(ids, key=lambda v: (cl == v).sum())
        cap = cl == best
        cy_, cx_ = np.nonzero(cap)
        cw = cx_.max() - cx_.min() + 1
        if cw < 0.6 * w: continue                         # a lamp or a stripe, not a platform
        cx0, cx1 = xs.start + cx_.min(), xs.start + cx_.max() + 1
        cy0, cy1 = y0 + cy_.min(), y0 + cy_.max() + 1
        # the flat top (lighter, hue < 215) is an ellipse: fitted from its own extent
        top = cap & (Hh[y0:y1, xs] < 215)
        ty, tx = np.nonzero(top) if top.sum() > 0.3 * cap.sum() else (cy_, cx_)
        rx = (cx1 - cx0) / 2
        ty0, ty1 = np.percentile(ty, 1), np.percentile(ty, 99)
        ry = (ty1 - ty0) / 2
        cx, cy = (cx0 + cx1) / 2, y0 + (ty0 + ty1) / 2
        bx0, by0 = min(xs.start, cx0), min(ys.start, cy0)
        bx1, by1 = max(xs.stop, cx1), max(ys.stop, cy1)
        found.append({'cx': cx, 'cy': cy, 'rx': rx, 'ry': ry, 'cap': [cx0, cy0, cx1 - cx0, cy1 - cy0],
                      'box': [bx0, by0, bx1 - bx0, by1 - by0]})
    found.sort(key=lambda p: -p['cy'])   # bottom first: level 1 of the picture is the lowest platform
    if len(found) != 5:
        raise SystemExit(f'expected 5 platforms, found {len(found)}: ' + ', '.join(f"({p['cx']:.0f},{p['cy']:.0f})" for p in found))
    return found


def save_webp(img, path):
    q = 72
    while True:
        img.save(path, 'WEBP', quality=q, method=6)
        kb = os.path.getsize(path) / 1024
        if kb <= MAX_KB or q <= 40: return kb, q
        q -= 2


def process(name, debug):
    img = Image.open(os.path.join(SRC, name + '.png')).convert('RGB')
    if img.size != (W, H): img = img.resize((W, H), Image.LANCZOS)
    first = platforms(img)            # where the platforms are decides how far the road may be bent
    limits = {'top': min(p['box'][1] for p in first), 'bottom': H - max(p['box'][1] + p['box'][3] for p in first)}
    bent, road = bend_ends(img, limits)
    pads = platforms(bent)
    # check: after bending, both ends are in the middle at the common width
    check = bend_check(bent)
    out_h = round(OUT_W * H / W)
    kb, q = save_webp(bent.resize((OUT_W, out_h), Image.LANCZOS), os.path.join(OUT, name + '.webp'))
    meta = {
        'name': name, 'w': W, 'h': H, 'aspect': round(H / W, 5), 'overlap': OVERLAP,
        'road': {'before': road, 'after': check, 'hw': round(ROAD_HW / W, 4)},
        'pads': [{'x': round(p['cx'] / W, 4), 'y': round(p['cy'] / H, 4), 'rx': round(p['rx'] / W, 4), 'ry': round(p['ry'] / H, 4),
                  'cap': [round(p['cap'][0] / W, 4), round(p['cap'][1] / H, 4), round(p['cap'][2] / W, 4), round(p['cap'][3] / H, 4)],
                  'hit': [round(p['box'][0] / W, 4), round(p['box'][1] / H, 4), round(p['box'][2] / W, 4), round(p['box'][3] / H, 4)]} for p in pads],
        'webp': {'w': OUT_W, 'h': out_h, 'kb': round(kb, 1), 'quality': q},
    }
    with open(os.path.join(OUT, name + '.json'), 'w') as f: json.dump(meta, f, indent=1)
    print(f"{name}: road in x={road['bottom']['x'] * W:.0f} hw={road['bottom']['hw'] * W:.0f} → {check['bottom']['x'] * W:.0f}/{check['bottom']['hw'] * W:.0f}; "
          f"out x={road['top']['x'] * W:.0f} hw={road['top']['hw'] * W:.0f} → {check['top']['x'] * W:.0f}/{check['top']['hw'] * W:.0f}; "
          f"pads " + ' '.join(f"({p['cx']:.0f},{p['cy']:.0f})" for p in pads) + f"; webp {kb:.0f} KB q{q}")
    if debug: draw_debug(bent, pads, name)
    return meta


def bend_check(img):
    rgb = np.asarray(img.convert('RGB')).astype(np.float32)
    res = {}
    for end, rows in (('bottom', list(range(H - 1, H - 13, -1))), ('top', list(range(0, 12)))):
        m = road_rows(rgb, rows, W / 2)
        if not m: raise SystemExit('road lost after bending (' + end + ')')
        c = np.median([v[0] for v in m.values()]); h = np.median([v[1] for v in m.values()])
        if abs(c - W / 2) > 6 or abs(h - ROAD_HW) > 8:
            raise SystemExit(f'bending failed at the {end}: centre {c:.0f}, half-width {h:.0f}')
        res[end] = {'x': round(c / W, 4), 'hw': round(h / W, 4)}
    return res


def draw_debug(img, pads, name):
    os.makedirs(DBG, exist_ok=True)
    d = img.copy(); dr = ImageDraw.Draw(d)
    for y in (int(OVERLAP * H), H - int(OVERLAP * H)): dr.line([(0, y), (W, y)], fill=(255, 0, 255), width=2)
    dr.line([(W / 2, 0), (W / 2, H)], fill=(255, 0, 255), width=1)
    for k, p in enumerate(pads):
        dr.ellipse([p['cx'] - p['rx'], p['cy'] - p['ry'], p['cx'] + p['rx'], p['cy'] + p['ry']], outline=(255, 0, 0), width=3)
        x, y, w, h = p['cap']; dr.rectangle([x, y, x + w, y + h], outline=(0, 255, 255), width=2)
        x, y, w, h = p['box']; dr.rectangle([x, y, x + w, y + h], outline=(0, 255, 0), width=2)
        dr.text((p['cx'] - 4, p['cy'] - 6), str(k + 1), fill=(255, 255, 255))
    d.resize((W // 2, H // 2)).save(os.path.join(DBG, name + '-debug.png'))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    debug = '--debug' in sys.argv
    names = args or sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.png'))
    os.makedirs(OUT, exist_ok=True)
    metas = [process(n, debug) for n in names]
    # the game's road, bottom to top: world N uses <N>-a then <N>-b; a missing picture repeats the pilot,
    # mirrored on every other slot so neighbours never look the same (see screens: MAP_ART)
    index = sorted(set([m['name'] for m in metas]) | set(f[:-5] for f in os.listdir(OUT) if f.endswith('.json') and f != 'index.json'))
    with open(os.path.join(OUT, 'index.json'), 'w') as f: json.dump(index, f)


if __name__ == '__main__':
    main()
