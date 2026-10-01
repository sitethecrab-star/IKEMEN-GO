// ============================================================
// SFF single-sprite extraction
// ------------------------------------------------------------
// Reads only the headers and the bytes of ONE sprite (plus its
// palette) from an SFF v1 or v2 file, without loading the whole
// file. Used for character portraits (e.g. 9000,0) and screenpack
// cell sprites. Decoding happens in the UI (sprites.js).
//
// Standard library only, so it can be unit-tested without Tauri.
// ============================================================

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

#[derive(Debug, Clone)]
pub struct SpriteRecord {
    pub version: u8,
    pub width: u16,
    pub height: u16,
    pub axis_x: i16,
    pub axis_y: i16,
    /// SFF v2 format (0 raw, 2 RLE8, 3 RLE5, 4 LZ5, 10-12 PNG).
    /// SFF v1 sprites are always PCX (255 here).
    pub format: u8,
    /// v1: the PCX file. v2: the sprite data exactly as stored.
    pub data: Vec<u8>,
    /// v1: 768 bytes RGB. v2: colors * 4 bytes RGBA.
    pub palette: Vec<u8>,
}

fn read_at<R: Read + Seek>(r: &mut R, offset: u64, len: usize) -> Option<Vec<u8>> {
    if len > 64 * 1024 * 1024 {
        return None;
    }

    let mut buf = vec![0u8; len];
    r.seek(SeekFrom::Start(offset)).ok()?;
    r.read_exact(&mut buf).ok()?;
    Some(buf)
}

fn u16_at(b: &[u8], o: usize) -> u16 {
    u16::from_le_bytes([b[o], b[o + 1]])
}

fn i16_at(b: &[u8], o: usize) -> i16 {
    i16::from_le_bytes([b[o], b[o + 1]])
}

fn u32_at(b: &[u8], o: usize) -> u32 {
    u32::from_le_bytes([b[o], b[o + 1], b[o + 2], b[o + 3]])
}

pub fn extract_file(path: &Path, group: u16, index: u16) -> Option<SpriteRecord> {
    let mut file = File::open(path).ok()?;
    extract(&mut file, group, index)
}

pub fn extract<R: Read + Seek>(r: &mut R, group: u16, index: u16) -> Option<SpriteRecord> {
    let header = read_at(r, 0, 68)?;

    if &header[0..11] != b"ElecbyteSpr" {
        return None;
    }

    match header[15] {
        1 => extract_v1(r, &header, group, index),
        2 => extract_v2(r, &header, group, index),
        _ => None,
    }
}

// ---------- SFF v1 ----------

struct V1Entry {
    offset: u64,
    length: u32,
    axis_x: i16,
    axis_y: i16,
    group: u16,
    index: u16,
    linked: u16,
    same_palette: bool,
}

fn extract_v1<R: Read + Seek>(r: &mut R, header: &[u8], group: u16, index: u16) -> Option<SpriteRecord> {
    let count = u32_at(header, 20) as usize;
    let mut offset = u32_at(header, 24) as u64;
    let mut entries: Vec<V1Entry> = Vec::new();
    let mut found: Option<usize> = None;

    // Walk the subfile chain until the sprite is found.
    while entries.len() < count && offset > 0 {
        let h = read_at(r, offset, 32)?;
        let next = u32_at(&h, 0) as u64;

        entries.push(V1Entry {
            offset: offset + 32,
            length: u32_at(&h, 4),
            axis_x: i16_at(&h, 8),
            axis_y: i16_at(&h, 10),
            group: u16_at(&h, 12),
            index: u16_at(&h, 14),
            linked: u16_at(&h, 16),
            same_palette: h[18] != 0,
        });

        let e = entries.last().unwrap();

        if e.group == group && e.index == index {
            found = Some(entries.len() - 1);
            break;
        }

        if next == 0 || next <= offset {
            break;
        }

        offset = next;
    }

    let position = found?;
    let sprite = &entries[position];

    // Linked sprite: image data comes from an earlier sprite.
    let mut data_pos = position;
    let mut guard = 0;

    while entries[data_pos].length == 0 && guard < 8 {
        let target = entries[data_pos].linked as usize;

        if target >= entries.len() || target == data_pos {
            return None;
        }

        data_pos = target;
        guard += 1;
    }

    let source = &entries[data_pos];
    let data = read_at(r, source.offset, source.length as usize)?;

    // Palette: the sprite's own PCX palette, or the last own palette
    // found walking back (shared palette), like MUGEN.
    let mut palette = None;

    for i in (0..=data_pos).rev() {
        let e = &entries[i];

        if (i != data_pos && e.length == 0) || (e.same_palette && i > 0) {
            continue;
        }

        if e.length > 769 {
            let tail = read_at(r, e.offset + e.length as u64 - 769, 769)?;

            if tail[0] == 0x0c {
                palette = Some(tail[1..].to_vec());
                break;
            }
        }
    }

    Some(SpriteRecord {
        version: 1,
        width: 0,
        height: 0,
        axis_x: sprite.axis_x,
        axis_y: sprite.axis_y,
        format: 255,
        data,
        palette: palette.unwrap_or_default(),
    })
}

// ---------- SFF v2 ----------

fn extract_v2<R: Read + Seek>(r: &mut R, header: &[u8], group: u16, index: u16) -> Option<SpriteRecord> {
    let sprite_offset = u32_at(header, 36) as u64;
    let sprite_count = u32_at(header, 40) as usize;
    let palette_offset = u32_at(header, 44) as u64;
    let palette_count = u32_at(header, 48) as usize;
    let ldata = u32_at(header, 52) as u64;
    let tdata = u32_at(header, 60) as u64;

    if sprite_count > 1_000_000 || palette_count > 100_000 {
        return None;
    }

    let nodes = read_at(r, sprite_offset, sprite_count * 28)?;
    let node = |i: usize| &nodes[i * 28..i * 28 + 28];

    let position = (0..sprite_count).find(|&i| {
        let n = node(i);
        u16_at(n, 0) == group && u16_at(n, 2) == index
    })?;

    let own = node(position);
    let mut data_pos = position;
    let mut guard = 0;

    while u32_at(node(data_pos), 20) == 0 && guard < 8 {
        let target = u16_at(node(data_pos), 12) as usize;

        if target >= sprite_count || target == data_pos {
            return None;
        }

        data_pos = target;
        guard += 1;
    }

    let n = node(data_pos);
    let flags = u16_at(n, 26);
    let base = if flags & 1 != 0 { tdata } else { ldata };
    let data = read_at(r, base + u32_at(n, 16) as u64, u32_at(n, 20) as usize)?;

    // Palette node (following palette links).
    let mut pal_index = u16_at(n, 24) as usize;
    let mut palette = Vec::new();

    for _ in 0..8 {
        if pal_index >= palette_count {
            break;
        }

        let p = read_at(r, palette_offset + pal_index as u64 * 16, 16)?;
        let colors = u16_at(&p, 4) as usize;
        let linked = u16_at(&p, 6) as usize;
        let offset = u32_at(&p, 8) as u64;
        let length = u32_at(&p, 12) as usize;

        if length == 0 && linked != pal_index {
            pal_index = linked;
            continue;
        }

        palette = read_at(r, ldata + offset, (colors * 4).min(length.max(colors * 4)))?;
        break;
    }

    Some(SpriteRecord {
        version: 2,
        width: u16_at(n, 4),
        height: u16_at(n, 6),
        axis_x: i16_at(own, 8),
        axis_y: i16_at(own, 10),
        format: n[14],
        data,
        palette,
    })
}

// ============================================================
// Base64 (for sending the record to the UI)
// ============================================================

pub fn encode_base64(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);

    for chunk in bytes.chunks(3) {
        let b = [chunk[0], *chunk.get(1).unwrap_or(&0), *chunk.get(2).unwrap_or(&0)];
        let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | b[2] as u32;

        out.push(TABLE[(n >> 18) as usize & 63] as char);
        out.push(TABLE[(n >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 { TABLE[(n >> 6) as usize & 63] as char } else { '=' });
        out.push(if chunk.len() > 2 { TABLE[n as usize & 63] as char } else { '=' });
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64_roundtrip() {
        assert_eq!(encode_base64(b"Hello"), "SGVsbG8=");
        assert_eq!(encode_base64(b"Hi"), "SGk=");
        assert_eq!(encode_base64(b""), "");
    }
}
