// news-image-20261117 — "The World Today": a newspaper front page summing up
// Tuesday 17 November 2026 in one image. Drawn entirely in code: a small
// 5x7 bitmap font, flat-colour pictogram scenes, and a hand-rolled PNG
// encoder (node:zlib). No network, no copied image, fully deterministic.
//
// Stories (all first reported / happening on 17 Nov 2026, verified from
// Reuters / AP / Bloomberg / Just Security / Al Jazeera reporting that day):
//   1. Ukraine drops a span of the Kerch (Crimean) Bridge — road link cut.
//   2. Iran fires drones at a U.S. radar site in Bahrain — intercepted.
//   3. China confirms a first Trump–Xi–Putin three-way meeting, Thursday
//      in Shenzhen on the APEC sidelines.
//   4. A tanker is hit by a blast near the Strait of Hormuz — crew safe.
//   5. Japan scrambles jets after Russian aircraft enter its airspace.
// Footer strip: Pentagon fails its audit a 9th year; Depardieu admits a
// sex-assault charge; the U.K. sanctions West Bank settlement builders.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER = [246, 241, 227];
const INK = [26, 26, 26];
const NAVY = [22, 35, 63];
const NAVY2 = [30, 48, 84];
const GOLD = [201, 162, 39];
const RED = [179, 57, 46];
const BLUE = [46, 95, 163];
const SKY = [168, 205, 232];
const SKY2 = [122, 178, 220];
const SEA = [38, 98, 150];
const SEA2 = [24, 74, 120];
const SAND = [232, 214, 176];
const WHITE = [255, 255, 255];
const GREY = [120, 120, 116];
const SMOKE = [150, 150, 146];
const ORANGE = [232, 120, 30];
const YELLOW = [244, 196, 48];
const GREEN = [46, 120, 70];
const DARK = [18, 18, 20];

// ---------------------------------------------------------------- canvas
const buf = new Uint8Array(W * H * 3);

function px(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: number[]): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
    }
  }
}

function circle(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) px(x, y, c);
    }
  }
}

function line(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (let n = 0; n < 4096; n++) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

function thickLine(x0: number, y0: number, x1: number, y1: number, t: number, c: number[]): void {
  const half = Math.floor(t / 2);
  for (let a = -half; a <= half; a++) {
    line(x0 + a, y0, x1 + a, y1, c);
    line(x0, y0 + a, x1, y1 + a, c);
  }
}

// Fill a polygon (array of [x, y]) with the even-odd scanline rule.
function poly(pts: number[][], c: number[]): void {
  let minY = H, maxY = 0;
  for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  minY = Math.max(0, minY); maxY = Math.min(H - 1, maxY);
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        const t = (y - a[1]) / (b[1] - a[1]);
        xs.push(Math.round(a[0] + t * (b[0] - a[0])));
      }
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = xs[k]; x <= xs[k + 1]; x++) px(x, y, c);
    }
  }
}

function triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]): void {
  poly([[x0, y0], [x1, y1], [x2, y2]], c);
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows, 5 bits each (bit 4 = leftmost column).
const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 6, 8, 16, 31], '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
  ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12],
  ',': [0, 0, 0, 0, 12, 4, 8], '-': [0, 0, 0, 14, 0, 0, 0],
  '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4],
  '/': [1, 1, 2, 4, 8, 16, 16], '(': [2, 4, 8, 8, 8, 4, 2],
  ')': [8, 4, 2, 2, 2, 4, 8], "'": [4, 4, 8, 0, 0, 0, 0],
  ':': [0, 12, 12, 0, 12, 12, 0], ';': [0, 12, 12, 0, 12, 4, 8],
  '*': [0, 4, 21, 14, 21, 4, 0],
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: number[]): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] ?? FONT['?'];
    for (let row = 0; row < 7; row++) {
      const bits = g[row];
      for (let col = 0; col < 5; col++) {
        if ((bits >> (4 - col)) & 1) {
          rect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentred(cx: number, y: number, s: string, scale: number, c: number[]): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}

// Greedy word wrap to a pixel width; returns lines (already upper-cased).
function wrap(s: string, scale: number, maxW: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textWidth(trial, scale) <= maxW || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- PNG writer
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- scenes
// Every scene is drawn with flat shapes only: no faces, no copied artwork.

// 1. Kerch Bridge: a long road-and-rail bridge over the strait, its middle
//    span dropped into the water, smoke rising, a missile trail above.
function sceneBridge(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY);
  rect(x, y + Math.floor(h * 0.62), w, h - Math.floor(h * 0.62), SEA);
  // sun
  circle(x + Math.floor(w * 0.86), y + Math.floor(h * 0.2), 16, YELLOW);
  // far shore
  rect(x, y + Math.floor(h * 0.55), w, 8, SAND);
  const deckY = y + Math.floor(h * 0.42);
  // bridge deck, left half and right half, gap in the middle
  const gapL = x + Math.floor(w * 0.42), gapR = x + Math.floor(w * 0.60);
  rect(x + 6, deckY, gapL - x - 6, 10, GREY);
  rect(gapR, deckY, x + w - 6 - gapR, 10, GREY);
  // fallen span, tilted into the water
  poly([[gapL, deckY + 4], [gapR - 14, deckY + 4], [gapR - 26, deckY + 58], [gapL - 8, deckY + 58]], [90, 90, 88]);
  // towers
  rect(x + Math.floor(w * 0.16), deckY - 58, 8, 58, GREY);
  rect(x + Math.floor(w * 0.76), deckY - 58, 8, 58, GREY);
  // arch over the gap, broken: two stubs
  thickLine(x + Math.floor(w * 0.42), deckY, x + Math.floor(w * 0.47), deckY - 44, 5, GREY);
  thickLine(x + Math.floor(w * 0.60), deckY, x + Math.floor(w * 0.55), deckY - 40, 5, GREY);
  // cables
  line(x + Math.floor(w * 0.16) + 4, deckY - 58, x + 10, deckY, INK);
  line(x + Math.floor(w * 0.16) + 4, deckY - 58, gapL, deckY, INK);
  line(x + Math.floor(w * 0.76) + 4, deckY - 58, gapR, deckY, INK);
  line(x + Math.floor(w * 0.76) + 4, deckY - 58, x + w - 10, deckY, INK);
  // explosion burst over the gap
  const bx = Math.floor((gapL + gapR) / 2), by = deckY - 26;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    line(bx, by, bx + Math.round(Math.cos(a) * 26), by + Math.round(Math.sin(a) * 26), ORANGE);
    line(bx, by, bx + Math.round(Math.cos(a) * 16), by + Math.round(Math.sin(a) * 16), YELLOW);
  }
  circle(bx, by, 10, ORANGE);
  circle(bx, by, 5, YELLOW);
  // smoke
  circle(bx - 26, by - 34, 12, SMOKE);
  circle(bx - 8, by - 48, 15, SMOKE);
  circle(bx + 16, by - 42, 11, SMOKE);
  // waves
  for (let i = 0; i < 5; i++) {
    const wx = x + 30 + i * Math.floor(w / 5);
    line(wx, y + h - 18, wx + 26, y + h - 18, WHITE);
  }
}

// 2. Bahrain radar: night sky, a radar dish on a base, two drones above,
//    an interception burst between them.
function sceneRadar(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, NAVY);
  // stars
  const stars: number[][] = [[0.08, 0.12], [0.22, 0.08], [0.35, 0.2], [0.5, 0.1], [0.66, 0.16], [0.8, 0.07], [0.92, 0.22], [0.58, 0.26], [0.15, 0.32]];
  for (const s of stars) circle(x + Math.floor(w * s[0]), y + Math.floor(h * s[1]), 2, WHITE);
  // ground
  rect(x, y + Math.floor(h * 0.78), w, h - Math.floor(h * 0.78), SAND);
  // radar dish: a tilted bowl on a mast
  const mx = x + Math.floor(w * 0.5), my = y + Math.floor(h * 0.62);
  rect(mx - 5, my, 10, Math.floor(h * 0.78) - Math.floor(h * 0.62), GREY);
  poly([[mx - 52, my - 34], [mx + 52, my - 58], [mx + 40, my - 8], [mx - 40, my - 2]], [200, 200, 196]);
  line(mx - 52, my - 34, mx + 52, my - 58, WHITE);
  // radar beam
  for (let i = 1; i <= 3; i++) {
    line(mx + 20, my - 46, mx + 20 + i * 22, my - 46 - i * 12, YELLOW);
  }
  // drones: small quadcopters
  function drone(dx: number, dy: number): void {
    rect(dx - 12, dy - 3, 24, 6, DARK);
    rect(dx - 18, dy - 5, 8, 3, DARK);
    rect(dx + 10, dy - 5, 8, 3, DARK);
    rect(dx - 18, dy + 3, 8, 3, DARK);
    rect(dx + 10, dy + 3, 8, 3, DARK);
    circle(dx, dy + 8, 2, RED);
  }
  drone(x + Math.floor(w * 0.2), y + Math.floor(h * 0.22));
  drone(x + Math.floor(w * 0.78), y + Math.floor(h * 0.3));
  // interception burst
  const ix = x + Math.floor(w * 0.5), iy = y + Math.floor(h * 0.24);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    line(ix, iy, ix + Math.round(Math.cos(a) * 18), iy + Math.round(Math.sin(a) * 18), ORANGE);
  }
  circle(ix, iy, 7, ORANGE);
  circle(ix, iy, 3, YELLOW);
}

// 3. Shenzhen summit: skyline, then three flagpoles — U.S., China, Russia.
function sceneSummit(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY2);
  circle(x + Math.floor(w * 0.85), y + Math.floor(h * 0.18), 13, YELLOW);
  // skyline silhouette
  const base = y + Math.floor(h * 0.72);
  const bld: number[][] = [[0.02, 0.3], [0.12, 0.42], [0.24, 0.26], [0.36, 0.5], [0.48, 0.34], [0.6, 0.46], [0.72, 0.3], [0.84, 0.4]];
  for (const b of bld) {
    const bw = Math.floor(w * 0.09);
    const bx = x + Math.floor(w * b[0]);
    const bh = Math.floor(h * b[1]);
    rect(bx, base - bh, bw, bh, NAVY2);
  }
  rect(x, base, w, h - Math.floor(h * 0.72), NAVY);
  // flagpoles and flags
  const poles = [0.18, 0.5, 0.82];
  for (let i = 0; i < 3; i++) {
    const px0 = x + Math.floor(w * poles[i]);
    const top = y + Math.floor(h * 0.12);
    rect(px0, top, 4, base - top, GREY);
    circle(px0 + 2, top - 3, 4, GOLD);
  }
  // U.S. flag: stripes + blue canton
  const f1x = x + Math.floor(w * 0.18) + 4, f1y = y + Math.floor(h * 0.12);
  for (let s = 0; s < 7; s++) rect(f1x, f1y + s * 5, 56, 5, s % 2 === 0 ? RED : WHITE);
  rect(f1x, f1y, 24, 20, NAVY);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) circle(f1x + 4 + c * 6, f1y + 4 + r * 6, 1, WHITE);
  // China flag: red field, yellow stars
  const f2x = x + Math.floor(w * 0.5) + 4, f2y = y + Math.floor(h * 0.12);
  rect(f2x, f2y, 56, 35, RED);
  circle(f2x + 10, f2y + 10, 4, YELLOW);
  circle(f2x + 24, f2y + 7, 2, YELLOW);
  circle(f2x + 30, f2y + 14, 2, YELLOW);
  circle(f2x + 26, f2y + 22, 2, YELLOW);
  // Russia flag: white / blue / red horizontal bands
  const f3x = x + Math.floor(w * 0.82) + 4, f3y = y + Math.floor(h * 0.12);
  rect(f3x, f3y, 56, 12, WHITE);
  rect(f3x, f3y + 12, 56, 12, BLUE);
  rect(f3x, f3y + 24, 56, 11, RED);
}

// 4. Hormuz tanker: a stricken oil tanker on the sea, flame and smoke,
//    a spiked mine in the water nearby.
function sceneTanker(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY);
  rect(x, y + Math.floor(h * 0.6), w, h - Math.floor(h * 0.6), SEA2);
  circle(x + Math.floor(w * 0.12), y + Math.floor(h * 0.18), 14, YELLOW);
  // tanker hull
  const hy = y + Math.floor(h * 0.52);
  poly([[x + 30, hy], [x + w - 90, hy], [x + w - 60, hy + 26], [x + 30, hy + 26]], [120, 40, 36]);
  rect(x + 30, hy - 14, Math.floor(w * 0.5), 14, [150, 52, 44]);
  // superstructure
  rect(x + w - 150, hy - 46, 46, 46, WHITE);
  rect(x + w - 150, hy - 58, 46, 12, RED);
  // funnel smoke
  circle(x + w - 128, hy - 72, 12, SMOKE);
  circle(x + w - 112, hy - 88, 14, SMOKE);
  // flame amidships
  const fx = x + Math.floor(w * 0.42), fy = hy - 8;
  triangle(fx - 16, fy, fx + 16, fy, fx, fy - 34, ORANGE);
  triangle(fx - 9, fy, fx + 9, fy, fx, fy - 20, YELLOW);
  // spiked mine in the water
  const mx = x + Math.floor(w * 0.8), my = y + Math.floor(h * 0.82);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    line(mx, my, mx + Math.round(Math.cos(a) * 20), my + Math.round(Math.sin(a) * 20), DARK);
  }
  circle(mx, my, 13, DARK);
  circle(mx - 4, my - 4, 3, GREY);
  // waves
  for (let i = 0; i < 4; i++) {
    const wx = x + 24 + i * Math.floor(w / 4);
    line(wx, y + h - 16, wx + 24, y + h - 16, WHITE);
  }
}

// 5. Japan jets: a red sun, two fighter jets in formation, a warning
//    triangle marking the airspace breach.
function sceneJets(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY);
  // rising sun
  circle(x + Math.floor(w * 0.5), y + Math.floor(h * 0.55), 34, RED);
  // clouds
  circle(x + Math.floor(w * 0.16), y + Math.floor(h * 0.2), 12, WHITE);
  circle(x + Math.floor(w * 0.26), y + Math.floor(h * 0.24), 9, WHITE);
  circle(x + Math.floor(w * 0.82), y + Math.floor(h * 0.76), 11, WHITE);
  // fighter jet silhouette, pointing right
  function jet(jx: number, jy: number, s: number): void {
    poly([[jx, jy], [jx + 46 * s, jy - 6 * s], [jx + 52 * s, jy], [jx + 46 * s, jy + 6 * s]], [70, 70, 72]);
    poly([[jx + 16 * s, jy - 5 * s], [jx + 30 * s, jy - 26 * s], [jx + 36 * s, jy - 5 * s]], [70, 70, 72]);
    poly([[jx + 16 * s, jy + 5 * s], [jx + 30 * s, jy + 24 * s], [jx + 36 * s, jy + 5 * s]], [70, 70, 72]);
    triangle(jx + 40 * s, jy - 4 * s, jx + 52 * s, jy, jx + 40 * s, jy + 4 * s, [90, 90, 92]);
  }
  jet(x + Math.floor(w * 0.14), y + Math.floor(h * 0.42), 1);
  jet(x + Math.floor(w * 0.48), y + Math.floor(h * 0.6), 1);
  // dashed flight path
  for (let i = 0; i < 8; i++) {
    line(x + Math.floor(w * 0.1) + i * 26, y + Math.floor(h * 0.42) - 40 + i * 4, x + Math.floor(w * 0.1) + i * 26 + 14, y + Math.floor(h * 0.42) - 40 + i * 4 + 2, GREY);
  }
  // warning triangle with exclamation mark
  const tx = x + Math.floor(w * 0.84), ty = y + Math.floor(h * 0.16);
  triangle(tx - 22, ty + 18, tx + 22, ty + 18, tx, ty - 20, YELLOW);
  rect(tx - 2, ty - 12, 4, 16, DARK);
  rect(tx - 2, ty + 8, 4, 4, DARK);
}

// ---------------------------------------------------------------- layout
function panelBorder(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, 3, INK);
  rect(x, y + h - 3, w, 3, INK);
  rect(x, y, 3, h, INK);
  rect(x + w - 3, y, 3, h, INK);
}

function drawGlobe(cx: number, cy: number, r: number): void {
  circle(cx, cy, r + 1, WHITE);
  circle(cx, cy, r, BLUE);
  line(cx - r, cy, cx + r, cy, WHITE);
  line(cx, cy - r, cx, cy + r, WHITE);
  poly([[cx - r + 6, cy - r + 4], [cx + 2, cy - r + 4], [cx + 6, cy - r + 12], [cx - r + 10, cy - r + 12]], GREEN);
  poly([[cx - r + 8, cy + 4], [cx - 2, cy + 4], [cx - 6, cy + r - 4], [cx - r + 6, cy + r - 6]], GREEN);
}

function drawMasthead(): void {
  rect(0, 0, W, 150, NAVY);
  rect(0, 146, W, 4, GOLD);
  drawTextCentred(512, 14, 'THE WORLD TODAY', 6, WHITE);
  drawTextCentred(512, 62, 'TUESDAY 17 NOVEMBER 2026', 5, GOLD);
  drawTextCentred(512, 116, 'ONE DAY IN WORLD NEWS', 2, WHITE);
  drawGlobe(96, 44, 20);
  drawGlobe(928, 44, 20);
}

function drawLead(): void {
  const x = 16, y = 158, w = 992, h = 300;
  rect(x, y, w, h, PAPER);
  panelBorder(x, y, w, h);
  sceneBridge(x + 8, y + 8, w - 16, 182);
  drawText(x + 16, y + 200, 'UKRAINE DROPS KERCH BRIDGE SPAN', 4, INK);
  drawText(x + 16, y + 242, 'ROAD LINK TO CRIMEA CUT; RAIL SPAN DAMAGED', 3, RED);
  drawText(x + 16, y + 272, 'SECOND STRIKE IN TWO DAYS, KYIV SAYS', 2, INK);
}

function drawStoryPanel(x: number, y: number, w: number, h: number,
  scene: (a: number, b: number, c: number, d: number) => void,
  headline: string, sub: string): void {
  rect(x, y, w, h, PAPER);
  panelBorder(x, y, w, h);
  scene(x + 8, y + 8, w - 16, 118);
  const lines = wrap(headline, 3, w - 24);
  let ty = y + 136;
  for (const ln of lines) {
    drawText(x + 12, ty, ln, 3, INK);
    ty += 26;
  }
  const subs = wrap(sub, 2, w - 24);
  for (const ln of subs) {
    drawText(x + 12, ty, ln, 2, RED);
    ty += 18;
  }
}

function drawFooter(): void {
  const y = 974;
  rect(0, y, W, 50, NAVY);
  rect(0, y, W, 3, GOLD);
  drawText(16, y + 9, 'ALSO TODAY: PENTAGON FAILS ITS AUDIT FOR A 9TH YEAR', 2, WHITE);
  drawText(16, y + 29, 'DEPARDIEU ADMITS SEX-ASSAULT CHARGE - U.K. SANCTIONS WEST BANK BUILDERS', 2, WHITE);
}

// ---------------------------------------------------------------- main
function main(): void {
  rect(0, 0, W, H, PAPER);
  drawMasthead();
  drawLead();
  drawStoryPanel(16, 466, 488, 246, sceneRadar,
    'IRAN FIRES DRONES AT U.S. RADAR IN BAHRAIN',
    'Bahrain says attack intercepted; no casualties');
  drawStoryPanel(520, 466, 488, 246, sceneSummit,
    'TRUMP, XI AND PUTIN TO MEET IN SHENZHEN',
    'First three-way talks set for Thursday');
  drawStoryPanel(16, 720, 488, 246, sceneTanker,
    'TANKER HIT BY BLAST NEAR STRAIT OF HORMUZ',
    'Vessel disabled off Oman; crew safe');
  drawStoryPanel(520, 720, 488, 246, sceneJets,
    'JAPAN SCRAMBLES JETS AS RUSSIAN PLANES ENTER',
    'Tokyo protests after airspace violation');
  drawFooter();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), encodePNG());
}

main();
