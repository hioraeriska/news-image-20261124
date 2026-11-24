// The World — Tuesday 24 November 2026: a tabloid front page summing up the day.
// Node 22, standard library only. Draws a 1024x1024 PNG with a hand-written
// 5x7 bitmap font and a hand-written PNG encoder (zlib deflate + CRC32).
// Deterministic: the same bytes on every run. No network, no clock, no random.
// Usage: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;
const PAPER: RGB = [246, 241, 229];
const INK: RGB = [22, 20, 18];
const RED: RGB = [185, 28, 28];
const FAINT: RGB = [216, 208, 189];
const NAVY: RGB = [15, 36, 64];
const NAVYLINE: RGB = [30, 58, 95];
const GREEN: RGB = [34, 197, 94];
const LIGHTBLUE: RGB = [147, 197, 253];
const WHITE: RGB = [255, 255, 255];

type RGB = [number, number, number];

// ---------------------------------------------------------------- font 5x7
// Each glyph: 7 rows of 5 bits, '1' = ink. Uppercase + digits + punctuation.
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '+': ['00000', '00100', '00100', '01110', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '•': ['00000', '00000', '01100', '01100', '01100', '00000', '00000'],
};

// ------------------------------------------------------------- framebuffer
const fb = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  fb[i * 3] = PAPER[0];
  fb[i * 3 + 1] = PAPER[1];
  fb[i * 3 + 2] = PAPER[2];
}

function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  fb[i] = c[0];
  fb[i + 1] = c[1];
  fb[i + 2] = c[2];
}

function fill(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) px(xx, yy, c);
  }
}

// Bresenham line, thickness in pixels.
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, wd = 1): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  const r = Math.floor(wd / 2);
  for (;;) {
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) px(x + a, y + b, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy));
    for (let xx = -dx; xx <= dx; xx++) px(cx + xx, cy + dy, c);
  }
}

function glyph(ch: string, x: number, y: number, s: number, c: RGB): void {
  const g = FONT[ch] ?? FONT[' '];
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === '1') fill(x + col * s, y + r * s, s, s, c);
    }
  }
}

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function text(s: string, x: number, y: number, scale: number, c: RGB): number {
  const up = s.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    const ch = up[i];
    if (ch !== ' ') glyph(ch, x + i * 6 * scale, y, scale, c);
  }
  return x + textWidth(s, scale);
}

function centerText(s: string, y: number, scale: number, c: RGB): void {
  text(s, Math.floor((W - textWidth(s, scale)) / 2), y, scale, c);
}

// Greedy word wrap: lines of at most maxChars characters.
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') { cur = w; continue; }
    if (cur.length + 1 + w.length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// ------------------------------------------------------------------- icons
// Small white pictograms drawn inside a 44x40 box at (bx, by). fg on bg.
function icon(kind: string, bx: number, by: number, fg: RGB, bg: RGB): void {
  switch (kind) {
    case 'plane':
      fill(bx + 6, by + 18, 30, 4, fg); fill(bx + 36, by + 17, 4, 6, fg);
      fill(bx + 8, by + 10, 4, 10, fg); fill(bx + 18, by + 22, 6, 10, fg);
      fill(bx + 10, by + 22, 4, 6, fg); break;
    case 'court':
      fill(bx + 10, by + 6, 24, 3, fg);
      fill(bx + 12, by + 10, 3, 18, fg); fill(bx + 20, by + 10, 3, 18, fg); fill(bx + 28, by + 10, 3, 18, fg);
      fill(bx + 8, by + 30, 28, 3, fg); break;
    case 'megaphone':
      fill(bx + 26, by + 10, 10, 16, fg); fill(bx + 12, by + 14, 14, 8, fg);
      fill(bx + 10, by + 22, 4, 8, fg); fill(bx + 38, by + 12, 2, 12, fg); break;
    case 'shield':
      fill(bx + 12, by + 6, 20, 4, fg);
      fill(bx + 12, by + 6, 4, 22, fg); fill(bx + 28, by + 6, 4, 22, fg); fill(bx + 12, by + 24, 20, 4, fg);
      line(bx + 16, by + 18, bx + 20, by + 22, fg, 2); line(bx + 20, by + 22, bx + 28, by + 12, fg, 2); break;
    case 'ballot':
      fill(bx + 10, by + 8, 24, 4, fg); fill(bx + 10, by + 8, 4, 24, fg);
      fill(bx + 30, by + 8, 4, 24, fg); fill(bx + 10, by + 28, 24, 4, fg);
      line(bx + 15, by + 20, bx + 19, by + 24, fg, 2); line(bx + 19, by + 24, bx + 29, by + 12, fg, 2); break;
    case 'badge':
      disc(bx + 22, by + 15, 8, fg); fill(bx + 16, by + 23, 4, 11, fg); fill(bx + 24, by + 23, 4, 11, fg);
      disc(bx + 22, by + 15, 3, bg); break;
    case 'cross':
      fill(bx + 19, by + 8, 6, 24, fg); fill(bx + 10, by + 17, 24, 6, fg); break;
    case 'burst':
      line(bx + 22, by + 6, bx + 22, by + 34, fg, 2); line(bx + 8, by + 20, bx + 36, by + 20, fg, 2);
      line(bx + 12, by + 10, bx + 32, by + 30, fg, 2); line(bx + 32, by + 10, bx + 12, by + 30, fg, 2);
      disc(bx + 22, by + 20, 4, fg); break;
    case 'book':
      fill(bx + 10, by + 8, 24, 24, fg); fill(bx + 21, by + 8, 2, 24, bg);
      fill(bx + 13, by + 12, 6, 2, bg); fill(bx + 13, by + 17, 6, 2, bg); fill(bx + 13, by + 22, 6, 2, bg);
      fill(bx + 25, by + 12, 6, 2, bg); fill(bx + 25, by + 17, 6, 2, bg); fill(bx + 25, by + 22, 6, 2, bg); break;
    case 'scales':
      fill(bx + 21, by + 6, 2, 24, fg); fill(bx + 10, by + 8, 24, 2, fg);
      fill(bx + 8, by + 18, 8, 2, fg); fill(bx + 28, by + 18, 8, 2, fg);
      fill(bx + 14, by + 30, 16, 2, fg);
      line(bx + 12, by + 10, bx + 8, by + 18, fg, 1); line(bx + 12, by + 10, bx + 16, by + 18, fg, 1);
      line(bx + 32, by + 10, bx + 28, by + 18, fg, 1); line(bx + 32, by + 10, bx + 36, by + 18, fg, 1); break;
    case 'ship':
      fill(bx + 8, by + 22, 28, 6, fg); fill(bx + 36, by + 22, 4, 4, fg);
      fill(bx + 20, by + 8, 2, 14, fg); fill(bx + 23, by + 10, 10, 12, fg);
      fill(bx + 8, by + 32, 28, 2, fg); fill(bx + 12, by + 35, 20, 2, fg); break;
    case 'person':
      disc(bx + 22, by + 13, 7, fg); fill(bx + 12, by + 24, 20, 10, fg); break;
    case 'flag':
      fill(bx + 12, by + 6, 2, 28, fg); fill(bx + 14, by + 6, 20, 12, fg); fill(bx + 28, by + 10, 6, 4, bg); break;
    case 'warning':
      fill(bx + 18, by + 8, 8, 3, fg); fill(bx + 16, by + 11, 12, 3, fg); fill(bx + 14, by + 14, 16, 3, fg);
      fill(bx + 12, by + 17, 20, 3, fg); fill(bx + 10, by + 20, 24, 3, fg); fill(bx + 8, by + 23, 28, 3, fg);
      fill(bx + 8, by + 26, 28, 3, fg); text('!', bx + 20, by + 13, 1, bg); break;
    case 'chat':
      fill(bx + 8, by + 8, 28, 18, fg); fill(bx + 12, by + 26, 6, 6, fg);
      fill(bx + 13, by + 15, 4, 4, bg); fill(bx + 20, by + 15, 4, 4, bg); fill(bx + 27, by + 15, 4, 4, bg); break;
    case 'note':
      fill(bx + 26, by + 8, 3, 20, fg); disc(bx + 22, by + 28, 5, fg); fill(bx + 29, by + 8, 8, 6, fg); break;
    case 'drone':
      line(bx + 10, by + 10, bx + 34, by + 30, fg, 2); line(bx + 34, by + 10, bx + 10, by + 30, fg, 2);
      fill(bx + 19, by + 17, 6, 6, fg);
      disc(bx + 10, by + 10, 4, fg); disc(bx + 34, by + 10, 4, fg);
      disc(bx + 10, by + 30, 4, fg); disc(bx + 34, by + 30, 4, fg); break;
    case 'flame':
      fill(bx + 20, by + 6, 4, 4, fg); fill(bx + 17, by + 10, 10, 4, fg); fill(bx + 14, by + 14, 16, 6, fg);
      fill(bx + 12, by + 20, 20, 8, fg); fill(bx + 14, by + 28, 16, 4, fg);
      fill(bx + 19, by + 20, 6, 8, bg); break;
    case 'chip':
      fill(bx + 12, by + 10, 20, 3, fg); fill(bx + 12, by + 27, 20, 3, fg);
      fill(bx + 12, by + 10, 3, 20, fg); fill(bx + 29, by + 10, 3, 20, fg);
      fill(bx + 18, by + 16, 8, 8, fg);
      fill(bx + 15, by + 6, 3, 4, fg); fill(bx + 21, by + 6, 3, 4, fg); fill(bx + 27, by + 6, 3, 4, fg);
      fill(bx + 15, by + 30, 3, 4, fg); fill(bx + 21, by + 30, 3, 4, fg); fill(bx + 27, by + 30, 3, 4, fg);
      fill(bx + 6, by + 15, 6, 3, fg); fill(bx + 6, by + 22, 6, 3, fg);
      fill(bx + 32, by + 15, 6, 3, fg); fill(bx + 32, by + 22, 6, 3, fg); break;
    case 'crack':
      line(bx + 22, by + 6, bx + 16, by + 14, fg, 2); line(bx + 16, by + 14, bx + 24, by + 20, fg, 2);
      line(bx + 24, by + 20, bx + 16, by + 28, fg, 2); line(bx + 16, by + 28, bx + 22, by + 34, fg, 2); break;
    case 'cloud':
      disc(bx + 16, by + 22, 7, fg); disc(bx + 26, by + 20, 8, fg); disc(bx + 32, by + 24, 5, fg);
      fill(bx + 12, by + 24, 24, 6, fg); break;
    case 'ball':
      disc(bx + 22, by + 20, 12, fg);
      line(bx + 12, by + 15, bx + 32, by + 25, bg, 2); line(bx + 12, by + 25, bx + 32, by + 15, bg, 2); break;
    case 'globe':
      disc(bx + 22, by + 20, 13, fg);
      fill(bx + 21, by + 8, 2, 24, bg); fill(bx + 9, by + 19, 26, 2, bg);
      disc(bx + 22, by + 20, 6, bg); break;
    default:
      disc(bx + 22, by + 20, 10, fg); disc(bx + 22, by + 20, 5, bg); break;
  }
}

// ------------------------------------------------------------------ stories
// All events happened, or were first reported, on Tuesday 24 November 2026.
type Story = { h: string; icon: string };
type Region = { name: string; color: RGB; stories: Story[] };

const REGIONS: Region[] = [
  {
    name: 'NORTH AMERICA', color: [29, 78, 216], stories: [
      { h: "O'HARE HALTS FLIGHTS IN HOLIDAY RUSH", icon: 'plane' },
      { h: 'COURT OPENS PATH TO ERASE TRUMP HUSH-MONEY CASE', icon: 'court' },
      { h: 'TRUMP BLASTS NEWSOM OVER 548 DEATH-ROW COMMUTES', icon: 'megaphone' },
      { h: 'MINNESOTA FRAUD PROBE: CHILD CENTRES RAIDED', icon: 'shield' },
      { h: 'ALLEGHENY CERTIFIES MIDTERM RESULTS', icon: 'ballot' },
    ],
  },
  {
    name: 'LATIN AMERICA', color: [21, 128, 61], stories: [
      { h: 'MEXICO CAPTURES SINALOA KINGPIN IN GUN BATTLE', icon: 'badge' },
      { h: 'BUKELE SEEKS THIRD TERM IN EL SALVADOR', icon: 'ballot' },
      { h: 'BOLSONARO RUSHED TO ICU IN BRASILIA', icon: 'cross' },
      { h: '3 SALVADORAN SOLDIERS DIE IN HAITI BLAST', icon: 'burst' },
    ],
  },
  {
    name: 'EUROPE', color: [124, 58, 237], stories: [
      { h: '450 GERMAN SCHOOLS HIT BY BOMB THREATS', icon: 'book' },
      { h: "DENMARK COURT BACKS 'GHETTO LAW'", icon: 'scales' },
      { h: 'DRONE STRIKE SETS RUSSIAN SHIP ABLAZE', icon: 'ship' },
      { h: 'DUTCH ACTIVIST DIES BY EUTHANASIA AT 28', icon: 'person' },
      { h: "KING CALLS MEGHAN AFTER FATHER'S ARREST", icon: 'flag' },
    ],
  },
  {
    name: 'MIDDLE EAST', color: [180, 83, 9], stories: [
      { h: "GAZA 'POISONED FOR DECADES', REPORT WARNS", icon: 'warning' },
      { h: 'ISRAELI STRIKE KILLS 3 IN GAZA CITY', icon: 'burst' },
      { h: 'TURKEY, EGYPT TALK DE-ESCALATION', icon: 'chat' },
      { h: "MOSSAD 'SAVED SWIFT'S VIENNA SHOWS'", icon: 'note' },
    ],
  },
  {
    name: 'AFRICA', color: [190, 18, 60], stories: [
      { h: 'DRONE ATTACK SINKS RUSSIAN SHIP IN LIBYA', icon: 'ship' },
      { h: "SUDAN DRONE STRIKES 'KILLED 1,600 THIS YEAR'", icon: 'drone' },
      { h: 'FIGHTING TRAPS EBOLA TEAMS IN DR CONGO', icon: 'cross' },
      { h: 'REBEL ATTACK KILLS 15 IN SOUTH SUDAN', icon: 'burst' },
    ],
  },
  {
    name: 'ASIA', color: [14, 116, 144], stories: [
      { h: 'INDONESIA FACTORY FIRE KILLS 24', icon: 'flame' },
      { h: 'INDIA, CHINA HOLD BORDER TALKS', icon: 'chat' },
      { h: 'MODI OPENS AI CENTRE AT IIT PATNA', icon: 'chip' },
      { h: 'QUAKE HITS PAKISTAN NEAR AFGHAN BORDER', icon: 'crack' },
      { h: 'LAHORE TOPS POLLUTION RANKING AGAIN', icon: 'cloud' },
    ],
  },
];

// The day's third act, told as one strip: climate, sport, sport.
const GLOBAL: { h: string; icon: string; color: RGB }[] = [
  { h: 'COP31 ENDS WITH NO DEAL AS TALKS COLLAPSE', icon: 'globe', color: [51, 65, 85] },
  { h: 'ALCARAZ WINS FIRST ATP FINALS TITLE', icon: 'ball', color: [51, 65, 85] },
  { h: "FIFA PICKS 2031, 2035 WOMEN'S WORLD CUP HOSTS", icon: 'ball', color: [51, 65, 85] },
];

const TOTAL_STORIES = 1 + REGIONS.reduce((n, r) => n + r.stories.length, 0) + GLOBAL.length;

// ------------------------------------------------------------------ layout
// Masthead.
text('THE WORLD', Math.floor((W - textWidth('THE WORLD', 9)) / 2), 20, 9, INK);
fill(16, 92, 992, 2, INK);
centerText('TUESDAY 24 NOVEMBER 2026', 100, 3, INK);
centerText(`${TOTAL_STORIES} STORIES FROM 7 REGIONS`, 128, 2, RED);

// Hero: scene panel (left) + headline block (right).
const HY = 156;
const HH = 280;
fill(16, HY, 584, HH, NAVY);
// circuit traces
for (let i = 0; i < 5; i++) {
  fill(36 + i * 110, HY + 24, 2, HH - 48, NAVYLINE);
  fill(36, HY + 40 + i * 52, 544, 2, NAVYLINE);
}
// chip
fill(76, 221, 150, 3, WHITE); fill(76, 368, 150, 3, WHITE);
fill(76, 221, 3, 150, WHITE); fill(223, 221, 3, 150, WHITE);
for (let i = 0; i < 4; i++) {
  fill(96 + i * 36, 211, 6, 10, WHITE); fill(96 + i * 36, 371, 6, 10, WHITE);
  fill(66, 241 + i * 36, 10, 6, WHITE); fill(226, 241 + i * 36, 10, 6, WHITE);
}
fill(96, 276, 110, 40, WHITE);
text('NVDA', 115, 283, 3, NAVY);
// rising chart arrow
line(300, 400, 400, 330, GREEN, 7);
line(400, 330, 480, 350, GREEN, 7);
line(480, 350, 570, 210, GREEN, 7);
line(570, 210, 540, 214, GREEN, 7);
line(570, 210, 566, 240, GREEN, 7);
text('+31%', 330, 176, 7, GREEN);
text('IN ONE DAY', 332, 240, 2, LIGHTBLUE);
text('NASDAQ: NVDA', 36, 408, 2, LIGHTBLUE);

// Headline block.
const HX = 616;
text('TECH • MARKETS', HX, 164, 2, RED);
text('HUANG IS', HX, 196, 6, INK);
text('BACK', HX, 244, 6, INK);
const deck = wrap('NVIDIA REINSTATES ITS CEO AFTER A BOARD PROBE. SHARES SOAR 31%, ADDING NEARLY $1TN IN VALUE.', 32);
deck.forEach((ln, i) => text(ln, HX, 300 + i * 14, 2, INK));
fill(HX, 360, 186, 44, PAPER);
fill(HX, 360, 186, 2, INK); fill(HX, 402, 186, 2, INK);
fill(HX, 360, 2, 44, INK); fill(HX + 184, 360, 2, 44, INK);
text('SHARES +31%', HX + 18, 376, 2, INK);
fill(HX + 206, 360, 186, 44, PAPER);
fill(HX + 206, 360, 186, 2, INK); fill(HX + 206, 402, 186, 2, INK);
fill(HX + 206, 360, 2, 44, INK); fill(HX + 390, 360, 2, 44, INK);
text('VALUE +$1TN', HX + 224, 376, 2, INK);

// Story grid: three columns, two regions in the first two, two in the third.
const COLS: Region[][] = [
  [REGIONS[0], REGIONS[1]],
  [REGIONS[2], REGIONS[3]],
  [REGIONS[4], REGIONS[5]],
];
const COLX = [16, 352, 688];
const COLW = 320;
const GY = 444;
for (let c = 0; c < 3; c++) {
  let y = GY;
  for (const region of COLS[c]) {
    fill(COLX[c], y, COLW, 22, region.color);
    text(region.name, COLX[c] + 8, y + 4, 2, WHITE);
    y += 22;
    for (const story of region.stories) {
      fill(COLX[c] + 4, y + 4, 44, 40, region.color);
      icon(story.icon, COLX[c] + 4, y + 4, WHITE, region.color);
      const lines = wrap(story.h, 21);
      lines.slice(0, 3).forEach((ln, i) => text(ln, COLX[c] + 56, y + 4 + i * 14, 2, INK));
      fill(COLX[c], y + 47, COLW, 1, FAINT);
      y += 48;
    }
  }
}

// Global strip: climate + sport.
const SY = 928;
fill(16, SY, 992, 22, [51, 65, 85]);
text('GLOBAL', 24, SY + 4, 2, WHITE);
GLOBAL.forEach((g, i) => {
  const gx = COLX[i];
  fill(gx, SY + 30, 10, 10, g.color);
  const lines = wrap(g.h, 25);
  lines.slice(0, 2).forEach((ln, j) => text(ln, gx + 16, SY + 28 + j * 14, 2, INK));
});

// Footer.
fill(16, 994, 992, 1, INK);
centerText('ALL EVENTS REPORTED ON TUESDAY 24 NOVEMBER 2026', 1002, 1, INK);

// --------------------------------------------------------------- PNG encode
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 3)] = 0;
  raw.set(fb.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', deflateSync(raw, { level: 9 })),
  pngChunk('IEND', Buffer.alloc(0)),
]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), png);
console.log(`wrote ${png.length} bytes, ${TOTAL_STORIES} stories`);
