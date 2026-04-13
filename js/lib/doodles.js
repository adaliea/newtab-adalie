const META_URL = 'icons/doodles/meta.json';
const BASE = 'icons/doodles/';

// How many doodles to scatter around the page
const SIMPLE_COUNT = 10;
const COMPLEX_COUNT = 1;

// Max allowed clipping: doodle can be this fraction off-screen (e.g. 0.3 = 30%)
const MAX_CLIP = 0.3;

// Slots define regions along the page edges where doodles can appear.
// Ranges are in vw/vh percentages. Positions are computed as the doodle's CENTER
// so we can properly account for size when clamping.
const EDGE_SLOTS = [
  // Top edge
  { top: [2, 8],   left: [5, 25] },
  { top: [2, 8],   left: [75, 95] },
  { top: [3, 10],  left: [28, 48] },
  { top: [3, 10],  left: [52, 72] },
  // Left edge
  { top: [18, 32],  left: [2, 8] },
  { top: [38, 55],  left: [2, 8] },
  { top: [62, 78],  left: [2, 8] },
  // Right edge
  { top: [18, 32],  left: [92, 98] },
  { top: [38, 55],  left: [92, 98] },
  { top: [62, 78],  left: [92, 98] },
  // Bottom edge
  { top: [85, 95],  left: [5, 22] },
  { top: [85, 95],  left: [30, 48] },
  { top: [85, 95],  left: [52, 70] },
  { top: [85, 95],  left: [78, 95] },
];

export async function initDoodles() {
  let meta;
  try {
    const res = await fetch(chrome.runtime.getURL(META_URL));
    meta = await res.json();
  } catch {
    return;
  }

  const container = document.getElementById('corner-doodles');
  if (!container) return;

  container.innerHTML = '';

  const pool = buildPool(meta);
  if (pool.length === 0) return;

  const complexPool = meta.complex.map(e => ({
    type: 'complex',
    src: BASE + e.file,
  }));
  const lightPool = pool.filter(d => d.type !== 'complex');

  const used = new Set();
  const usedSlots = new Set();

  // Place simple/sheet doodles
  const simpleCount = Math.min(SIMPLE_COUNT, lightPool.length, EDGE_SLOTS.length);
  for (let i = 0; i < simpleCount; i++) {
    const pick = pickRandom(lightPool, used);
    const slot = pickRandomSlot(usedSlots);
    if (!pick || !slot) break;

    const el = createDoodleEl(slot, 'simple');
    container.appendChild(el);

    if (pick.type === 'sheet') {
      renderSheetCell(el, pick);
    } else {
      renderImg(el, pick.src);
    }
  }

  // Place complex doodles along the bottom
  if (complexPool.length > 0) {
    const count = Math.min(COMPLEX_COUNT, complexPool.length);
    for (let i = 0; i < count; i++) {
      const pick = complexPool[Math.floor(Math.random() * complexPool.length)];
      const el = createDoodleEl(
        { top: [82, 92], left: [randomInRange(10, 85)] },
        'complex'
      );
      container.appendChild(el);
      renderImg(el, pick.src);
    }
  }
}

function createDoodleEl(slot, type) {
  const el = document.createElement('div');
  el.className = 'doodle';

  const isComplex = type === 'complex';
  const size = isComplex ? randomInRange(220, 320) : randomInRange(140, 240);
  const rotation = randomInRange(-30, 30);
  const opacity = isComplex ? randomInRange(14, 20) / 100 : randomInRange(10, 18) / 100;

  // Pick a center position within the slot range
  const centerVhPct = Array.isArray(slot.top) && slot.top.length === 2
    ? randomInRange(slot.top[0], slot.top[1])
    : slot.top;
  const centerVwPct = Array.isArray(slot.left) && slot.left.length === 2
    ? randomInRange(slot.left[0], slot.left[1])
    : slot.left;

  // Convert center to px, then compute top-left so doodle is centered there.
  // Clamp so at most MAX_CLIP of the doodle is off-screen on any edge.
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let x = (centerVwPct / 100) * vw - size / 2;
  let y = (centerVhPct / 100) * vh - size / 2;

  const minClipPx = -size * MAX_CLIP;
  const maxX = vw - size * (1 - MAX_CLIP);
  const maxY = vh - size * (1 - MAX_CLIP);

  x = Math.max(minClipPx, Math.min(maxX, x));
  y = Math.max(minClipPx, Math.min(maxY, y));

  el.style.cssText = `
    position: fixed;
    top: ${y}px;
    left: ${x}px;
    width: ${size}px;
    height: ${size}px;
    opacity: ${opacity};
    transform: rotate(${rotation}deg);
    pointer-events: none;
    z-index: 0;
  `;

  return el;
}

function buildPool(meta) {
  const pool = [];

  for (const entry of meta.simple) {
    pool.push({ type: 'simple', src: BASE + entry.file });
  }

  for (const sheet of meta.sheets) {
    const [vbX, vbY, vbW, vbH] = sheet.viewBox;
    const cellW = vbW / sheet.cols;
    const cellH = vbH / sheet.rows;
    const inset = sheet.inset || 0;

    for (let r = 0; r < sheet.rows; r++) {
      for (let c = 0; c < sheet.cols; c++) {
        const ix = inset * cellW;
        const iy = inset * cellH;
        pool.push({
          type: 'sheet',
          src: BASE + sheet.file,
          cell: {
            x: vbX + c * cellW + ix,
            y: vbY + r * cellH + iy,
            w: cellW - 2 * ix,
            h: cellH - 2 * iy,
          },
          full: { w: vbW, h: vbH },
        });
      }
    }
  }

  return pool;
}

function pickRandom(pool, usedIndices) {
  const available = pool.map((d, i) => [d, i]).filter(([, i]) => !usedIndices.has(i));
  if (available.length === 0) return null;
  const [pick, idx] = available[Math.floor(Math.random() * available.length)];
  usedIndices.add(idx);
  return pick;
}

function pickRandomSlot(usedSlotIndices) {
  const available = EDGE_SLOTS.map((s, i) => [s, i]).filter(([, i]) => !usedSlotIndices.has(i));
  if (available.length === 0) return null;
  const [slot, idx] = available[Math.floor(Math.random() * available.length)];
  usedSlotIndices.add(idx);
  return slot;
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function renderImg(el, src) {
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL(src);
  img.alt = '';
  img.draggable = false;
  img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
  el.appendChild(img);
}

function renderSheetCell(el, doodle) {
  const { x, y, w, h } = doodle.cell;
  const url = chrome.runtime.getURL(doodle.src);

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  svg.style.cssText = 'width:100%;height:100%;overflow:hidden;';

  const image = document.createElementNS(ns, 'image');
  image.setAttribute('href', url);
  image.setAttribute('x', '0');
  image.setAttribute('y', '0');
  image.setAttribute('width', doodle.full.w);
  image.setAttribute('height', doodle.full.h);
  image.setAttribute('preserveAspectRatio', 'none');

  svg.appendChild(image);
  el.appendChild(svg);
}
