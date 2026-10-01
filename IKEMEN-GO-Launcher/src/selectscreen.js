// ============================================================
// Screenpack select screen renderer
// ------------------------------------------------------------
// Reproduces the IKEMEN GO character select screen of a motif:
//  - [SelectBGdef] / [SelectBG ...] background layers (normal, anim,
//    parallax-as-normal), with tile, velocity, window and trans;
//  - the character grid exactly where start.lua puts it:
//      x = pos.x + col * (cell.size.x + spacing.x) + offset.x
//      y = pos.y + row * (cell.size.y + spacing.y) + offset.y
//    with per-cell overrides "cell.<c>-<r>.*", "cell.<c>-*.*",
//    "cell.*-<r>.*" and "cell.*-*.*" (scale, spacing, offset,
//    xangle/projection, facing, skip).
//
// Background layers are drawn on canvases; cells are DOM elements so
// the grid editor keeps drag-and-drop, clicks and context menus.
// ============================================================

import { parseAir } from "./sprites.js";

// ------------------------------------------------------------
// DEF parsing (sections in order, duplicate sections kept)
// ------------------------------------------------------------

export function parseDefSections(text) {
  const sections = [];
  let current = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split(";")[0].trim();
    if (!line) continue;

    const header = line.match(/^\[(.+?)\]/);

    if (header) {
      current = { name: header[1].trim(), lower: header[1].trim().toLowerCase(), values: new Map() };
      sections.push(current);
      continue;
    }

    const eq = line.indexOf("=");

    if (current && eq > 0) {
      const key = line.slice(0, eq).trim().toLowerCase();
      if (!current.values.has(key)) current.values.set(key, line.slice(eq + 1).trim());
    }
  }

  return sections;
}

function numbers(value, fallback = []) {
  if (value === undefined || value === null || value === "") return fallback;
  const list = String(value).split(",").map(v => parseFloat(v));
  return fallback.length ? fallback.map((f, i) => (Number.isFinite(list[i]) ? list[i] : f)) : list.filter(Number.isFinite);
}

// ------------------------------------------------------------
// Select screen layout ([Info] + [Select Info])
// ------------------------------------------------------------

export function readSelectLayout(text) {
  const sections = parseDefSections(text);
  const find = name => sections.find(s => s.lower === name)?.values || new Map();
  const info = find("info");
  const si = find("select info");
  const get = key => si.get(key);

  const localcoord = numbers(info.get("localcoord"), [320, 240]);

  // Per-cell overrides: cell.<c>-<r>.<param> with "*" wildcards.
  const overrides = {};

  for (const [key, value] of si) {
    const m = key.match(/^cell\.([0-9*]+)-([0-9*]+)\.(.+)$/);
    if (!m) continue;

    const cell = (overrides[`${m[1]}-${m[2]}`] ||= {});
    const param = m[3];

    if (["offset", "spacing", "scale"].includes(param)) cell[param] = numbers(value, [0, 0]);
    else if (["xangle", "yangle", "angle", "focallength", "xshear", "facing"].includes(param)) cell[param] = parseFloat(value) || 0;
    else if (param === "skip") cell.skip = parseInt(value, 10) === 1;
    else cell[param] = value.replace(/"/g, "").trim();
  }

  const spacing = numbers(get("cell.spacing"), [0, NaN]);
  if (!Number.isFinite(spacing[1])) spacing[1] = spacing[0];

  const sprite = key => {
    const n = numbers(get(key));
    return n.length >= 2 && n[0] >= 0 ? [n[0], n[1]] : null;
  };

  return {
    localcoord,
    rows: parseInt(get("rows"), 10) || 0,
    columns: parseInt(get("columns"), 10) || 0,
    pos: numbers(get("pos"), [0, 0]),
    cellSize: numbers(get("cell.size"), [25, 25]),
    spacing,
    showEmpty: (get("showemptyboxes") ?? "1").trim() !== "0",
    bg: { spr: sprite("cell.bg.spr"), scale: numbers(get("cell.bg.scale"), [1, 1]), facing: parseFloat(get("cell.bg.facing")) || 1 },
    random: { spr: sprite("cell.random.spr"), scale: numbers(get("cell.random.scale"), [1, 1]), facing: parseFloat(get("cell.random.facing")) || 1 },
    portrait: {
      spr: sprite("portrait.spr") || [9000, 0],
      offset: numbers(get("portrait.offset"), [0, 0]),
      scale: numbers(get("portrait.scale"), [1, 1]),
      facing: parseFloat(get("portrait.facing")) || 1
    },
    overrides
  };
}

function cellOverride(layout, col, row) {
  const o = layout.overrides;
  return o[`${col}-${row}`] || o[`${col}-*`] || o[`*-${row}`] || o["*-*"] || null;
}

// Same rules as start.lua (getCellSpacing / getCellOffset /
// getCellTransform).
export function cellGeometry(layout, col, row) {
  const o = cellOverride(layout, col, row);

  let spacing = layout.spacing;

  if (o?.spacing) {
    if (o.spacing[0] !== 0) spacing = o.spacing[1] === 0 ? [o.spacing[0], o.spacing[0]] : o.spacing;
    else if (o.spacing[1] !== 0) spacing = o.spacing;
  }

  const offset = o?.offset || [0, 0];
  const scale = o?.scale && (o.scale[0] !== 0 || o.scale[1] !== 0) ? o.scale : null;

  return {
    x: layout.pos[0] + col * (layout.cellSize[0] + spacing[0]) + offset[0],
    y: layout.pos[1] + row * (layout.cellSize[1] + spacing[1]) + offset[1],
    scale,
    xangle: o?.xangle || 0,
    yangle: o?.yangle || 0,
    angle: o?.angle || 0,
    projection: o?.projection || "",
    focallength: o?.focallength || 0,
    facing: o?.facing || 0,
    skip: !!o?.skip
  };
}

// ------------------------------------------------------------
// Background ([SelectBGdef] + [SelectBG ...])
// ------------------------------------------------------------

export function readBackground(text, prefix = "selectbg") {
  const sections = parseDefSections(text);
  const def = sections.find(s => s.lower === `${prefix}def`)?.values || new Map();
  const actions = parseAir(text);

  const elements = sections
    .filter(s => s.lower.startsWith(`${prefix} `) || (s.lower.startsWith(prefix) && s.lower !== `${prefix}def` && !s.lower.startsWith(`${prefix}def`)))
    .map(s => {
      const v = s.values;
      const type = (v.get("type") || "normal").toLowerCase();

      return {
        name: s.name,
        type,
        sprite: numbers(v.get("spriteno"), [-1, -1]),
        action: parseInt(v.get("actionno"), 10),
        start: numbers(v.get("start"), [0, 0]),
        tile: numbers(v.get("tile"), [0, 0]),
        tileSpacing: numbers(v.get("tilespacing"), [0, NaN]),
        velocity: numbers(v.get("velocity"), [0, 0]),
        window: v.has("window") ? numbers(v.get("window"), [0, 0, 0, 0]) : null,
        trans: (v.get("trans") || "").toLowerCase(),
        alpha: numbers(v.get("alpha"), [256, 0]),
        mask: (v.get("mask") ?? "1").trim() !== "0",
        layer: parseInt(v.get("layerno"), 10) === 1 ? 1 : 0,
        scale: numbers(v.get("scalestart"), [1, 1]),
        visible: !v.has("enabled") || v.get("enabled").trim() !== "0"
      };
    })
    .filter(e => e.type !== "dummy" && e.visible);

  for (const e of elements) {
    if (!Number.isFinite(e.tileSpacing[1])) e.tileSpacing[1] = e.tileSpacing[0];
    e.anim = e.type === "anim" ? actions.get(e.action) || null : null;
  }

  return {
    spr: (def.get("spr") || "").replace(/"/g, "").trim() || null,
    clearColor: numbers(def.get("bgclearcolor"), [0, 0, 0]),
    elements
  };
}

// ------------------------------------------------------------
// Renderer
// ------------------------------------------------------------

function compositeFor(trans) {
  if (trans === "add" || trans === "add1") return "lighter";
  if (trans === "sub") return "difference";
  return "source-over";
}

export class SelectScreen {
  // options: { layout, background, sprite(group, index) => Promise<{canvas, axisX, axisY, width, height, alpha}|null> }
  constructor(root, options) {
    this.root = root;
    this.layout = options.layout;
    this.background = options.background;
    this.sprite = options.sprite;
    this.tick = 0;
    this.raf = null;
    this.images = new Map();

    const [w, h] = this.layout.localcoord;

    root.innerHTML = `
      <div class="ss-stage" style="width:${w}px;height:${h}px">
        <canvas class="ss-back" width="${w}" height="${h}"></canvas>
        <div class="ss-cells"></div>
        <canvas class="ss-front" width="${w}" height="${h}"></canvas>
      </div>`;

    this.stage = root.querySelector(".ss-stage");
    this.back = root.querySelector(".ss-back").getContext("2d");
    this.front = root.querySelector(".ss-front").getContext("2d");
    this.cells = root.querySelector(".ss-cells");

    this.fit();
  }

  // Scales the stage (localcoord size) to fit the container. With
  // this.focus = { x, y, w, h } (localcoord), zooms into that area.
  fit() {
    const [w, h] = this.layout.localcoord;
    const area = this.focus || { x: 0, y: 0, w, h };
    const cw = this.root.clientWidth;
    const ch = this.root.clientHeight;
    const k = Math.min(cw / area.w, ch / area.h) || 1;

    this.stage.style.transform = `translate(${cw / 2 - (area.x + area.w / 2) * k}px, ${ch / 2 - (area.y + area.h / 2) * k}px) scale(${k})`;
  }

  async load() {
    const wanted = [];

    for (const e of this.background.elements) {
      if (e.anim) e.anim.frames.forEach(f => wanted.push([f.group, f.index]));
      else wanted.push(e.sprite);
    }

    await Promise.all(
      wanted
        .filter(([g, i]) => g >= 0 && i >= 0)
        .map(async ([g, i]) => {
          const key = `${g},${i}`;
          if (!this.images.has(key)) this.images.set(key, await this.sprite(g, i));
        })
    );
  }

  start() {
    let last = performance.now();
    let acc = 0;

    const loop = now => {
      acc += now - last;
      last = now;

      // 60 ticks per second, like the engine.
      while (acc >= 1000 / 60) {
        this.tick++;
        acc -= 1000 / 60;
      }

      if (!this.stage.isConnected) return this.stop();

      this.draw();
      this.raf = requestAnimationFrame(loop);
    };

    this.draw();
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  frameOf(e) {
    const frames = e.anim.frames;
    const total = frames.reduce((sum, f) => sum + (f.time > 0 ? f.time : 0), 0);

    if (!total || frames.some(f => f.time < 0)) {
      // Animations that end in a "hold forever" frame.
      let t = this.tick;
      for (const f of frames) {
        if (f.time < 0) return f;
        if (t < f.time) return f;
        t -= f.time;
      }
      return frames[frames.length - 1];
    }

    const loop = frames.slice(e.anim.loopStart).reduce((sum, f) => sum + f.time, 0) || total;
    const intro = total - loop;
    let t = this.tick < intro ? this.tick : intro + ((this.tick - intro) % loop);

    for (const f of frames) {
      if (t < f.time) return f;
      t -= f.time;
    }

    return frames[frames.length - 1];
  }

  draw() {
    const [w, h] = this.layout.localcoord;
    const [r, g, b] = this.background.clearColor;

    this.back.globalCompositeOperation = "source-over";
    this.back.globalAlpha = 1;
    this.back.fillStyle = `rgb(${r},${g},${b})`;
    this.back.fillRect(0, 0, w, h);
    this.front.clearRect(0, 0, w, h);

    for (const e of this.background.elements) {
      this.drawElement(e.layer === 1 ? this.front : this.back, e, w, h);
    }
  }

  drawElement(ctx, e, w, h) {
    let group = e.sprite[0];
    let index = e.sprite[1];
    let dx = 0;
    let dy = 0;
    let flipH = false;
    let flipV = false;

    if (e.anim) {
      const f = this.frameOf(e);
      if (!f || f.group < 0) return;
      group = f.group;
      index = f.index;
      dx = f.x;
      dy = f.y;
      flipH = f.flipH;
      flipV = f.flipV;
    }

    const img = this.images.get(`${group},${index}`);
    if (!img) return;

    const sw = img.width * e.scale[0];
    const sh = img.height * e.scale[1];

    // Origin: X at the screen center, Y at the top (MUGEN motifs).
    let x = w / 2 + e.start[0] + dx - img.axisX * e.scale[0] + e.velocity[0] * this.tick;
    let y = e.start[1] + dy - img.axisY * e.scale[1] + e.velocity[1] * this.tick;

    const stepX = sw + e.tileSpacing[0];
    const stepY = sh + e.tileSpacing[1];

    let countX = 1;
    let countY = 1;

    if (e.tile[0] === 1 && stepX > 0) {
      x = ((x % stepX) + stepX) % stepX - stepX;
      countX = Math.ceil((w - x) / stepX) + 1;
    } else if (e.tile[0] > 1) {
      countX = e.tile[0];
    }

    if (e.tile[1] === 1 && stepY > 0) {
      y = ((y % stepY) + stepY) % stepY - stepY;
      countY = Math.ceil((h - y) / stepY) + 1;
    } else if (e.tile[1] > 1) {
      countY = e.tile[1];
    }

    ctx.save();

    if (e.window) {
      const [x1, y1, x2, y2] = e.window;
      ctx.beginPath();
      ctx.rect(x1, y1, x2 - x1 + 1, y2 - y1 + 1);
      ctx.clip();
    }

    // 32-bit sprites (PNG with alpha) are blended by their own alpha.
    const trans = img.alpha ? "" : e.trans;
    ctx.globalCompositeOperation = compositeFor(trans);
    ctx.globalAlpha = trans === "addalpha" ? Math.min(1, e.alpha[0] / 256) : trans === "add1" ? 0.75 : 1;

    for (let iy = 0; iy < countY; iy++) {
      for (let ix = 0; ix < countX; ix++) {
        const px = x + ix * stepX;
        const py = y + iy * stepY;

        if (px > w || py > h || px + sw < 0 || py + sh < 0) continue;

        if (flipH || flipV) {
          ctx.save();
          ctx.translate(px + (flipH ? sw : 0), py + (flipV ? sh : 0));
          ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
          ctx.drawImage(img.canvas, 0, 0, sw, sh);
          ctx.restore();
        } else {
          ctx.drawImage(img.canvas, px, py, sw, sh);
        }
      }
    }

    ctx.restore();
  }

  // Cell markup (built by the editor with cellGeometry/cellStyle).
  setCells(html) {
    this.cells.innerHTML = html;
  }
}

// Style of the element placed at a cell anchor (position + transforms).
export function cellStyle(geometry, extra = {}) {
  const transforms = [];

  if (geometry.xangle || geometry.yangle) {
    const focal = geometry.projection === "perspective" && geometry.focallength ? geometry.focallength * 20 : 1000;
    transforms.push(`perspective(${focal}px)`);
    if (geometry.xangle) transforms.push(`rotateX(${geometry.xangle}deg)`);
    if (geometry.yangle) transforms.push(`rotateY(${geometry.yangle}deg)`);
  }

  if (geometry.angle) transforms.push(`rotate(${-geometry.angle}deg)`);

  // Vertical foreshortening of tilted rows (see the editor).
  if (extra.scaleY && extra.scaleY !== 1) transforms.push(`scaleY(${extra.scaleY})`);

  const origin = extra.origin ? `transform-origin:${extra.origin[0]}px ${extra.origin[1]}px;` : "";

  return `left:${geometry.x}px;top:${geometry.y}px;${transforms.length ? `transform:${transforms.join(" ")};${origin}` : ""}`;
}
