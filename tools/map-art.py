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

W, H0 = 1024, 1536         # the picture size the prompt asks for (others are resized to this first)
H = H0                     # the height being worked on (pictures are cropped at their empty ends)
ROAD_HW = 80               # common half-width of the road (rim centre to rim centre) where pictures meet
OV_PX = 60                 # rows where neighbouring pictures overlap and cross-fade (the seam); the road is fully bent there
TAPER_MIN, TAPER_MAX = 90, 170   # after the band the road eases into the drawn one over ~1.6 × the shift it has to undo
SLOPE = 0.5                # the road's direction across the seam (px sideways per row): a gentle diagonal, as between platforms
OUT_W = 864                # width of the shipped WebP (phones show it at 320–640 css px; painterly art holds up when upscaled)
MAX_KB = 120
CAP_HW = 0.63               # the tallest a platform's button can look (height / width) in the 3/4 view
CAP_FIX = (0.59, 0.445)    # a clean button's height / width and its flat top's ry / rx (measured on clean ones)


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
    # the rims are found on an average of rows near the edge (some pictures fade the rims right at the edge, so look
    # a bit deeper), strong lines first (far roads have a faint inner rim next to the glow), weaker if none
    prof0 = nd.gaussian_filter1d(lum[rows[:40]].mean(0), 1)
    c = guess
    out = {}
    left = right = None
    for prom in (40, 25):
        pk, pr = find_peaks(prof0, prominence=prom)
        near = [p for p in pk if abs(p - guess) < 60]
        c = max(near, key=lambda p: prof0[p]) if near else guess     # the dash: the brightest peak near the guess
        left = [p for p in pk if c - 240 < p < c - 14]
        right = [p for p in pk if c + 14 < p < c + 240]
        if left and right: break
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


def road_rows_dash(rgb, rows, guess):
    """Fallback when the rims are faint at the edge: follow the glowing cyan dashes (the road's centre line, always
    there) row by row, and on each row take the nearest brightness peak either side of it as the rim. Rows between
    dashes and odd rims are filled and smoothed later (smooth_track)."""
    lum = nd.uniform_filter1d(rgb[..., 0] * 0.3 + rgb[..., 1] * 0.55 + rgb[..., 2] * 0.15, 3, axis=0)
    cyan = (rgb[..., 1] > 190) & (rgb[..., 2] > 225) & (rgb[..., 0] < 190)
    centres, out = {}, {}
    c = guess
    for y in rows:
        lo, hi = int(max(0, c - 70)), int(min(W, c + 70))
        xs = np.nonzero(cyan[y, lo:hi])[0]
        if len(xs) >= 3 and xs.max() - xs.min() < 45:
            c = lo + (xs.min() + xs.max()) / 2
            centres[y] = c
    if len(centres) < len(rows) * 0.2: return out
    ys = np.array(sorted(centres)); cs = np.interp(rows, ys, [centres[y] for y in ys])
    for y, c in zip(rows, cs):
        L = nd.gaussian_filter1d(lum[y], 1.5)
        ci = int(round(c))
        deck = np.median(np.r_[L[max(0, ci - 45):max(0, ci - 22)], L[ci + 22:ci + 45]])
        def rim(d):
            for k in range(30, 220):
                x = ci + d * k
                if x <= 1 or x >= W - 2: return None
                if L[x] > deck + 25 and L[x] >= L[x - 1] and L[x] >= L[x + 1]: return x
            return None
        l, r = rim(-1), rim(1)
        if l is not None and r is not None:
            hw = (r - l) / 2
            if 30 < hw < 200: out[y] = (c, hw)        # centre from the dashes, width from the rims
    return out


def road_any(rgb, rows, guess):
    """The rims first (precise); the dashes when the rims are faint."""
    m = road_rows(rgb, rows, guess)
    if len(m) >= len(rows) * 0.35: return m
    m2 = road_rows_dash(rgb, rows, guess)
    return m2 if len(m2) > len(m) else m


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


def bend_ends(img, limits, tapers):
    """Reshape both ends of the road so neighbouring pictures meet in one smooth diagonal, with no straight stretch.
    In every picture (unmirrored) the end platforms are on the right, and the second picture of each world is shown
    mirrored, so at every seam the road runs diagonally from one side to the other. In the band where two pictures
    overlap, the road of both is the same straight line: rims at ±ROAD_HW around a centre that goes from 512 − S at
    the edge to 512 + S at the band's inner row (S = SLOPE × band / 2), i.e. heading towards the platform; mirrored,
    the other picture's band gives exactly the same line. From the band to the platform the centre follows one cubic
    curve (Hermite) from that line into the road as drawn, matching its direction, and the width eases back too —
    so there is no S-bend. limits[end]: rows from that edge to the nearest platform. Returns the image and what was
    measured."""
    rgb = np.asarray(img.convert('RGB')).astype(np.float32)
    info = {}
    out = rgb.copy()
    full = OV_PX
    S = SLOPE * full / 2
    for end in ('bottom', 'top'):
        span = limits[end] - 6
        if span < full + 20:
            raise SystemExit(f'a platform is too close to the {end} edge ({limits[end]} px): the road has no room to meet the next picture')
        rows = list(range(H - 1, H - 1 - span - 40, -1)) if end == 'bottom' else list(range(0, span + 40))
        edge = rgb[rows[:80]]
        cyan = ((edge[..., 1] > 200) & (edge[..., 2] > 230)).sum(0).astype(float)
        cyan[:int(W * 0.3)] = 0; cyan[int(W * 0.7):] = 0
        sm = nd.uniform_filter1d(cyan, 25)
        cand = np.nonzero(sm >= 0.5 * sm.max())[0] if sm.max() > 0 else np.array([W // 2])
        guess = float(cand[np.argmin(np.abs(cand - W / 2))])
        track = smooth_track(road_any(rgb, rows, guess), rows)
        d = dash_offset(rgb, track, rows[:full])
        c0, h0 = track[rows[0]]
        info[end] = {'x': round(c0 / W, 4), 'hw': round(h0 / W, 4), 'dash': round(d / W, 4)}
        cs = np.array([track[y][0] for y in rows]); hs = np.array([track[y][1] for y in rows])
        # where the reshaped road joins the road as drawn, and the drawn road's direction there (px per row inwards)
        j = span - 1
        c1, h1 = cs[j], hs[j]
        m1 = float(np.mean(np.gradient(cs)[max(0, j - 12):j + 1]))
        x0, m0 = W / 2 + S, 2 * S / full            # the band's inner row and the line's direction
        L = j - full
        xs = np.arange(W, dtype=np.float32)
        for r, y in enumerate(rows[:span]):
            c, h = cs[r], hs[r]
            if r < full:
                tc, th, dd = W / 2 - S + 2 * S * r / full, ROAD_HW, 0.0
            else:
                u = (r - full) / L
                h00, h10, h01, h11 = 2*u**3 - 3*u**2 + 1, u**3 - 2*u**2 + u, -2*u**3 + 3*u**2, u**3 - u**2
                tc = h00 * x0 + h10 * L * m0 + h01 * c1 + h11 * L * m1
                w = smoothstep(u)
                th = ROAD_HW + (h - ROAD_HW) * w
                dd = d * w
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
        # a round button seen at this angle is at most ~0.62 as tall as wide; a taller blob means the bright road or
        # its glow above the button merged in — cut it from the top (the bottom, sitting on the gold, is reliable)
        merged = cy1 - cy0 > CAP_HW * cw
        if merged:
            # the button's side (the lowest quarter of the blob) is clean: take the width from there
            low = cy_ >= (cy1 - y0) - 0.22 * cw
            cx0, cx1 = xs.start + cx_[low].min(), xs.start + cx_[low].max() + 1
            cw = cx1 - cx0
            cy0 = int(cy1 - CAP_FIX[0] * cw)
            keep = (cy_ + y0) >= cy0
            cap = cap.copy(); cap[: max(0, cy0 - y0), :] = False
            cy_, cx_ = cy_[keep], cx_[keep]
        # the flat top (lighter, hue < 215) is an ellipse: fitted from its own extent
        top = cap & (Hh[y0:y1, xs] < 215)
        ty, tx = np.nonzero(top) if top.sum() > 0.3 * cap.sum() else (cy_, cx_)
        rx = (cx1 - cx0) / 2
        if merged:                                   # the top of the blob is not the button: use clean proportions
            ry = CAP_FIX[1] * rx
            cx, cy = (cx0 + cx1) / 2, cy0 + ry
        else:
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
    """Quality 72 down to 44; a busy picture that is still over MAX_KB is saved a little narrower (the game scales
    every picture to the column width anyway, so the width does not change any coordinates)."""
    w0, h0 = img.size
    for w in (w0, 800, 736):
        im = img if w == w0 else img.resize((w, round(h0 * w / w0)), Image.LANCZOS)
        for q in range(72, 42, -2):
            im.save(path, 'WEBP', quality=q, method=6)
            kb = os.path.getsize(path) / 1024
            if kb <= MAX_KB: return kb, q, w
    return kb, q, w


def crop_plan(img, free):
    """For each end: how many empty rows to cut and how long the bend after the band is. The road is followed from
    the edge inwards; the cut is the deepest row where band + bend (1.6 × the shift still to undo, 50–150 rows) fit
    before the platform. Returns ({'top': rows, 'bottom': rows}, {'top': taper, 'bottom': taper})."""
    rgb = np.asarray(img.convert('RGB')).astype(np.float32)
    cut, tapers = {}, {}
    for end in ('top', 'bottom'):
        n = free[end]
        rows = list(range(0, n)) if end == 'top' else list(range(H - 1, H - 1 - n, -1))
        edge = rgb[rows[:80]]
        cyan = ((edge[..., 1] > 200) & (edge[..., 2] > 230)).sum(0).astype(float)
        cyan[:int(W * 0.3)] = 0; cyan[int(W * 0.7):] = 0
        sm = nd.uniform_filter1d(cyan, 25)
        cand = np.nonzero(sm >= 0.5 * sm.max())[0] if sm.max() > 0 else np.array([W // 2])
        guess = float(cand[np.argmin(np.abs(cand - W / 2))])
        try: track = smooth_track(road_any(rgb, rows, guess), rows)
        except SystemExit: track = None
        best_k, best_t = 0, TAPER_MAX
        for k in range(max(0, n - OV_PX - TAPER_MIN), -1, -4):         # k = rows cut from this end
            if track is None: break
            c, h = track[rows[k]]
            line = W / 2 + SLOPE * OV_PX / 2 + SLOPE * TAPER_MIN       # where the seam's diagonal would be there
            taper = int(np.clip(1.6 * (abs(c - line) + 0.5 * abs(h - ROAD_HW)), TAPER_MIN, TAPER_MAX))
            if k + OV_PX + taper <= n:
                best_k, best_t = k, taper
                break
        cut[end], tapers[end] = best_k, best_t
    return cut, tapers


def process(name, debug):
    img = Image.open(os.path.join(SRC, name + '.png')).convert('RGB')
    if img.size != (W, H0): img = img.resize((W, H0), Image.LANCZOS)
    global H
    H = H0
    first = platforms(img)            # where the platforms are decides how much empty road there is at each end
    free = {'top': min(p['box'][1] for p in first) - 8, 'bottom': H - max(p['box'][1] + p['box'][3] for p in first) - 8}
    # crop the empty ends: keep only the band + the bend it needs, so the road between the last platform of one
    # picture and the first of the next is about as long as between two platforms of one picture
    cut, tapers = crop_plan(img, free)
    img = img.crop((0, cut['top'], W, H - cut['bottom']))
    H = img.size[1]
    limits = {e: free[e] - cut[e] + 8 for e in free}
    bent, road = bend_ends(img, limits, tapers)
    pads = platforms(bent)
    # check: after bending, both ends are in the middle at the common width
    check = bend_check(bent)
    out_h = round(OUT_W * H / W)
    kb, q, out_w = save_webp(bent.resize((OUT_W, out_h), Image.LANCZOS), os.path.join(OUT, name + '.webp'))
    out_h = round(out_w * H / W)
    meta = {
        'name': name, 'w': W, 'h': H, 'aspect': round(H / W, 5), 'overlap': round(OV_PX / H, 5), 'cut': cut,
        'road': {'before': road, 'after': check, 'hw': round(ROAD_HW / W, 4)},
        'pads': [{'x': round(p['cx'] / W, 4), 'y': round(p['cy'] / H, 4), 'rx': round(p['rx'] / W, 4), 'ry': round(p['ry'] / H, 4),
                  'cap': [round(p['cap'][0] / W, 4), round(p['cap'][1] / H, 4), round(p['cap'][2] / W, 4), round(p['cap'][3] / H, 4)],
                  'hit': [round(p['box'][0] / W, 4), round(p['box'][1] / H, 4), round(p['box'][2] / W, 4), round(p['box'][3] / H, 4)]} for p in pads],
        'webp': {'w': out_w, 'h': out_h, 'kb': round(kb, 1), 'quality': q},
    }
    with open(os.path.join(OUT, name + '.json'), 'w') as f: json.dump(meta, f, indent=1)
    print(f"{name}: road in x={road['bottom']['x'] * W:.0f} hw={road['bottom']['hw'] * W:.0f} → {check['bottom']['x'] * W:.0f}/{check['bottom']['hw'] * W:.0f}; "
          f"out x={road['top']['x'] * W:.0f} hw={road['top']['hw'] * W:.0f} → {check['top']['x'] * W:.0f}/{check['top']['hw'] * W:.0f}; "
          f"cut {cut['top']}/{cut['bottom']}, taper {tapers['top']}/{tapers['bottom']}; pads " + ' '.join(f"({p['cx']:.0f},{p['cy']:.0f})" for p in pads) + f"; webp {kb:.0f} KB q{q}")
    if debug: draw_debug(bent, pads, name)
    H = H0
    return meta


def bend_check(img):
    rgb = np.asarray(img.convert('RGB')).astype(np.float32)
    res = {}
    for end, rows in (('bottom', list(range(H - 1, H - 41, -1))), ('top', list(range(0, 40)))):
        # the overlap band is fully bent: its first 40 rows must show the road in the middle at the common width
        best = None
        for m in (road_rows(rgb, rows, W / 2), road_rows_dash(rgb, rows, W / 2)):
            if len(m) < len(rows) * 0.3: continue
            c = np.median([v[0] for v in m.values()]); h = np.median([v[1] for v in m.values()])
            err = abs(c - W / 2) + abs(h - ROAD_HW)
            if best is None or err < best[2]: best = (c, h, err)
        if best is None: raise SystemExit('road lost after bending (' + end + ')')
        c, h, _ = best
        if abs(c - W / 2) > 9 + SLOPE * OV_PX / 2:
            raise SystemExit(f'bending failed at the {end}: centre {c:.0f}, half-width {h:.0f}')
        if abs(h - ROAD_HW) > 12:      # the rims were not measured reliably (bright sky, rings, stars next to the road)
            print(f'  note: {end} edge — road width not measurable ({h:.0f}); the centre is right, check the debug picture')
        res[end] = {'x': round(c / W, 4), 'hw': round(h / W, 4)}
    return res


def draw_debug(img, pads, name):
    os.makedirs(DBG, exist_ok=True)
    d = img.copy(); dr = ImageDraw.Draw(d)
    for y in (OV_PX, H - OV_PX): dr.line([(0, y), (W, y)], fill=(255, 0, 255), width=2)
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
    metas, failed = [], []
    for n in names:
        try: metas.append(process(n, debug))
        except SystemExit as e: failed.append(n); print(f'{n}: FAILED — {e}')
    if failed: print('not prepared (the game keeps their earlier version if any):', ', '.join(failed))
    # the game's road, bottom to top: world N uses <N>-a then <N>-b; a missing picture repeats the pilot,
    # mirrored on every other slot so neighbours never look the same (see screens: MAP_ART)
    index = sorted(set([m['name'] for m in metas]) | set(f[:-5] for f in os.listdir(OUT) if f.endswith('.json') and f != 'index.json'))
    with open(os.path.join(OUT, 'index.json'), 'w') as f: json.dump(index, f)
    if failed: sys.exit(1)


if __name__ == '__main__':
    main()
