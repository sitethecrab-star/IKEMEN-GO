// ============================================================
// MUGEN / IKEMEN GO sprite support
// ------------------------------------------------------------
// SFF v1 (PCX) and SFF v2 (raw, RLE8, RLE5, LZ5, PNG8/24/32),
// ACT palettes and AIR animations.
//
// Pure JavaScript, no DOM dependency: works in the Tauri webview
// and in Node (used for tests).
// ============================================================

const textDecoder = new TextDecoder("latin1");

// ------------------------------------------------------------
// Inflate (zlib) — used by PNG sprites
// ------------------------------------------------------------

export async function inflate(bytes) {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ------------------------------------------------------------
// Palettes
// ------------------------------------------------------------

// MUGEN .act files store 256 RGB colors in reverse order.
export function parseAct(bytes) {
  if (!bytes || bytes.length < 768) {
    return null;
  }

  const pal = new Uint8Array(1024);

  for (let i = 0; i < 256; i++) {
    const src = (255 - i) * 3;
    pal[i * 4] = bytes[src];
    pal[i * 4 + 1] = bytes[src + 1];
    pal[i * 4 + 2] = bytes[src + 2];
    pal[i * 4 + 3] = i === 0 ? 0 : 255;
  }

  return pal;
}

function rgbPalette(bytes, offset, count, stride) {
  const pal = new Uint8Array(1024);

  for (let i = 0; i < count && i < 256; i++) {
    const src = offset + i * stride;
    pal[i * 4] = bytes[src];
    pal[i * 4 + 1] = bytes[src + 1];
    pal[i * 4 + 2] = bytes[src + 2];
    pal[i * 4 + 3] = i === 0 ? 0 : 255;
  }

  return pal;
}

// ------------------------------------------------------------
// SFF container
// ------------------------------------------------------------

export function parseSff(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const signature = textDecoder.decode(bytes.subarray(0, 11));

  if (signature !== "ElecbyteSpr") {
    throw new Error("Invalid SFF file.");
  }

  const major = bytes[15];

  if (major === 1) {
    return parseSffV1(bytes, view);
  }

  if (major === 2) {
    return parseSffV2(bytes, view);
  }

  throw new Error(`Unsupported SFF version: ${major}.`);
}

function parseSffV1(bytes, view) {
  const count = view.getUint32(20, true);
  let offset = view.getUint32(24, true);

  const sprites = [];
  const byKey = new Map();

  for (let i = 0; i < count && offset > 0 && offset + 32 <= bytes.length; i++) {
    const next = view.getUint32(offset, true);
    const length = view.getUint32(offset + 4, true);

    const sprite = {
      version: 1,
      axisX: view.getInt16(offset + 8, true),
      axisY: view.getInt16(offset + 10, true),
      group: view.getUint16(offset + 12, true),
      index: view.getUint16(offset + 14, true),
      linked: view.getUint16(offset + 16, true),
      samePalette: bytes[offset + 18] !== 0,
      dataOffset: offset + 32,
      dataLength: length
    };

    sprites.push(sprite);

    const key = spriteKey(sprite.group, sprite.index);

    if (!byKey.has(key)) {
      byKey.set(key, i);
    }

    if (next === 0 || next <= offset) {
      break;
    }

    offset = next;
  }

  return { version: 1, bytes, view, sprites, byKey, palettes: [], cache: new Map() };
}

function parseSffV2(bytes, view) {
  const spriteOffset = view.getUint32(36, true);
  const spriteCount = view.getUint32(40, true);
  const paletteOffset = view.getUint32(44, true);
  const paletteCount = view.getUint32(48, true);
  const ldataOffset = view.getUint32(52, true);
  const tdataOffset = view.getUint32(60, true);

  const palettes = [];

  for (let i = 0; i < paletteCount; i++) {
    const p = paletteOffset + i * 16;
    const colors = view.getUint16(p + 4, true);
    const linked = view.getUint16(p + 6, true);
    const offset = view.getUint32(p + 8, true);
    const length = view.getUint32(p + 12, true);

    if (length === 0 && linked < palettes.length) {
      palettes.push(palettes[linked]);
      continue;
    }

    palettes.push(rgbPalette(bytes, ldataOffset + offset, colors, 4));
  }

  const sprites = [];
  const byKey = new Map();

  for (let i = 0; i < spriteCount; i++) {
    const s = spriteOffset + i * 28;
    const flags = view.getUint16(s + 26, true);

    const sprite = {
      version: 2,
      group: view.getUint16(s, true),
      index: view.getUint16(s + 2, true),
      width: view.getUint16(s + 4, true),
      height: view.getUint16(s + 6, true),
      axisX: view.getInt16(s + 8, true),
      axisY: view.getInt16(s + 10, true),
      linked: view.getUint16(s + 12, true),
      format: bytes[s + 14],
      depth: bytes[s + 15],
      dataOffset: view.getUint32(s + 16, true) + (flags & 1 ? tdataOffset : ldataOffset),
      dataLength: view.getUint32(s + 20, true),
      palette: view.getUint16(s + 24, true)
    };

    sprites.push(sprite);

    const key = spriteKey(sprite.group, sprite.index);

    if (!byKey.has(key)) {
      byKey.set(key, i);
    }
  }

  return { version: 2, bytes, view, sprites, byKey, palettes, cache: new Map() };
}

function spriteKey(group, index) {
  return group * 65536 + index;
}

// ------------------------------------------------------------
// Sprite decoding → { width, height, axisX, axisY, rgba }
// ------------------------------------------------------------

export async function getSprite(sff, group, index, options = {}) {
  const key = spriteKey(group, index);
  const cacheKey = `${key}:${options.paletteId ?? ""}`;

  if (sff.cache.has(cacheKey)) {
    return sff.cache.get(cacheKey);
  }

  const position = sff.byKey.get(key);

  if (position === undefined) {
    sff.cache.set(cacheKey, null);
    return null;
  }

  const promise = decodeAt(sff, position, options, 0).catch(() => null);

  sff.cache.set(cacheKey, promise);

  return promise;
}

async function decodeAt(sff, position, options, depth) {
  const sprite = sff.sprites[position];

  if (!sprite || depth > 8) {
    return null;
  }

  // Linked sprites share image data with another sprite but keep
  // their own axis.
  if (sprite.dataLength === 0 && sprite.linked !== position) {
    const target = await decodeAt(sff, sprite.linked, options, depth + 1);

    return target && { ...target, axisX: sprite.axisX, axisY: sprite.axisY };
  }

  const image = sff.version === 1
    ? decodeV1(sff, position, options)
    : await decodeV2(sff, sprite, options);

  return image && { ...image, axisX: sprite.axisX, axisY: sprite.axisY };
}

// ---------- SFF v1 (PCX) ----------

function decodeV1(sff, position, options) {
  const sprite = sff.sprites[position];
  const pcx = sff.bytes.subarray(sprite.dataOffset, sprite.dataOffset + sprite.dataLength);

  // Character palette (ACT) replaces the shared palette. The portrait
  // group 9000 keeps its own colors, as in MUGEN.
  const palette = options.palette && sprite.group !== 9000
    ? options.palette
    : v1Palette(sff, position);

  return decodePcx(pcx, palette);
}

export function decodePcx(pcx, palette) {
  if (pcx.length < 128 || pcx[3] !== 8) {
    return null;
  }

  const pv = new DataView(pcx.buffer, pcx.byteOffset, pcx.byteLength);
  const width = pv.getUint16(8, true) - pv.getUint16(4, true) + 1;
  const height = pv.getUint16(10, true) - pv.getUint16(6, true) + 1;
  const planes = pcx[65];
  const bytesPerLine = pv.getUint16(66, true);

  if (width <= 0 || height <= 0 || planes !== 1) {
    return null;
  }

  const indices = new Uint8Array(width * height);
  let src = 128;

  for (let y = 0; y < height; y++) {
    let x = 0;

    while (x < bytesPerLine && src < pcx.length) {
      let value = pcx[src++];
      let run = 1;

      if ((value & 0xc0) === 0xc0) {
        run = value & 0x3f;
        value = pcx[src++];
      }

      for (; run > 0 && x < bytesPerLine; run--, x++) {
        if (x < width) {
          indices[y * width + x] = value;
        }
      }
    }
  }

  return indexedToRgba(indices, width, height, palette);
}

function v1Palette(sff, position) {
  for (let i = position; i >= 0; i--) {
    const s = sff.sprites[i];

    if (i !== position && s.dataLength === 0) {
      continue;
    }

    if (s.samePalette && i > 0) {
      continue;
    }

    const end = s.dataOffset + s.dataLength;

    if (s.dataLength > 769 && sff.bytes[end - 769] === 0x0c) {
      return rgbPalette(sff.bytes, end - 768, 256, 3);
    }
  }

  return greyPalette();
}

function greyPalette() {
  const pal = new Uint8Array(1024);

  for (let i = 0; i < 256; i++) {
    pal.fill(i, i * 4, i * 4 + 3);
    pal[i * 4 + 3] = i === 0 ? 0 : 255;
  }

  return pal;
}

// ---------- SFF v2 ----------

async function decodeV2(sff, sprite, options) {
  const raw = sff.bytes.subarray(sprite.dataOffset, sprite.dataOffset + sprite.dataLength);
  const palette = sff.palettes[sprite.palette] || options.palette || greyPalette();

  return decodeV2Data(sprite.format, sprite.width, sprite.height, raw, palette);
}

export async function decodeV2Data(format, width, height, raw, palette) {
  const size = width * height;

  switch (format) {
    case 0:
      return indexedToRgba(raw.subarray(0, size), width, height, palette);

    case 2:
      return indexedToRgba(rle8(raw.subarray(4), size), width, height, palette);

    case 3:
      return indexedToRgba(rle5(raw.subarray(4), size), width, height, palette);

    case 4:
      return indexedToRgba(lz5(raw.subarray(4), size), width, height, palette);

    case 10:
    case 11:
    case 12:
      return decodePng(raw.subarray(4), format === 10 ? palette : null);

    default:
      return null;
  }
}

export function rle8(src, size) {
  const out = new Uint8Array(size);
  let i = 0;
  let j = 0;

  while (j < size && i < src.length) {
    const d = src[i++];

    if ((d & 0xc0) === 0x40) {
      const color = src[i++];

      for (let n = d & 0x3f; n > 0 && j < size; n--) {
        out[j++] = color;
      }
    } else {
      out[j++] = d;
    }
  }

  return out;
}

export function rle5(src, size) {
  const out = new Uint8Array(size);
  let i = 0;
  let j = 0;

  while (j < size && i < src.length) {
    let runLength = src[i++];
    let dataLength = src[i] & 0x7f;
    let color = 0;

    if (src[i] & 0x80) {
      i++;
      color = src[i];
    }

    i++;

    for (;;) {
      if (j < size) {
        out[j++] = color;
      }

      runLength--;

      if (runLength < 0) {
        dataLength--;

        if (dataLength < 0 || i >= src.length) {
          break;
        }

        color = src[i] & 0x1f;
        runLength = src[i] >> 5;
        i++;
      }
    }
  }

  return out;
}

export function lz5(src, size) {
  const out = new Uint8Array(size);

  if (!src.length) {
    return out;
  }

  const last = src.length - 1;
  let i = 0;
  let j = 0;
  let control = src[i];
  let controlBit = 0;
  let recycled = 0;
  let recycledBits = 0;

  if (i < last) i++;

  while (j < size) {
    let d = src[i];

    if (i < last) i++;

    if (control & (1 << controlBit)) {
      // LZ packet: copy from already decoded output.
      let n;

      if ((d & 0x3f) === 0) {
        d = ((d << 2) | src[i]) + 1;
        if (i < last) i++;
        n = src[i] + 2;
        if (i < last) i++;
      } else {
        recycled |= (d & 0xc0) >> recycledBits;
        recycledBits += 2;
        n = d & 0x3f;

        if (recycledBits < 8) {
          d = src[i] + 1;
          if (i < last) i++;
        } else {
          d = recycled + 1;
          recycled = 0;
          recycledBits = 0;
        }
      }

      for (;;) {
        if (j < size) {
          out[j] = j - d >= 0 ? out[j - d] : 0;
          j++;
        }

        n--;

        if (n < 0) {
          break;
        }
      }
    } else {
      // RLE packet.
      let n;

      if ((d & 0xe0) === 0) {
        n = src[i] + 8;
        if (i < last) i++;
      } else {
        n = d >> 5;
        d &= 0x1f;
      }

      for (; n > 0 && j < size; n--) {
        out[j++] = d;
      }
    }

    controlBit++;

    if (controlBit >= 8) {
      control = src[i];
      controlBit = 0;
      if (i < last) i++;
    }
  }

  return out;
}

function indexedToRgba(indices, width, height, palette) {
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let p = 0, q = 0; p < indices.length; p++, q += 4) {
    const c = indices[p] * 4;

    if (indices[p] === 0) {
      continue;
    }

    rgba[q] = palette[c];
    rgba[q + 1] = palette[c + 1];
    rgba[q + 2] = palette[c + 2];
    rgba[q + 3] = 255;
  }

  return { width, height, rgba };
}

// ---------- PNG ----------

export async function decodePng(png, sffPalette) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);

  if (png.length < 33 || view.getUint32(0) !== 0x89504e47) {
    return null;
  }

  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 0;
  let interlace = 0;
  let plte = null;
  let trns = null;
  const idat = [];
  let offset = 8;

  while (offset + 8 <= png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    const data = png.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") {
      plte = data;
    } else if (type === "tRNS") {
      trns = data;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset += 12 + length;
  }

  if (!width || !height || interlace !== 0 || bitDepth > 8) {
    return null;
  }

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];

  if (!channels) {
    return null;
  }

  const compressed = new Uint8Array(idat.reduce((sum, part) => sum + part.length, 0));
  let pos = 0;

  for (const part of idat) {
    compressed.set(part, pos);
    pos += part.length;
  }

  const data = await inflate(compressed);
  const bitsPerPixel = channels * bitDepth;
  const stride = Math.ceil((width * bitsPerPixel) / 8);
  const bpp = Math.max(1, bitsPerPixel >> 3);
  const pixels = unfilter(data, stride, height, bpp);

  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    const row = y * stride;

    for (let x = 0; x < width; x++) {
      const q = (y * width + x) * 4;

      if (colorType === 3) {
        const idx = bitDepth === 8
          ? pixels[row + x]
          : (pixels[row + ((x * bitDepth) >> 3)] >> (8 - bitDepth - ((x * bitDepth) & 7))) & ((1 << bitDepth) - 1);

        if (sffPalette) {
          // SFF PNG8: palette comes from the SFF, index 0 is transparent.
          if (idx === 0) continue;
          rgba[q] = sffPalette[idx * 4];
          rgba[q + 1] = sffPalette[idx * 4 + 1];
          rgba[q + 2] = sffPalette[idx * 4 + 2];
          rgba[q + 3] = 255;
        } else if (plte) {
          rgba[q] = plte[idx * 3];
          rgba[q + 1] = plte[idx * 3 + 1];
          rgba[q + 2] = plte[idx * 3 + 2];
          rgba[q + 3] = trns && idx < trns.length ? trns[idx] : 255;
        }
      } else {
        const p = row + x * channels;

        if (colorType === 0 || colorType === 4) {
          rgba[q] = rgba[q + 1] = rgba[q + 2] = pixels[p];
          rgba[q + 3] = colorType === 4 ? pixels[p + 1] : 255;
        } else {
          rgba[q] = pixels[p];
          rgba[q + 1] = pixels[p + 1];
          rgba[q + 2] = pixels[p + 2];
          rgba[q + 3] = colorType === 6 ? pixels[p + 3] : 255;
        }
      }
    }
  }

  return { width, height, rgba };
}

function unfilter(data, stride, height, bpp) {
  const out = new Uint8Array(stride * height);

  for (let y = 0; y < height; y++) {
    const filter = data[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const prev = dst - stride;

    for (let x = 0; x < stride; x++) {
      const raw = data[src + x];
      const a = x >= bpp ? out[dst + x - bpp] : 0;
      const b = y > 0 ? out[prev + x] : 0;
      const c = x >= bpp && y > 0 ? out[prev + x - bpp] : 0;
      let value;

      switch (filter) {
        case 1: value = raw + a; break;
        case 2: value = raw + b; break;
        case 3: value = raw + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          value = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: value = raw;
      }

      out[dst + x] = value & 0xff;
    }
  }

  return out;
}

// ------------------------------------------------------------
// Single sprite extracted by the Launcher (Rust "read_sprite")
// ------------------------------------------------------------

function base64Bytes(text) {
  const binary = atob(text || "");
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export async function decodeRecord(record) {
  if (!record) return null;

  const data = base64Bytes(record.data);
  const paletteBytes = base64Bytes(record.palette);
  let image;

  if (record.version === 1) {
    const palette = paletteBytes.length >= 768 ? rgbPalette(paletteBytes, 0, 256, 3) : greyPalette();
    image = decodePcx(data, palette);
  } else {
    const palette = paletteBytes.length ? rgbPalette(paletteBytes, 0, paletteBytes.length >> 2, 4) : greyPalette();
    image = await decodeV2Data(record.format, record.width, record.height, data, palette);
  }

  return image && { ...image, axisX: record.axis_x, axisY: record.axis_y };
}

// ------------------------------------------------------------
// AIR animations
// ------------------------------------------------------------

export function parseAir(text) {
  const actions = new Map();
  let current = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split(";")[0].trim();

    if (!line) {
      continue;
    }

    const header = line.match(/^\[\s*begin\s+action\s+(-?\d+)\s*\]/i);

    if (header) {
      current = { number: Number(header[1]), frames: [], loopStart: 0 };

      if (!actions.has(current.number)) {
        actions.set(current.number, current);
      }

      continue;
    }

    if (line.startsWith("[")) {
      current = null;
      continue;
    }

    if (!current) {
      continue;
    }

    if (/^loopstart/i.test(line)) {
      current.loopStart = current.frames.length;
      continue;
    }

    if (/^(clsn|interpolate)/i.test(line)) {
      continue;
    }

    const parts = line.split(",").map(part => part.trim());

    if (parts.length < 5 || !/^-?\d+$/.test(parts[0])) {
      continue;
    }

    const flip = (parts[5] || "").toUpperCase();

    current.frames.push({
      group: Number(parts[0]),
      index: Number(parts[1]),
      x: Number(parts[2]) || 0,
      y: Number(parts[3]) || 0,
      time: Number(parts[4]),
      flipH: flip.includes("H"),
      flipV: flip.includes("V")
    });
  }

  for (const [number, action] of actions) {
    if (!action.frames.length) {
      actions.delete(number);
    }
  }

  return actions;
}

// ------------------------------------------------------------
// Load an action: decode every frame and compute a stable box
// ------------------------------------------------------------

export async function loadAction(sff, actions, number, options = {}) {
  const action = actions.get(number);

  if (!action) {
    return null;
  }

  const frames = [];
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const frame of action.frames) {
    const image = frame.group < 0 ? null : await getSprite(sff, frame.group, frame.index, options);

    if (image) {
      // Position relative to the character's ground point (0,0).
      const x = frame.flipH
        ? frame.x + image.axisX - image.width
        : frame.x - image.axisX;
      const y = frame.flipV
        ? frame.y + image.axisY - image.height
        : frame.y - image.axisY;

      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + image.width);
      bottom = Math.max(bottom, y + image.height);

      frames.push({ ...frame, image, drawX: x, drawY: y });
    } else {
      frames.push({ ...frame, image: null });
    }
  }

  if (left === Infinity) {
    return null;
  }

  return {
    number,
    loopStart: Math.min(action.loopStart, frames.length - 1),
    frames,
    box: { left, top, right: Math.max(right, 0), bottom: Math.max(bottom, 0) }
  };
}
