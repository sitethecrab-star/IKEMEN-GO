// ============================================================
// IKEMEN GO Launcher — core logic
// ------------------------------------------------------------
// Standard library only, so it can be unit-tested without Tauri.
//
// Paths exchanged with the UI are "ids": paths relative to the
// engine root, with forward slashes, e.g.
//   chars/kfm/kfm.def
//   IKEMEN-GO-Launcher/Characters/Akatsuki/Akatsuki.def
// ============================================================

use std::fs;
use std::path::{Component, Path, PathBuf};

pub const LAUNCH_SYSTEM: &str = "system.launcher.def";
pub const LAUNCH_SELECT: &str = "select.launcher.def";

// ============================================================
// Layout
// ============================================================

#[derive(Debug, Clone)]
pub struct Layout {
    pub engine_root: PathBuf,
    pub launcher_dir: PathBuf,
    pub engine_exe: PathBuf,
}

impl Layout {
    pub fn launcher_name(&self) -> String {
        self.launcher_dir
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "IKEMEN-GO-Launcher".into())
    }

    pub fn characters_dir(&self) -> PathBuf {
        self.launcher_dir.join("Characters")
    }

    pub fn stages_dir(&self) -> PathBuf {
        self.launcher_dir.join("Stages")
    }

    pub fn lifebars_dir(&self) -> PathBuf {
        self.launcher_dir.join("Lifebars")
    }

    pub fn profiles_dir(&self) -> PathBuf {
        self.launcher_dir.join("Profiles")
    }

    pub fn screenpacks_dir(&self) -> PathBuf {
        self.launcher_dir.join("Screenpacks")
    }

    pub fn previews_dir(&self) -> PathBuf {
        self.launcher_dir.join("Previews")
    }

    /// Creates the library folders so the user knows where to put things.
    pub fn ensure_folders(&self) {
        for dir in [
            self.characters_dir(),
            self.stages_dir(),
            self.lifebars_dir(),
            self.screenpacks_dir(),
            self.profiles_dir(),
            self.previews_dir(),
        ] {
            let _ = fs::create_dir_all(dir);
        }
    }

    pub fn id_of(&self, path: &Path) -> Option<String> {
        path.strip_prefix(&self.engine_root)
            .ok()
            .map(|rel| rel.to_string_lossy().replace('\\', "/"))
    }

    /// Resolves an id to an absolute path, refusing anything outside
    /// the engine root.
    pub fn resolve_id(&self, id: &str) -> Result<PathBuf, String> {
        let rel = Path::new(id.trim());

        if id.trim().is_empty() || rel.is_absolute() {
            return Err(format!("Invalid path: {}", id));
        }

        for component in rel.components() {
            match component {
                Component::Normal(_) | Component::CurDir => {}
                _ => return Err(format!("Invalid path: {}", id)),
            }
        }

        Ok(self.engine_root.join(rel))
    }
}

fn find_engine_exe(dir: &Path) -> Option<PathBuf> {
    let entries = fs::read_dir(dir).ok()?;
    let mut fallback = None;

    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_lowercase();

        if !entry.path().is_file() || !name.ends_with(".exe") {
            continue;
        }

        if name == "ikemen_go.exe" {
            return Some(entry.path());
        }

        // Other IKEMEN builds (e.g. Ikemen_GO_x64.exe), but never the
        // Launcher itself (ikemen_go_launcher.exe).
        if name.starts_with("ikemen") && !name.contains("launcher") && fallback.is_none() {
            fallback = Some(entry.path());
        }
    }

    fallback
}

/// The Launcher lives inside the engine folder. Walks up from the
/// Launcher executable until a folder containing Ikemen_GO.exe is found.
/// Works for release builds (IKEMEN-GO-Launcher/launcher.exe) and for
/// dev builds (IKEMEN-GO-Launcher/src-tauri/target/debug/...).
pub fn detect_layout(start: &Path) -> Result<Layout, String> {
    let mut previous: Option<PathBuf> = None;
    let mut current = Some(start.to_path_buf());

    while let Some(dir) = current {
        if let Some(exe) = find_engine_exe(&dir) {
            let launcher_dir = match previous {
                Some(child) => child,
                None => dir.join("IKEMEN-GO-Launcher"),
            };

            return Ok(Layout {
                engine_root: dir,
                launcher_dir,
                engine_exe: exe,
            });
        }

        previous = Some(dir.clone());
        current = dir.parent().map(Path::to_path_buf);
    }

    // Opened straight from inside the .zip: Windows runs it from a
    // temporary folder.
    let lower = start.to_string_lossy().to_lowercase();
    if lower.contains(".zip") || lower.contains("\\appdata\\local\\temp\\") {
        return Err(
            "The Launcher is running from inside the .zip file. Extract the \"IKEMEN-GO-Launcher\" folder into your IKEMEN GO folder (next to Ikemen_GO.exe) and open it from there."
                .into(),
        );
    }

    Err(
        "IKEMEN GO not found. Put the Launcher folder inside the IKEMEN GO folder (next to Ikemen_GO.exe)."
            .into(),
    )
}

// ============================================================
// Text files (UTF-8 or ANSI/Latin-1)
// ============================================================

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Encoding {
    Utf8,
    Latin1,
}

pub fn decode_text(bytes: &[u8]) -> (String, Encoding) {
    let bytes = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(bytes);

    match std::str::from_utf8(bytes) {
        Ok(text) => (text.to_string(), Encoding::Utf8),
        Err(_) => (bytes.iter().map(|&b| b as char).collect(), Encoding::Latin1),
    }
}

pub fn encode_text(text: &str, encoding: Encoding) -> Vec<u8> {
    match encoding {
        Encoding::Utf8 => text.as_bytes().to_vec(),
        Encoding::Latin1 => text
            .chars()
            .map(|c| if (c as u32) < 256 { c as u8 } else { b'?' })
            .collect(),
    }
}

pub fn read_text(path: &Path) -> Option<(String, Encoding)> {
    fs::read(path).ok().map(|bytes| decode_text(&bytes))
}

// ============================================================
// DEF / INI parsing
// ============================================================

fn strip_comment(line: &str) -> &str {
    line.split(';').next().unwrap_or("").trim()
}

fn section_name(line: &str) -> Option<String> {
    let line = strip_comment(line);

    if line.starts_with('[') {
        let end = line.find(']')?;
        return Some(line[1..end].trim().to_lowercase());
    }

    None
}

fn unquote(value: &str) -> String {
    value.trim().trim_matches('"').trim().to_string()
}

pub fn def_value(text: &str, section: &str, key: &str) -> Option<String> {
    let mut current = String::new();

    for raw in text.lines() {
        if let Some(name) = section_name(raw) {
            current = name;
            continue;
        }

        if !current.eq_ignore_ascii_case(section) {
            continue;
        }

        let line = strip_comment(raw);

        if let Some((left, right)) = line.split_once('=') {
            if left.trim().eq_ignore_ascii_case(key) {
                let value = unquote(right);
                return if value.is_empty() { None } else { Some(value) };
            }
        }
    }

    None
}

/// Every "key = value" of a section, in file order (e.g. the [Info] of a
/// character, shown in the preview panel).
pub fn section_pairs(text: &str, section: &str) -> Vec<(String, String)> {
    let mut current = String::new();
    let mut pairs = Vec::new();

    for raw in text.lines() {
        if let Some(name) = section_name(raw) {
            current = name;
            continue;
        }

        if !current.eq_ignore_ascii_case(section) {
            continue;
        }

        if let Some((left, right)) = strip_comment(raw).split_once('=') {
            let key = left.trim();

            if !key.is_empty() {
                pairs.push((key.to_string(), unquote(right)));
            }
        }
    }

    pairs
}

pub fn has_section(text: &str, section: &str) -> bool {
    text.lines()
        .filter_map(section_name)
        .any(|name| name.eq_ignore_ascii_case(section))
}

// ============================================================
// Directory walking
// ============================================================

fn walk(dir: &Path, depth: usize, max_depth: usize, out: &mut Vec<PathBuf>) {
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    let mut items: Vec<_> = entries.flatten().collect();
    items.sort_by_key(|e| e.file_name().to_string_lossy().to_lowercase());

    for entry in items {
        let path = entry.path();
        let file_type = match entry.file_type() {
            Ok(t) => t,
            Err(_) => continue,
        };

        if file_type.is_symlink() {
            continue;
        }

        if file_type.is_dir() {
            let name = entry.file_name().to_string_lossy().to_lowercase();

            if depth < max_depth && !matches!(name.as_str(), "node_modules" | "target" | ".git") {
                walk(&path, depth + 1, max_depth, out);
            }
        } else if file_type.is_file()
            && path.extension().map(|e| e.eq_ignore_ascii_case("def")).unwrap_or(false)
        {
            out.push(path);
        }
    }
}

/// Parsed-result cache for library scans, keyed by file path and
/// validated by modification time + size: "Refresh library" only reads
/// the .def files that changed.
type ScanCache<T> = std::sync::Mutex<std::collections::HashMap<PathBuf, (Option<std::time::SystemTime>, u64, Option<T>)>>;

/// Parses many .def files in parallel (one thread per CPU core, up to 8),
/// reusing cached results for unchanged files. Order is preserved.
fn parse_defs<T, F>(paths: Vec<PathBuf>, cache: &ScanCache<T>, parse: F) -> Vec<T>
where
    T: Clone + Send,
    F: Fn(&Path, &str) -> Option<T> + Sync,
{
    let work = |path: &PathBuf| -> Option<T> {
        let meta = fs::metadata(path).ok()?;
        let key = (meta.modified().ok(), meta.len());

        if let Ok(cache) = cache.lock() {
            if let Some((modified, len, value)) = cache.get(path) {
                if (*modified, *len) == key {
                    return value.clone();
                }
            }
        }

        let value = read_text(path).and_then(|(text, _)| parse(path, &text));

        if let Ok(mut cache) = cache.lock() {
            cache.insert(path.clone(), (key.0, key.1, value.clone()));
        }

        value
    };

    let threads = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4).clamp(1, 8);

    if paths.len() < 64 || threads == 1 {
        return paths.iter().filter_map(work).collect();
    }

    let chunk = (paths.len() + threads - 1) / threads;

    std::thread::scope(|scope| {
        let handles: Vec<_> = paths
            .chunks(chunk)
            .map(|part| scope.spawn(|| part.iter().filter_map(work).collect::<Vec<T>>()))
            .collect();

        handles.into_iter().flat_map(|h| h.join().unwrap_or_default()).collect()
    })
}

/// Collection of an item: the first folder under the library root when
/// the item is inside a group folder ("Characters/KOF 94/Terry/Terry.def"
/// -> "KOF 94"). `own_folder` = the item normally has its own folder.
fn collection_of(root: &Path, path: &Path, own_folder: bool) -> String {
    let dirs: Vec<String> = path
        .parent()
        .and_then(|p| p.strip_prefix(root).ok())
        .map(|rel| rel.components().map(|c| c.as_os_str().to_string_lossy().to_string()).collect())
        .unwrap_or_default();

    let needed = if own_folder { 2 } else { 1 };

    if dirs.len() >= needed {
        dirs[0].clone()
    } else {
        String::new()
    }
}

fn def_files(dir: &Path, max_depth: usize) -> Vec<PathBuf> {
    let mut files = Vec::new();
    walk(dir, 0, max_depth, &mut files);

    files
        .into_iter()
        .filter(|p| {
            p.extension()
                .map(|e| e.eq_ignore_ascii_case("def"))
                .unwrap_or(false)
        })
        .collect()
}

/// Resolves a file referenced inside a DEF, relative to the DEF folder
/// first and then to the engine root.
fn resolve_relative(def_dir: &Path, root: &Path, value: &str) -> Option<PathBuf> {
    let cleaned = value.trim().trim_matches('"').replace('\\', "/");

    if cleaned.is_empty() {
        return None;
    }

    [def_dir.join(&cleaned), root.join(&cleaned)]
        .into_iter()
        .find(|p| p.is_file())
}

// ============================================================
// Characters
// ============================================================

#[derive(Debug, Clone)]
pub struct Character {
    pub id: String,
    pub name: String,
    pub author: String,
    pub source: &'static str,
    pub folder: String,
    /// Group folder (e.g. "KOF 94"), empty when not grouped.
    pub collection: String,
    pub sprite: Option<String>,
    pub anim: Option<String>,
    pub palette: Option<String>,
    pub localcoord: Option<String>,
    pub info: Vec<(String, String)>,
}

fn looks_like_character(text: &str) -> bool {
    def_value(text, "Files", "sprite").is_some()
        && def_value(text, "Files", "anim").is_some()
        && (def_value(text, "Files", "cns").is_some()
            || def_value(text, "Files", "st").is_some()
            || def_value(text, "Files", "cmd").is_some())
}

fn parse_character(layout: &Layout, dir: &Path, source: &'static str, path: &Path, text: &str) -> Option<Character> {
    if !looks_like_character(text) {
        return None;
    }

    let id = layout.id_of(path)?;
    let def_dir = path.parent().unwrap_or(dir);
    let root = &layout.engine_root;

    let file_id = |key: &str| {
        def_value(text, "Files", key)
            .and_then(|value| resolve_relative(def_dir, root, &value))
            .and_then(|p| layout.id_of(&p))
    };

    let name = def_value(text, "Info", "displayname")
        .or_else(|| def_value(text, "Info", "name"))
        .unwrap_or_else(|| path.file_stem().unwrap_or_default().to_string_lossy().to_string());

    let folder = def_dir
        .strip_prefix(dir)
        .map(|rel| rel.to_string_lossy().replace('\\', "/"))
        .unwrap_or_default();

    Some(Character {
        name,
        author: def_value(text, "Info", "author").unwrap_or_default(),
        source,
        folder,
        collection: collection_of(dir, path, true),
        sprite: file_id("sprite"),
        anim: file_id("anim"),
        palette: file_id("pal1"),
        localcoord: def_value(text, "Info", "localcoord"),
        info: section_pairs(text, "Info"),
        id,
    })
}

static CHARACTER_CACHE: std::sync::OnceLock<ScanCache<Character>> = std::sync::OnceLock::new();

fn scan_character_dir(layout: &Layout, dir: &Path, source: &'static str, out: &mut Vec<Character>) {
    let cache = CHARACTER_CACHE.get_or_init(Default::default);
    let found = parse_defs(def_files(dir, 8), cache, |path, text| parse_character(layout, dir, source, path, text));
    out.extend(found);
}

pub fn scan_characters(layout: &Layout) -> Vec<Character> {
    let mut result = Vec::new();

    scan_character_dir(layout, &layout.characters_dir(), "launcher", &mut result);
    scan_character_dir(layout, &layout.engine_root.join("chars"), "engine", &mut result);

    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()).then(a.id.cmp(&b.id)));
    result
}

// ============================================================
// Stages
// ============================================================

#[derive(Debug, Clone)]
pub struct Stage {
    pub id: String,
    pub name: String,
    pub author: String,
    pub source: &'static str,
    pub stage_type: String,
    /// Group folder (e.g. "KOF 95"), empty when not grouped.
    pub collection: String,
    pub preview: Option<String>,
}

fn looks_like_stage(text: &str) -> bool {
    (has_section(text, "StageInfo") || has_section(text, "BGDef"))
        && def_value(text, "Files", "cns").is_none()
}

fn detect_stage_type(text: &str) -> String {
    if def_value(text, "BGDef", "model").is_some() {
        return "3D".into();
    }

    if def_value(text, "Info", "attachedchar").is_some() {
        return "Interactive".into();
    }

    let z_keys = ["topscale", "botscale", "depthtoscreen", "topz", "botz"];

    if z_keys.iter().any(|k| def_value(text, "Scaling", k).is_some()) {
        return "Z axis".into();
    }

    "Normal".into()
}

fn parse_stage(layout: &Layout, dir: &Path, source: &'static str, path: &Path, text: &str) -> Option<Stage> {
    if !looks_like_stage(text) {
        return None;
    }

    let id = layout.id_of(path)?;

    let name = def_value(text, "Info", "displayname")
        .or_else(|| def_value(text, "Info", "name"))
        .unwrap_or_else(|| path.file_stem().unwrap_or_default().to_string_lossy().to_string());

    Some(Stage {
        preview: None,
        name,
        author: def_value(text, "Info", "author").unwrap_or_default(),
        source,
        stage_type: detect_stage_type(text),
        collection: collection_of(dir, path, false),
        id,
    })
}

static STAGE_CACHE: std::sync::OnceLock<ScanCache<Stage>> = std::sync::OnceLock::new();

fn scan_stage_dir(layout: &Layout, dir: &Path, source: &'static str, out: &mut Vec<Stage>) {
    let cache = STAGE_CACHE.get_or_init(Default::default);
    let found = parse_defs(def_files(dir, 8), cache, |path, text| parse_stage(layout, dir, source, path, text));
    out.extend(found);
}

pub fn scan_stages(layout: &Layout) -> Vec<Stage> {
    let mut result = Vec::new();

    scan_stage_dir(layout, &layout.stages_dir(), "launcher", &mut result);
    scan_stage_dir(layout, &layout.engine_root.join("stages"), "engine", &mut result);

    // A stage alone in its folder ("Stages/Temple/Temple.def") is not a
    // collection: only folders with 2+ stages are.
    let mut counts: std::collections::HashMap<(&'static str, String), usize> = std::collections::HashMap::new();
    for stage in &result {
        *counts.entry((stage.source, stage.collection.clone())).or_default() += 1;
    }
    let single: std::collections::HashSet<(&'static str, String)> =
        counts.into_iter().filter(|(_, n)| *n < 2).map(|(k, _)| k).collect();
    for stage in &mut result {
        if single.contains(&(stage.source, stage.collection.clone())) {
            stage.collection.clear();
        }
    }

    // Previews: one directory listing instead of several checks per stage.
    let previews = preview_index(layout, "stages");
    for stage in &mut result {
        stage.preview = indexed_preview(layout, &previews, "stages", &stage.id);
    }

    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()).then(a.id.cmp(&b.id)));
    result
}

// ============================================================
// Lifebars
// ============================================================

#[derive(Debug, Clone)]
pub struct Lifebar {
    pub id: String,
    pub name: String,
    pub author: String,
    pub resolution: String,
    pub preview: Option<String>,
}

fn resolution_from(text: &str, rel: &Path) -> String {
    if let Some(localcoord) = def_value(text, "Info", "localcoord") {
        return localcoord.replace(' ', "").replace(',', "x");
    }

    for component in rel.components() {
        let value = component.as_os_str().to_string_lossy().to_lowercase();

        for token in value.split(|c: char| c == ' ' || c == '_' || c == '-') {
            if let Some((w, h)) = token.split_once('x') {
                if w.parse::<u32>().is_ok() && h.parse::<u32>().is_ok() {
                    return format!("{}x{}", w, h);
                }
            }
        }
    }

    String::new()
}

/// A lifebar DEF (fight.def, VP_Fight.def...) is recognised by its
/// content, not by its name: [Files] plus lifebar sections.
fn looks_like_lifebar(text: &str) -> bool {
    has_section(text, "Files")
        && ["Lifebar", "Powerbar", "Face", "Name", "Time", "Round", "Combo", "WinIcon"]
            .iter()
            .any(|s| has_section(text, s))
        && !has_section(text, "Select Info")
        && def_value(text, "Files", "cns").is_none()
}

pub fn scan_lifebars(layout: &Layout) -> Vec<Lifebar> {
    let dir = layout.lifebars_dir();
    let mut result = Vec::new();

    for path in def_files(&dir, 4) {
        let text = match read_text(&path) {
            Some((text, _)) => text,
            None => continue,
        };

        if !looks_like_lifebar(&text) {
            continue;
        }

        let stem = path.file_stem().unwrap_or_default().to_string_lossy().to_string();

        let (id, rel) = match (layout.id_of(&path), path.strip_prefix(&dir)) {
            (Some(id), Ok(rel)) => (id, rel.to_path_buf()),
            _ => continue,
        };

        // "SF6", "SF6 / fight 1280x720" ...
        let folders: Vec<String> = rel
            .parent()
            .map(|p| {
                p.components()
                    .map(|c| c.as_os_str().to_string_lossy().to_string())
                    .collect()
            })
            .unwrap_or_default();

        let package = folders.first().cloned().unwrap_or_else(|| "Lifebar".into());
        let base_name = def_value(&text, "Info", "name").unwrap_or_else(|| package.clone());
        let mut parts: Vec<String> = folders
            .iter()
            .skip(1)
            .filter(|f| !f.eq_ignore_ascii_case("data"))
            .cloned()
            .collect();

        // Several lifebar files in the same package: show the file name.
        if !stem.eq_ignore_ascii_case("fight") {
            parts.push(stem.clone());
        }

        let variant = parts.join(" / ");

        let name = if variant.is_empty() {
            base_name
        } else {
            format!("{} / {}", base_name, variant)
        };

        let package_dir = dir.join(&package);

        result.push(Lifebar {
            preview: find_preview(layout, "lifebars", &id, Some(&package_dir)),
            name,
            author: def_value(&text, "Info", "author").unwrap_or_default(),
            resolution: resolution_from(&text, &rel),
            id,
        });
    }

    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    result
}

// ============================================================
// Preview images (manual, 1280x720)
// ============================================================

const PREVIEW_EXTENSIONS: [&str; 3] = ["png", "jpg", "jpeg"];

pub fn preview_slug(id: &str) -> String {
    let slug: String = id
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect();

    slug.trim_matches('_').to_string()
}

fn find_preview(layout: &Layout, kind: &str, id: &str, package_dir: Option<&Path>) -> Option<String> {
    let base = layout.previews_dir().join(kind).join(preview_slug(id));

    for ext in PREVIEW_EXTENSIONS {
        let path = base.with_extension(ext);

        if path.is_file() {
            return layout.id_of(&path);
        }
    }

    // Fallback: preview.png / screenshot.png inside the package folder.
    if let Some(dir) = package_dir {
        for name in ["preview", "screenshot"] {
            for ext in PREVIEW_EXTENSIONS {
                let path = dir.join(format!("{}.{}", name, ext));

                if path.is_file() {
                    return layout.id_of(&path);
                }
            }
        }
    }

    None
}

/// Lower-case file names of Previews/<kind>/ (one directory read).
fn preview_index(layout: &Layout, kind: &str) -> std::collections::HashMap<String, String> {
    fs::read_dir(layout.previews_dir().join(kind))
        .map(|entries| {
            entries
                .flatten()
                .map(|e| e.file_name().to_string_lossy().to_string())
                .map(|name| (name.to_lowercase(), name))
                .collect()
        })
        .unwrap_or_default()
}

fn indexed_preview(layout: &Layout, index: &std::collections::HashMap<String, String>, kind: &str, id: &str) -> Option<String> {
    let slug = preview_slug(id);

    PREVIEW_EXTENSIONS.iter().find_map(|ext| {
        index
            .get(&format!("{}.{}", slug, ext))
            .and_then(|name| layout.id_of(&layout.previews_dir().join(kind).join(name)))
    })
}

/// All images of an item: the single legacy preview first, then the
/// numbered images of Previews/<kind>/<slug>/ (carousel).
fn find_previews(layout: &Layout, kind: &str, id: &str, package_dir: Option<&Path>) -> Vec<String> {
    let mut result: Vec<String> = find_preview(layout, kind, id, package_dir).into_iter().collect();
    let dir = layout.previews_dir().join(kind).join(preview_slug(id));

    if let Ok(entries) = fs::read_dir(&dir) {
        let mut files: Vec<PathBuf> = entries
            .flatten()
            .map(|e| e.path())
            .filter(|p| {
                p.is_file()
                    && p.extension()
                        .map(|e| PREVIEW_EXTENSIONS.contains(&e.to_string_lossy().to_lowercase().as_str()))
                        .unwrap_or(false)
            })
            .collect();

        files.sort();
        result.extend(files.iter().filter_map(|p| layout.id_of(p)));
    }

    result
}

/// Adds one more image to an item's carousel.
pub fn add_preview(layout: &Layout, kind: &str, id: &str, bytes: &[u8], ext: &str) -> Result<String, String> {
    if kind != "screenpacks" {
        return save_preview(layout, kind, id, bytes, ext);
    }

    let ext = ext.to_lowercase();

    if !PREVIEW_EXTENSIONS.contains(&ext.as_str()) {
        return Err("Invalid image format.".into());
    }

    let dir = layout.previews_dir().join(kind).join(preview_slug(id));
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let next = fs::read_dir(&dir)
        .map(|entries| {
            entries
                .flatten()
                .filter_map(|e| {
                    e.path()
                        .file_stem()
                        .and_then(|s| s.to_string_lossy().parse::<u32>().ok())
                })
                .max()
                .unwrap_or(0)
        })
        .unwrap_or(0)
        + 1;

    let path = dir.join(format!("{:03}.{}", next, ext));
    fs::write(&path, bytes).map_err(|e| format!("Error saving the image: {}", e))?;

    layout.id_of(&path).ok_or_else(|| "Error saving the image.".into())
}

/// Removes an image previously added through the Launcher. Only files
/// inside Previews/ can be removed.
pub fn delete_preview(layout: &Layout, image_id: &str) -> Result<(), String> {
    let path = layout.resolve_id(image_id)?;

    if !path.starts_with(layout.previews_dir()) {
        return Err("Only images added by the Launcher (Previews folder) can be removed.".into());
    }

    fs::remove_file(&path).map_err(|e| format!("Error removing the image: {}", e))
}

pub fn save_preview(layout: &Layout, kind: &str, id: &str, bytes: &[u8], ext: &str) -> Result<String, String> {
    if !matches!(kind, "stages" | "lifebars" | "screenpacks") {
        return Err("Invalid preview type.".into());
    }

    let ext = ext.to_lowercase();

    if !PREVIEW_EXTENSIONS.contains(&ext.as_str()) {
        return Err("Invalid image format.".into());
    }

    let dir = layout.previews_dir().join(kind);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let base = dir.join(preview_slug(id));

    for old in PREVIEW_EXTENSIONS {
        let _ = fs::remove_file(base.with_extension(old));
    }

    let path = base.with_extension(&ext);
    fs::write(&path, bytes).map_err(|e| format!("Error saving the image: {}", e))?;

    layout.id_of(&path).ok_or_else(|| "Error saving the image.".into())
}

pub fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    let data = input.split_once(',').map(|(_, d)| d).unwrap_or(input);
    let mut out = Vec::with_capacity(data.len() * 3 / 4);
    let mut buffer = 0u32;
    let mut bits = 0;

    for c in data.bytes() {
        let value = match c {
            b'A'..=b'Z' => c - b'A',
            b'a'..=b'z' => c - b'a' + 26,
            b'0'..=b'9' => c - b'0' + 52,
            b'+' | b'-' => 62,
            b'/' | b'_' => 63,
            b'=' | b'\r' | b'\n' | b' ' => continue,
            _ => return Err("Invalid image.".into()),
        } as u32;

        buffer = (buffer << 6) | value;
        bits += 6;

        if bits >= 8 {
            bits -= 8;
            out.push((buffer >> bits) as u8);
        }
    }

    Ok(out)
}

// ============================================================
// Motif (screenpack) and launch files
// ============================================================

/// "Motif" value of an old IKEMEN GO save/config.json (0.98 / 0.99),
/// without a JSON dependency: "Motif": "data/system.def".
fn json_motif(text: &str) -> Option<String> {
    let start = text.find("\"Motif\"")? + "\"Motif\"".len();
    let rest = text[start..].trim_start().strip_prefix(':')?.trim_start();
    let rest = rest.strip_prefix('"')?;
    let end = rest.find('"')?;
    let value = rest[..end].replace("\\\\", "/").replace('\\', "/");

    (!value.trim().is_empty()).then(|| value.trim().to_string())
}

/// Motif used by the engine: save/config.ini [Config] Motif (IKEMEN GO
/// 1.0), or save/config.json "Motif" (older versions), falling back to
/// data/system.def.
pub fn engine_motif(layout: &Layout) -> String {
    let save = layout.engine_root.join("save");

    let from_ini = read_text(&save.join("config.ini")).and_then(|(text, _)| def_value(&text, "Config", "Motif"));
    let from_json = || read_text(&save.join("config.json")).and_then(|(text, _)| json_motif(&text));

    from_ini
        .or_else(from_json)
        .map(|m| m.replace('\\', "/"))
        .filter(|m| layout.resolve_id(m).map(|p| p.is_file()).unwrap_or(false))
        .unwrap_or_else(|| "data/system.def".into())
}

/// Lifebar of the current screenpack ([Files] fight of the motif), used
/// by the "Default" card. Returns (id, preview).
pub fn default_lifebar(layout: &Layout) -> Option<(String, Option<String>)> {
    motif_lifebar(layout, &engine_motif(layout))
}

/// Lifebar ([Files] fight) of a given screenpack. Returns (id, preview).
pub fn motif_lifebar(layout: &Layout, motif: &str) -> Option<(String, Option<String>)> {
    let motif_path = layout.resolve_id(motif).ok()?;
    let (text, _) = read_text(&motif_path)?;
    let value = def_value(&text, "Files", "fight")?.replace('\\', "/");
    let motif_dir = motif_path.parent()?;

    let path = [
        motif_dir.join(&value),
        layout.engine_root.join(&value),
        layout.engine_root.join("data").join(&value),
    ]
    .into_iter()
    .find(|p| p.is_file())?;

    let id = layout.id_of(&path)?;
    let preview = find_preview(layout, "lifebars", &id, None);

    Some((id, preview))
}

// ============================================================
// Screenpacks
// ============================================================

#[derive(Debug, Clone)]
pub struct Screenpack {
    pub id: String,
    /// Folder that groups variants of the same screenpack (e.g. the
    /// "120 slots.def" / "system.def" of one pack). Images belong to it.
    pub package: String,
    pub package_name: String,
    /// File name of this variant ("system", "120 slots"...).
    pub variant: String,
    /// [Options] *.maxmatches of the screenpack select.def.
    pub maxmatches: Vec<(String, String)>,
    pub name: String,
    pub author: String,
    pub source: &'static str,
    pub rows: u32,
    pub columns: u32,
    pub skipped: u32,
    pub slots: u32,
    pub localcoord: String,
    pub previews: Vec<String>,
    pub lifebar: Option<String>,
    pub lifebar_preview: Option<String>,
    pub skip_cells: Vec<(u32, u32)>,
    /// Screenpack sprite file ([Files] spr), for cell sprites.
    pub spr: Option<String>,
    pub cell_size: (f32, f32),
    pub portrait_spr: (u16, u16),
    pub cell_bg_spr: Option<(u16, u16)>,
    pub cell_random_spr: Option<(u16, u16)>,
}

pub struct Grid {
    pub rows: u32,
    pub columns: u32,
    pub skipped: u32,
    /// Disabled cells as (column, row).
    pub skip_cells: Vec<(u32, u32)>,
}

impl Grid {
    pub fn slots(&self) -> u32 {
        (self.rows * self.columns).saturating_sub(self.skipped)
    }
}

fn parse_numbers(value: &str) -> Vec<f32> {
    value
        .split(',')
        .filter_map(|v| v.trim().parse::<f32>().ok())
        .collect()
}

fn sprite_pair(text: &str, key: &str) -> Option<(u16, u16)> {
    let n = parse_numbers(&def_value(text, "Select Info", key)?);

    match n.as_slice() {
        [g, i, ..] if *g >= 0.0 && *i >= 0.0 => Some((*g as u16, *i as u16)),
        _ => None,
    }
}

/// Character grid of a motif: [Select Info] rows x columns, minus the
/// cells disabled with "cell.<col>-<row>.skip = 1".
pub fn motif_grid(text: &str) -> Option<Grid> {
    let number = |key: &str| {
        def_value(text, "Select Info", key)
            .and_then(|v| v.split(',').next().map(|n| n.trim().to_string()))
            .and_then(|v| v.parse::<u32>().ok())
    };

    let rows = number("rows")?;
    let columns = number("columns")?;

    let mut skip_cells: Vec<(u32, u32)> = section_pairs(text, "Select Info")
        .into_iter()
        .filter(|(_, value)| value.trim() == "1")
        .filter_map(|(key, _)| {
            let key = key.to_lowercase();
            let cell = key.strip_prefix("cell.")?.strip_suffix(".skip")?.to_string();
            let (c, r) = cell.split_once('-')?;
            let (c, r) = (c.trim().parse::<u32>().ok()?, r.trim().parse::<u32>().ok()?);

            (c < columns && r < rows).then_some((c, r))
        })
        .collect();

    skip_cells.sort_by_key(|&(c, r)| (r, c));
    skip_cells.dedup();

    Some(Grid {
        rows,
        columns,
        skipped: skip_cells.len() as u32,
        skip_cells,
    })
}

pub const MAXMATCHES_KEYS: [&str; 4] = ["arcade", "team", "timeattack", "survival"];

fn motif_select_text(layout: &Layout, motif_text: &str, motif_dir: &Path) -> String {
    def_value(motif_text, "Files", "select")
        .and_then(|value| {
            let value = value.replace('\\', "/");
            [
                motif_dir.join(&value),
                layout.engine_root.join(&value),
                layout.engine_root.join("data").join(&value),
            ]
            .into_iter()
            .find(|p| p.is_file())
        })
        .and_then(|p| read_text(&p))
        .map(|(text, _)| text)
        .unwrap_or_default()
}

/// "*.maxmatches" lines of the [Options] of the screenpack select.def
/// (values as written, e.g. "6,1,1,0,0,0,0,0,0,0").
fn motif_maxmatches(layout: &Layout, motif_text: &str, motif_dir: &Path) -> Vec<(String, String)> {
    let select = motif_select_text(layout, motif_text, motif_dir);

    MAXMATCHES_KEYS
        .iter()
        .filter_map(|k| {
            def_value(&select, "Options", &format!("{}.maxmatches", k)).map(|v| (k.to_string(), v))
        })
        .collect()
}

fn scan_screenpack_dir(layout: &Layout, dir: &Path, source: &'static str, max_depth: usize, out: &mut Vec<Screenpack>) {
    for path in def_files(dir, max_depth) {
        let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();

        // Files generated by the Launcher, and copies left by old versions.
        if file_name == LAUNCH_SYSTEM
            || path.components().any(|c| {
                c.as_os_str().to_string_lossy().to_lowercase().starts_with("launcher_")
            })
        {
            continue;
        }

        let text = match read_text(&path) {
            Some((text, _)) => text,
            None => continue,
        };

        if !has_section(&text, "Files") {
            continue;
        }

        let grid = match motif_grid(&text) {
            Some(grid) => grid,
            None => continue,
        };

        let id = match layout.id_of(&path) {
            Some(id) => id,
            None => continue,
        };

        let folder = path
            .parent()
            .and_then(|p| p.file_name())
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let name = def_value(&text, "Info", "name").unwrap_or(folder);
        let lifebar = motif_lifebar(layout, &id);
        let motif_dir = path.parent().unwrap_or(dir);

        // Package: first folder inside Screenpacks/, or the folder of the
        // DEF for screenpacks in data/.
        let package_dir = match (source, path.strip_prefix(dir).ok().and_then(|r| r.components().next())) {
            ("launcher", Some(first)) if path.parent() != Some(dir) => dir.join(first.as_os_str()),
            _ => motif_dir.to_path_buf(),
        };

        let package = layout.id_of(&package_dir).unwrap_or_else(|| id.clone());
        let package_name = if source == "launcher" && package_dir != motif_dir {
            package_dir.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| name.clone())
        } else {
            name.clone()
        };

        let mut previews = find_previews(layout, "screenpacks", &package, Some(&package_dir));
        for legacy in find_previews(layout, "screenpacks", &id, None) {
            if !previews.contains(&legacy) {
                previews.push(legacy);
            }
        }

        let spr = def_value(&text, "Files", "spr")
            .and_then(|value| {
                let value = value.replace('\\', "/");
                [
                    motif_dir.join(&value),
                    layout.engine_root.join(&value),
                    layout.engine_root.join("data").join(&value),
                ]
                .into_iter()
                .find(|p| p.is_file())
            })
            .and_then(|p| layout.id_of(&p));

        let cell_size = def_value(&text, "Select Info", "cell.size")
            .map(|v| parse_numbers(&v))
            .and_then(|n| match n.as_slice() {
                [w, h, ..] if *w > 0.0 && *h > 0.0 => Some((*w, *h)),
                _ => None,
            })
            .unwrap_or((25.0, 25.0));

        out.push(Screenpack {
            variant: path.file_stem().unwrap_or_default().to_string_lossy().to_string(),
            maxmatches: motif_maxmatches(layout, &text, motif_dir),
            package,
            package_name,
            previews,
            skip_cells: grid.skip_cells.clone(),
            spr,
            cell_size,
            portrait_spr: sprite_pair(&text, "portrait.spr").unwrap_or((9000, 0)),
            cell_bg_spr: sprite_pair(&text, "cell.bg.spr"),
            cell_random_spr: sprite_pair(&text, "cell.random.spr"),
            name,
            author: def_value(&text, "Info", "author").unwrap_or_default(),
            source,
            rows: grid.rows,
            columns: grid.columns,
            skipped: grid.skipped,
            slots: grid.slots(),
            localcoord: def_value(&text, "Info", "localcoord")
                .map(|l| l.replace(' ', "").replace(',', "x"))
                .unwrap_or_default(),
            lifebar_preview: lifebar.as_ref().and_then(|(_, p)| p.clone()),
            lifebar: lifebar.map(|(id, _)| id),
            id,
        });
    }
}

pub fn scan_screenpacks(layout: &Layout) -> Vec<Screenpack> {
    let mut result = Vec::new();

    scan_screenpack_dir(layout, &layout.screenpacks_dir(), "launcher", 4, &mut result);
    scan_screenpack_dir(layout, &layout.engine_root.join("data"), "engine", 3, &mut result);

    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()).then(a.id.cmp(&b.id)));
    result
}

pub struct LaunchSpec {
    pub motif: Option<String>,
    pub characters: Vec<String>,
    pub stages: Vec<String>,
    pub lifebar: Option<String>,
    pub random_slot: bool,
    /// Grid editor layout: one entry per available cell, in reading
    /// order. None = empty cell, "randomselect" = random cell.
    /// When present it replaces `characters` + `random_slot`.
    pub grid: Option<Vec<Option<String>>>,
    /// Characters outside the grid ("exclude = 1").
    pub extras: Vec<String>,
    pub params: std::collections::HashMap<String, CharParams>,
    /// Overrides for [Options] "<mode>.maxmatches" (mode, "6,1,1,...").
    pub maxmatches: Vec<(String, String)>,
}

pub const RANDOM_CELL: &str = "randomselect";

/// Per-character select.def parameters edited in the Launcher.
#[derive(Debug, Clone, Default)]
pub struct CharParams {
    /// 0 normal, 1 secret (hidden, selectable), 2 locked (hidden, not
    /// selectable), 3 shown as random.
    pub hidden: u8,
    pub order: Option<i32>,
    pub ordersurvival: Option<i32>,
    pub bonus: bool,
    /// Lua condition; must be the LAST parameter of the line.
    pub unlock: Option<String>,
}

/// Parameters written after the character path. "exclude" goes before
/// "unlock", because IKEMEN takes everything after "unlock =".
pub fn char_params_suffix(params: Option<&CharParams>, exclude: bool) -> String {
    let mut out = String::new();

    if let Some(p) = params {
        if (1..=3).contains(&p.hidden) {
            out.push_str(&format!(", hidden = {}", p.hidden));
        }
        if let Some(order) = p.order.filter(|o| *o != 1) {
            out.push_str(&format!(", order = {}", order));
        }
        if let Some(order) = p.ordersurvival {
            out.push_str(&format!(", ordersurvival = {}", order));
        }
        if p.bonus {
            out.push_str(", bonus = 1");
        }
    }

    if exclude {
        out.push_str(", exclude = 1");
    }

    if let Some(unlock) = params.and_then(|p| p.unlock.as_deref()) {
        let unlock: String = unlock
            .chars()
            .filter(|c| !matches!(c, '\r' | '\n' | ';'))
            .collect();

        if !unlock.trim().is_empty() {
            out.push_str(&format!(", unlock = {}", unlock.trim()));
        }
    }

    out
}

/// Replaces (or adds) "<mode>.maxmatches" lines in the [Options]
/// section of the copied select.def text.
fn apply_maxmatches(text: &str, values: &[(String, String)]) -> String {
    if values.is_empty() {
        return text.to_string();
    }

    let mut lines: Vec<String> = Vec::new();
    let mut in_options = false;
    let mut options_header: Option<usize> = None;
    let mut done = vec![false; values.len()];

    for raw in text.lines() {
        if let Some(name) = section_name(raw) {
            in_options = name == "options";
            lines.push(raw.to_string());
            if in_options && options_header.is_none() {
                options_header = Some(lines.len() - 1);
            }
            continue;
        }

        if in_options {
            if let Some((left, _)) = strip_comment(raw).split_once('=') {
                let key = left.trim().to_lowercase();

                if let Some(pos) = values.iter().position(|(k, _)| format!("{}.maxmatches", k) == key) {
                    if !done[pos] {
                        lines.push(format!("{}.maxmatches = {}", values[pos].0, values[pos].1));
                        done[pos] = true;
                    }
                    continue;
                }
            }
        }

        lines.push(raw.to_string());
    }

    let missing: Vec<String> = values
        .iter()
        .zip(&done)
        .filter(|(_, d)| !**d)
        .map(|((k, v), _)| format!("{}.maxmatches = {}", k, v))
        .collect();

    match options_header {
        Some(index) => {
            for (offset, line) in missing.into_iter().enumerate() {
                lines.insert(index + 1 + offset, line);
            }
        }
        None if !missing.is_empty() => {
            lines.push(String::new());
            lines.push("[Options]".into());
            lines.extend(missing);
        }
        None => {}
    }

    let mut out = lines.join("\r\n");
    out.push_str("\r\n");
    out
}

pub struct LaunchPlan {
    /// Argument for "-r", relative to the engine root.
    pub system_arg: String,
    pub missing: Vec<String>,
    /// Automatic fixes the user should know about.
    pub warnings: Vec<String>,
}

/// Resolves a [Files] path the way IKEMEN does: motif folder, engine
/// root, then data/.
pub fn resolve_motif_file(layout: &Layout, motif_dir: &Path, value: &str) -> Option<PathBuf> {
    let value = value.trim().replace('\\', "/");

    if value.is_empty() {
        return None;
    }

    [
        motif_dir.join(&value),
        layout.engine_root.join(&value),
        layout.engine_root.join("data").join(&value),
    ]
    .into_iter()
    .find(|p| p.is_file())
}

/// Entry for [Characters]. IKEMEN resolves characters inside chars/,
/// so Launcher characters are referenced as ../IKEMEN-GO-Launcher/...
pub fn select_char_entry(id: &str) -> String {
    let id = id.replace('\\', "/");

    match id.get(..6) {
        Some(prefix) if prefix.eq_ignore_ascii_case("chars/") => id[6..].to_string(),
        _ => format!("../{}", id),
    }
}

fn set_files_keys(text: &str, values: &[(&str, &str)]) -> String {
    let mut lines: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut files_header: Option<usize> = None;
    let mut done = vec![false; values.len()];

    for raw in text.lines() {
        let raw = raw.trim_end_matches('\r');

        if let Some(name) = section_name(raw) {
            current = name;

            if current == "files" && files_header.is_none() {
                lines.push(raw.to_string());
                files_header = Some(lines.len() - 1);
                continue;
            }
        }

        if current == "files" {
            if let Some((left, _)) = strip_comment(raw).split_once('=') {
                let key = left.trim();

                if let Some(pos) = values.iter().position(|(k, _)| k.eq_ignore_ascii_case(key)) {
                    if !done[pos] {
                        lines.push(format!("{} = {}", values[pos].0, values[pos].1));
                        done[pos] = true;
                    }
                    continue;
                }
            }
        }

        lines.push(raw.to_string());
    }

    let missing: Vec<String> = values
        .iter()
        .zip(&done)
        .filter(|(_, d)| !**d)
        .map(|((k, v), _)| format!("{} = {}", k, v))
        .collect();

    if !missing.is_empty() {
        match files_header {
            Some(index) => {
                for (offset, line) in missing.into_iter().enumerate() {
                    lines.insert(index + 1 + offset, line);
                }
            }
            None => {
                lines.insert(0, String::new());
                for line in missing.into_iter().rev() {
                    lines.insert(0, line);
                }
                lines.insert(0, "[Files]".into());
            }
        }
    }

    let mut result = lines.join("\r\n");
    result.push_str("\r\n");
    result
}

/// Every section of the original select.def except the lists that the
/// profile replaces ([Characters] and [ExtraStages]).
fn other_select_sections(text: &str) -> String {
    let mut out = String::new();
    let mut keep = false;

    for raw in text.lines() {
        let raw = raw.trim_end_matches('\r');

        if let Some(name) = section_name(raw) {
            keep = !(name.ends_with("characters") || name.ends_with("extrastages"));
        }

        if keep {
            out.push_str(raw);
            out.push_str("\r\n");
        }
    }

    out
}

pub fn prepare_launch(layout: &Layout, spec: &LaunchSpec) -> Result<LaunchPlan, String> {
    let motif_id = spec.motif.clone().unwrap_or_else(|| engine_motif(layout));
    let motif_path = layout.resolve_id(&motif_id)?;

    let (motif_text, motif_encoding) = read_text(&motif_path)
        .ok_or_else(|| format!("Screenpack not found:\n{}", motif_id))?;

    let motif_dir = motif_path.parent().unwrap_or(&layout.engine_root).to_path_buf();
    let mut missing = Vec::new();
    let mut warnings = Vec::new();

    // ---- select.launcher.def ----
    let original_select = motif_select_text(layout, &motif_text, &motif_dir);

    let mut select = String::new();
    select.push_str("; Generated by IKEMEN GO Launcher. Do not edit: this file is recreated on every PLAY.\r\n\r\n");
    select.push_str("[Characters]\r\n");

    let capacity = motif_grid(&motif_text)
        .map(|g| g.slots() as usize)
        .unwrap_or(usize::MAX);

    // Grid cells + extras. Old profiles (plain list) are converted:
    // characters fill the grid in order, then the random cell; what
    // does not fit becomes an extra instead of being dropped.
    let (mut grid, mut extras): (Vec<Option<String>>, Vec<String>) = match &spec.grid {
        Some(grid) => (grid.clone(), spec.extras.clone()),
        None => {
            // No positions in old profiles: missing characters are just
            // left out (reported), without leaving a gap.
            let characters: Vec<String> = spec
                .characters
                .iter()
                .filter(|id| {
                    let ok = layout.resolve_id(id).map(|p| p.is_file()).unwrap_or(false);
                    if !ok {
                        missing.push(id.to_string());
                    }
                    ok
                })
                .cloned()
                .collect();

            let room = capacity.saturating_sub(spec.random_slot as usize);
            let mut grid: Vec<Option<String>> = characters.iter().take(room).cloned().map(Some).collect();

            if spec.random_slot {
                grid.push(Some(RANDOM_CELL.to_string()));
            }

            let mut extras: Vec<String> = characters.iter().skip(room).cloned().collect();
            extras.extend(spec.extras.iter().cloned());
            (grid, extras)
        }
    };

    // Cells beyond the screenpack grid (e.g. after switching to a
    // smaller screenpack) become extras.
    if grid.len() > capacity {
        for cell in grid.split_off(capacity).into_iter().flatten() {
            if cell != RANDOM_CELL {
                extras.insert(0, cell);
            }
        }
    }

    while matches!(grid.last(), Some(None)) {
        grid.pop();
    }

    let mut char_count = 0;

    // select.def separates parameters with commas: a path with a comma
    // cannot be written there (IKEMEN would read a broken path).
    let mut comma_paths: Vec<String> = Vec::new();

    let valid = |id: &str, missing: &mut Vec<String>, comma_paths: &mut Vec<String>| {
        if id.contains(',') {
            comma_paths.push(id.to_string());
            return false;
        }

        match layout.resolve_id(id) {
            Ok(path) if path.is_file() => true,
            _ => {
                missing.push(id.to_string());
                false
            }
        }
    };

    for cell in &grid {
        match cell.as_deref() {
            Some(RANDOM_CELL) => select.push_str(RANDOM_CELL),
            Some(id) if valid(id, &mut missing, &mut comma_paths) => {
                select.push_str(&select_char_entry(id));
                select.push_str(&char_params_suffix(spec.params.get(id), false));
                char_count += 1;
            }
            // Empty cell (or missing character): keep the position.
            _ => select.push_str("skipslot"),
        }

        select.push_str("\r\n");
    }

    for id in &extras {
        if valid(id, &mut missing, &mut comma_paths) {
            select.push_str(&select_char_entry(id));
            select.push_str(&char_params_suffix(spec.params.get(id), true));
            select.push_str("\r\n");
            char_count += 1;
        }
    }

    if char_count == 0 {
        return Err("None of the profile characters were found.".into());
    }

    select.push_str("\r\n[ExtraStages]\r\n");

    for id in &spec.stages {
        if id.contains(',') {
            comma_paths.push(id.clone());
            continue;
        }

        match layout.resolve_id(id) {
            Ok(path) if path.is_file() => {
                select.push_str(id);
                select.push_str("\r\n");
            }
            _ => missing.push(id.clone()),
        }
    }

    for id in &comma_paths {
        warnings.push(format!(
            "\"{}\" was left out: IKEMEN GO cannot load paths with a comma (,). Rename the folder or file.",
            id
        ));
    }

    select.push_str("\r\n");
    select.push_str(&apply_maxmatches(&other_select_sections(&original_select), &spec.maxmatches));

    // ---- system.launcher.def (same folder as the motif, so every
    // relative path of the screenpack keeps working) ----
    let mut keys: Vec<(String, String)> = vec![("select".into(), LAUNCH_SELECT.into())];
    let mut lifebar_dir: Option<PathBuf> = None;

    if let Some(lifebar) = &spec.lifebar {
        match layout.resolve_id(lifebar) {
            Ok(path) if path.is_file() => {
                keys.push(("fight".into(), lifebar.clone()));
                lifebar_dir = path.parent().map(Path::to_path_buf);
            }
            _ => missing.push(lifebar.clone()),
        }
    }

    // Screenpacks often ship without their own lifebar (or it was moved to
    // Lifebars/). The engine stops with "Can't load fight screen" when
    // [Files] fight does not exist, so the engine's lifebar is used instead.
    if !keys.iter().any(|(k, _)| k == "fight") {
        let own = def_value(&motif_text, "Files", "fight").unwrap_or_else(|| "fight.def".into());

        if resolve_motif_file(layout, &motif_dir, &own).is_none() {
            let fallback = layout.engine_root.join("data").join("fight.def");

            if fallback.is_file() {
                keys.push(("fight".into(), "data/fight.def".into()));
                warnings.push(format!(
                    "The screenpack lifebar ({}) does not exist; the IKEMEN default lifebar was used.",
                    own
                ));
            }
        }
    }

    // Fonts ([Files] fontN) that do not exist: screenpacks with the lifebar
    // moved elsewhere point to "fight/font/...". Look for the same file in
    // the chosen lifebar folder; otherwise the engine default font is used.
    for (key, value) in section_pairs(&motif_text, "Files") {
        let key_lower = key.to_lowercase();

        if !key_lower.starts_with("font") || !key_lower[4..].chars().all(|c| c.is_ascii_digit()) {
            continue;
        }

        let value = value.replace('\\', "/");

        let exists = resolve_motif_file(layout, &motif_dir, &value).is_some()
            || motif_dir.join("font").join(&value).is_file()
            || layout.engine_root.join("font").join(&value).is_file();

        if value.is_empty() || exists {
            continue;
        }

        let file_name = Path::new(&value).file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
        let mut candidates: Vec<PathBuf> = Vec::new();

        if let Some(dir) = &lifebar_dir {
            candidates.push(dir.join(&value));
            if let Some((_, rest)) = value.split_once('/') {
                candidates.push(dir.join(rest));
            }
            candidates.push(dir.join("font").join(&file_name));
        }

        // Also any lifebar of the library that has this font file.
        if let Ok(entries) = fs::read_dir(layout.lifebars_dir()) {
            for entry in entries.flatten() {
                candidates.push(entry.path().join("font").join(&file_name));
                candidates.push(entry.path().join(&file_name));
            }
        }

        if let Some(found) = candidates.into_iter().find(|p| p.is_file()).and_then(|p| layout.id_of(&p)) {
            keys.push((key, found));
        }
    }

    let key_refs: Vec<(&str, &str)> = keys.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect();
    let system = set_files_keys(&motif_text, &key_refs);

    fs::write(motif_dir.join(LAUNCH_SELECT), select.as_bytes())
        .map_err(|e| format!("Error creating {}:\n{}", LAUNCH_SELECT, e))?;

    fs::write(motif_dir.join(LAUNCH_SYSTEM), encode_text(&system, motif_encoding))
        .map_err(|e| format!("Error creating {}:\n{}", LAUNCH_SYSTEM, e))?;

    let system_arg = layout
        .id_of(&motif_dir.join(LAUNCH_SYSTEM))
        .ok_or("Screenpack is outside the IKEMEN GO folder.")?;

    Ok(LaunchPlan { system_arg, missing, warnings })
}

// ============================================================
// Profiles (JSON handled by the Tauri layer)
// ============================================================

pub fn profile_file_name(name: &str) -> String {
    let slug: String = name
        .trim()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' {
                c
            } else {
                '_'
            }
        })
        .collect();

    let mut slug = slug.trim().to_string();

    // Names Windows does not allow as file names (CON, NUL, COM1...).
    let upper = slug.to_uppercase();
    let reserved = matches!(upper.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || ((upper.starts_with("COM") || upper.starts_with("LPT"))
            && upper.len() == 4
            && upper.as_bytes()[3].is_ascii_digit());

    if reserved {
        slug.push('_');
    }

    if slug.is_empty() {
        "Profile.json".into()
    } else {
        format!("{}.json", slug)
    }
}

fn file_exists_ignoring_case(dir: &Path, file_name: &str) -> bool {
    let wanted = file_name.to_lowercase();

    fs::read_dir(dir)
        .map(|entries| {
            entries
                .flatten()
                .any(|e| e.file_name().to_string_lossy().to_lowercase() == wanted)
        })
        .unwrap_or(false)
}

/// Writes a profile file safely:
/// - never overwrites ANOTHER profile whose name gives the same file
///   name (e.g. "A/B" and "A_B");
/// - a rename that only changes upper/lower case keeps the file (Windows
///   file names ignore case);
/// - the data is written to a temp file first.
pub fn save_profile_file(dir: &Path, name: &str, previous: Option<&str>, text: &str) -> Result<(), String> {
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;

    let file_name = profile_file_name(name);
    let file = dir.join(&file_name);
    let previous_name = previous.map(profile_file_name);
    let same_file = previous_name
        .as_deref()
        .map(|p| p.to_lowercase() == file_name.to_lowercase())
        .unwrap_or(false);

    if !same_file && file_exists_ignoring_case(dir, &file_name) {
        return Err(format!(
            "A profile with this name (or a very similar one) already exists:\n{}\nChoose another name.",
            file_name
        ));
    }

    let temp = dir.join(format!("{}.tmp", file_name));
    fs::write(&temp, text).map_err(|e| format!("Error saving the profile:\n{}", e))?;

    if let Some(previous_name) = &previous_name {
        // Case-only rename: remove the old spelling first, so the new
        // spelling is used (and the new file is never deleted afterwards).
        if same_file && previous_name != &file_name {
            let _ = fs::remove_file(dir.join(previous_name));
        }
    }

    // On failure the .tmp file is kept (it still has the data).
    fs::rename(&temp, &file).map_err(|e| format!("Error saving the profile:\n{}", e))?;

    if let Some(previous_name) = previous_name {
        if !same_file {
            let _ = fs::remove_file(dir.join(previous_name));
        }
    }

    Ok(())
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_engine(name: &str) -> Layout {
        let root = std::env::temp_dir().join(format!("ikl_test_{}", name));
        let _ = fs::remove_dir_all(&root);
        let launcher = root.join("IKEMEN-GO-Launcher");
        fs::create_dir_all(launcher.join("src-tauri/target/debug")).unwrap();
        fs::create_dir_all(root.join("data")).unwrap();
        fs::write(root.join("Ikemen_GO.exe"), b"").unwrap();
        detect_layout(&launcher.join("src-tauri/target/debug")).unwrap()
    }

    fn write(path: &Path, text: &str) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, text).unwrap();
    }

    #[test]
    fn layout_from_dev_and_release() {
        let layout = temp_engine("layout");
        assert!(layout.launcher_dir.ends_with("IKEMEN-GO-Launcher"));
        assert!(layout.engine_exe.ends_with("Ikemen_GO.exe"));

        // The Launcher executable must not be mistaken for the engine.
        fs::write(layout.launcher_dir.join("ikemen_go_launcher.exe"), b"").unwrap();
        fs::write(layout.launcher_dir.join("src-tauri/target/debug/ikemen_go_launcher.exe"), b"").unwrap();
        let debug = detect_layout(&layout.launcher_dir.join("src-tauri/target/debug")).unwrap();
        assert_eq!(debug.engine_root, layout.engine_root);

        let release = detect_layout(&layout.launcher_dir).unwrap();
        assert_eq!(release.launcher_dir, layout.launcher_dir);
        assert_eq!(release.engine_root, layout.engine_root);

        assert!(layout.resolve_id("../x.def").is_err());
        assert!(layout.resolve_id("C:/x.def").is_err() || cfg!(not(windows)));
        assert!(layout.resolve_id("/etc/passwd").is_err());
    }

    #[test]
    fn latin1_and_values() {
        let (text, enc) = decode_text(b"[Info]\r\nname = \"Ren\xe9\" ; c\xe9\r\n");
        assert_eq!(enc, Encoding::Latin1);
        assert_eq!(def_value(&text, "info", "NAME").unwrap(), "René");
        assert_eq!(encode_text(&text, enc), b"[Info]\r\nname = \"Ren\xe9\" ; c\xe9\r\n");
    }

    #[test]
    fn char_entries() {
        assert_eq!(select_char_entry("chars/kfm/kfm.def"), "kfm/kfm.def");
        assert_eq!(select_char_entry("Chars/kfm/kfm.def"), "kfm/kfm.def");
        assert_eq!(
            select_char_entry("IKEMEN-GO-Launcher/Characters/A/A.def"),
            "../IKEMEN-GO-Launcher/Characters/A/A.def"
        );
    }

    #[test]
    fn base64() {
        assert_eq!(decode_base64("data:image/png;base64,SGVsbG8=").unwrap(), b"Hello");
        assert_eq!(decode_base64("SGk").unwrap(), b"Hi");
    }

    #[test]
    fn collections_parallel_and_cache() {
        let layout = temp_engine("collections");
        layout.ensure_folders();
        let chars = layout.characters_dir();
        let def = |name: &str| format!("[Info]\r\nname = \"{}\"\r\n[Files]\r\ncmd=a.cmd\r\ncns=a.cns\r\nsprite=a.sff\r\nanim=a.air\r\n", name);

        write(&chars.join("KOF 94/Terry/Terry.def"), &def("Terry"));
        write(&chars.join("Solo/Solo.def"), &def("Solo"));
        for n in 0..80 {
            write(&chars.join(format!("Big Pack/c{n}/c{n}.def")), &def(&format!("C{n:02}")));
        }

        let stages = layout.stages_dir();
        let stage = "[Info]\r\nname = \"S\"\r\n[StageInfo]\r\n[BGDef]\r\n";
        write(&stages.join("KOF 95/a.def"), stage);
        write(&stages.join("KOF 95/b.def"), stage);
        write(&stages.join("Temple/Temple.def"), stage);
        write(&stages.join("Loose.def"), stage);

        let found = scan_characters(&layout);
        assert_eq!(found.len(), 82);
        let terry = found.iter().find(|c| c.name == "Terry").unwrap();
        assert_eq!(terry.collection, "KOF 94");
        assert_eq!(found.iter().find(|c| c.name == "Solo").unwrap().collection, "");
        assert_eq!(found.iter().filter(|c| c.collection == "Big Pack").count(), 80);

        let st = scan_stages(&layout);
        assert_eq!(st.iter().filter(|s| s.collection == "KOF 95").count(), 2);
        assert!(st.iter().filter(|s| s.collection.is_empty()).count() == 2);

        // Cache: an edited file is read again.
        std::thread::sleep(std::time::Duration::from_millis(20));
        write(&chars.join("KOF 94/Terry/Terry.def"), &def("Terry Bogard"));
        let again = scan_characters(&layout);
        assert!(again.iter().any(|c| c.name == "Terry Bogard"));
        assert_eq!(again.len(), 82);
    }

    #[test]
    fn missing_screenpack_lifebar() {
        let layout = temp_engine("nofight");
        let root = layout.engine_root.clone();
        layout.ensure_folders();

        write(&root.join("data/fight.def"), "[Files]\r\n[Lifebar]\r\n");
        let pack = layout.screenpacks_dir().join("CvS/cvsbe");
        write(&pack.join("system.def"), "[Files]\r\nselect = select.def\r\nfight = fight/fight.def\r\nfont2 = fight/font/ZS_Time.fnt\r\nfont3 = font/title.def;enter48.def\r\n[Select Info]\r\nrows = 1\r\ncolumns = 2\r\n");
        write(&pack.join("select.def"), "[Characters]\r\n");
        write(&pack.join("font/title.def"), "");
        write(&root.join("chars/kfm/kfm.def"), "[Info]\r\nname=kfm\r\n[Files]\r\nsprite=kfm.sff\r\n");
        write(&layout.lifebars_dir().join("CVS/fight.def"), "[Files]\r\n[Lifebar]\r\n");
        write(&layout.lifebars_dir().join("CVS/font/ZS_Time.fnt"), "");

        let motif = "IKEMEN-GO-Launcher/Screenpacks/CvS/cvsbe/system.def".to_string();
        let base = LaunchSpec {
            motif: Some(motif),
            characters: vec![],
            stages: vec![],
            lifebar: None,
            random_slot: false,
            grid: Some(vec![Some("chars/kfm/kfm.def".into())]),
            extras: vec![],
            params: Default::default(),
            maxmatches: vec![],
        };

        // "Default" with no fight.def in the screenpack: engine lifebar.
        let plan = prepare_launch(&layout, &base).unwrap();
        let system = fs::read_to_string(pack.join(LAUNCH_SYSTEM)).unwrap();
        assert!(system.contains("fight = data/fight.def"), "{}", system);
        assert!(system.contains("font2 = IKEMEN-GO-Launcher/Lifebars/CVS/font/ZS_Time.fnt"), "{}", system);
        assert_eq!(plan.warnings.len(), 1);

        // Lifebar chosen: fonts moved with it are found there.
        let spec = LaunchSpec { lifebar: Some("IKEMEN-GO-Launcher/Lifebars/CVS/fight.def".into()), ..base };
        let plan = prepare_launch(&layout, &spec).unwrap();
        let system = fs::read_to_string(pack.join(LAUNCH_SYSTEM)).unwrap();
        assert!(system.contains("fight = IKEMEN-GO-Launcher/Lifebars/CVS/fight.def"));
        assert!(system.contains("font2 = IKEMEN-GO-Launcher/Lifebars/CVS/font/ZS_Time.fnt"), "{}", system);
        assert!(system.contains("font3 = font/title.def"));
        assert!(plan.warnings.is_empty());
    }

    #[test]
    fn full_flow() {
        let layout = temp_engine("flow");
        let root = layout.engine_root.clone();
        layout.ensure_folders();

        write(&root.join("data/system.def"), "[Info]\r\nname=x\r\n\r\n[Files]\r\nspr = system.sff\r\nselect = select.def ;list\r\nfight = fight.def\r\n\r\n[Music]\r\ntitle.bgm = a.mp3\r\n");
        write(&root.join("data/select.def"), "[Characters]\r\nkfm\r\nrandomselect\r\n\r\n[ExtraStages]\r\nstages/old.def\r\n\r\n[Options]\r\narcade.maxmatches = 6\r\n");
        write(&root.join("save/config.ini"), "[Config]\r\nMotif = data/system.def\r\n");

        let char_def = "[Info]\r\nname=\"A\"\r\ndisplayname=\"Alpha\"\r\n[Files]\r\ncmd=a.cmd\r\ncns=a.cns\r\nsprite=a.sff\r\nanim=a.air\r\npal1=p/1.act\r\n";
        write(&layout.characters_dir().join("Group/A/A.def"), char_def);
        write(&layout.characters_dir().join("Group/A/a.sff"), "");
        write(&layout.characters_dir().join("Group/A/a.air"), "");
        write(&layout.characters_dir().join("Group/A/p/1.act"), "");
        write(&layout.characters_dir().join("Group/A/Ending.def"), "[SceneDef]\r\nspr=e.sff\r\n");
        write(&root.join("chars/kfm/kfm.def"), "[Info]\r\nname=\"Kung Fu Man\"\r\n[Files]\r\ncns=k.cns\r\nsprite=kfm.sff\r\nanim=kfm.air\r\n");

        write(&root.join("stages/kfm.def"), "[Info]\r\nname=\"KFM\"\r\n[StageInfo]\r\nzoffset=200\r\n[BGDef]\r\nspr=kfm.sff\r\n");
        write(&root.join("stages/inter.def"), "[Info]\r\nname=\"I\"\r\nattachedChar = x/y.def\r\n[BGDef]\r\n");
        write(&root.join("stages/x/y.def"), "[Info]\r\nname=\"attached\"\r\n[Files]\r\ncns=y.cns\r\nsprite=y.sff\r\nanim=y.air\r\n");
        write(&layout.lifebars_dir().join("SF6/fight.def"), "[Files]\r\n[Lifebar]\r\n");
        write(&layout.lifebars_dir().join("SF6/fight 1280x720/fight.def"), "[Files]\r\n[Lifebar]\r\n");
        write(&layout.lifebars_dir().join("SF2/data/fight.def"), "[Files]\r\n[Lifebar]\r\n");
        write(&layout.lifebars_dir().join("VPFG_2.0/VP_Fight.def"), "[Info]\r\nname = VPFG\r\n[Files]\r\nsff = VP_Fight.sff\r\n[Face]\r\n[Combo]\r\n");
        write(&layout.lifebars_dir().join("VPFG_2.0/VP_FX.def"), "[Info]\r\n[Files]\r\nsff = x.sff\r\n");
        write(&layout.lifebars_dir().join("VPFG_2.0/font/name.def"), "[Def]\r\n[FNTv2]\r\n");

        let chars = scan_characters(&layout);
        let names: Vec<_> = chars.iter().map(|c| c.name.as_str()).collect();
        assert_eq!(names, vec!["Alpha", "Kung Fu Man"]);
        assert_eq!(chars[0].folder, "Group/A");
        assert_eq!(chars[0].palette.as_deref(), Some("IKEMEN-GO-Launcher/Characters/Group/A/p/1.act"));
        assert_eq!(chars[1].source, "engine");
        assert_eq!(
            chars[0].info,
            vec![("name".to_string(), "A".to_string()), ("displayname".to_string(), "Alpha".to_string())]
        );

        let stages = scan_stages(&layout);
        assert_eq!(stages.len(), 2, "{:?}", stages);
        assert!(stages.iter().any(|s| s.stage_type == "Interactive"));

        let lifebars = scan_lifebars(&layout);
        let names: Vec<_> = lifebars.iter().map(|l| l.name.as_str()).collect();
        assert_eq!(names, vec!["SF2", "SF6", "SF6 / fight 1280x720", "VPFG / VP_Fight"]);
        assert_eq!(lifebars[2].resolution, "1280x720");

        let preview = save_preview(&layout, "lifebars", &lifebars[1].id, b"img", "jpg").unwrap();
        assert!(preview.starts_with("IKEMEN-GO-Launcher/Previews/lifebars/"));
        assert_eq!(scan_lifebars(&layout)[1].preview.as_deref(), Some(preview.as_str()));

        let spec = LaunchSpec {
            motif: None,
            characters: vec![chars[0].id.clone(), chars[1].id.clone(), "chars/gone/gone.def".into()],
            stages: vec!["stages/kfm.def".into()],
            lifebar: Some(lifebars[1].id.clone()),
            random_slot: true,
            grid: None,
            extras: vec![],
            params: Default::default(),
            maxmatches: vec![],
        };

        assert!(default_lifebar(&layout).is_none());
        write(&root.join("data/fight.def"), "[Files]\r\n");
        let (default_id, default_preview) = default_lifebar(&layout).unwrap();
        assert_eq!(default_id, "data/fight.def");
        assert!(default_preview.is_none());
        save_preview(&layout, "lifebars", "data/fight.def", b"img", "png").unwrap();
        assert!(default_lifebar(&layout).unwrap().1.unwrap().ends_with("data_fight_def.png"));

        let plan = prepare_launch(&layout, &spec).unwrap();
        assert_eq!(plan.system_arg, "data/system.launcher.def");
        assert_eq!(plan.missing, vec!["chars/gone/gone.def"]);

        let select = fs::read_to_string(root.join("data/select.launcher.def")).unwrap();
        assert!(select.contains("[Characters]\r\n../IKEMEN-GO-Launcher/Characters/Group/A/A.def\r\nkfm/kfm.def\r\nrandomselect\r\n"));
        assert!(select.contains("[ExtraStages]\r\nstages/kfm.def\r\n"));
        assert!(select.contains("[Options]\r\narcade.maxmatches = 6"));
        assert!(!select.contains("stages/old.def"));

        let system = fs::read_to_string(root.join("data/system.launcher.def")).unwrap();
        assert!(system.contains("select = select.launcher.def\r\n"));
        assert!(system.contains("fight = IKEMEN-GO-Launcher/Lifebars/SF6/fight.def\r\n"));
        assert!(system.contains("[Music]\r\ntitle.bgm = a.mp3"));

        // Originals untouched.
        assert!(fs::read_to_string(root.join("data/system.def")).unwrap().contains("fight = fight.def"));

        // Missing fight key is inserted under [Files].
        let text = set_files_keys("[Files]\r\nspr=a\r\n[X]\r\nfight=no\r\n", &[("fight", "f.def")]);
        assert_eq!(text, "[Files]\r\nfight = f.def\r\nspr=a\r\n[X]\r\nfight=no\r\n");
    }

    #[test]
    fn screenpacks_and_slots() {
        let layout = temp_engine("screenpacks");
        let root = layout.engine_root.clone();
        layout.ensure_folders();

        let motif = "[Info]\r\nname = IKEMEN1\r\nauthor = X\r\nlocalcoord = 1280,720\r\n[Files]\r\nselect = select.def\r\nfight = fight.def\r\n[Select Info]\r\nrows = 2\r\ncolumns = 3\r\ncell.0-0.skip = 1\r\ncell.9-9.skip = 1\r\ncell.1-1.skip = 0\r\n";
        write(&root.join("data/system.def"), motif);
        write(&root.join("data/fight.def"), "[Files]\r\n");
        write(&root.join("data/select.def"), "[Characters]\r\n");
        write(&root.join("data/launcher_profiles/x/system.def"), motif);
        write(&root.join("data/system.launcher.def"), motif);
        write(&root.join("data/fight2.def"), "[Files]\r\n");
        write(&layout.screenpacks_dir().join("MvC/system.def"), "[Info]\r\nname=MvC\r\n[Files]\r\nfight = fight.def\r\n[Select Info]\r\nrows=5\r\ncolumns=10\r\n");
        write(&layout.screenpacks_dir().join("MvC/fight.def"), "[Files]\r\n");

        let packs = scan_screenpacks(&layout);
        let names: Vec<_> = packs.iter().map(|p| (p.name.as_str(), p.slots)).collect();
        assert_eq!(names, vec![("IKEMEN1", 5), ("MvC", 50)]);
        assert_eq!(packs[0].skip_cells, vec![(0, 0)]);
        assert_eq!(packs[0].portrait_spr, (9000, 0));
        assert_eq!(packs[0].cell_size, (25.0, 25.0));
        assert!(packs[0].previews.is_empty());

        // Carousel images
        assert_eq!(packs[1].package, "IKEMEN-GO-Launcher/Screenpacks/MvC");
        assert_eq!(packs[0].package, "data");
        let a = add_preview(&layout, "screenpacks", &packs[1].package, b"a", "jpg").unwrap();
        let b = add_preview(&layout, "screenpacks", &packs[1].package, b"b", "png").unwrap();
        assert!(a.ends_with("/001.jpg") && b.ends_with("/002.png"), "{a} {b}");
        write(&layout.screenpacks_dir().join("MvC/preview.png"), "p");
        let packs = scan_screenpacks(&layout);
        assert_eq!(packs[1].previews.len(), 3);
        assert!(packs[1].previews[0].ends_with("MvC/preview.png"));
        delete_preview(&layout, &a).unwrap();
        assert!(delete_preview(&layout, &packs[1].previews[0]).is_err());
        assert_eq!(scan_screenpacks(&layout)[1].previews.len(), 2);

        let text = "[Select Info]\r\nrows=2\r\ncolumns=2\r\ncell.size = 30, 20\r\nportrait.spr = 9000,1\r\ncell.bg.spr = 150,0\r\ncell.1-1.skip=1\r\ncell.0-1.skip = 1\r\n";
        let grid = motif_grid(text).unwrap();
        assert_eq!(grid.skip_cells, vec![(0, 1), (1, 1)]);
        assert_eq!(sprite_pair(text, "portrait.spr"), Some((9000, 1)));
        assert_eq!(sprite_pair(text, "cell.random.spr"), None);
        assert_eq!(packs[0].localcoord, "1280x720");
        assert_eq!(packs[0].lifebar.as_deref(), Some("data/fight.def"));
        assert_eq!(packs[1].lifebar.as_deref(), Some("IKEMEN-GO-Launcher/Screenpacks/MvC/fight.def"));

        for n in 0..6 {
            write(&root.join(format!("chars/c{n}/c{n}.def")), "[Files]\r\n");
        }

        let spec = LaunchSpec {
            motif: Some("data/system.def".into()),
            characters: (0..6).map(|n| format!("chars/c{n}/c{n}.def")).collect(),
            stages: vec![],
            lifebar: None,
            random_slot: true,
            grid: None,
            extras: vec![],
            params: Default::default(),
            maxmatches: vec![],
        };

        prepare_launch(&layout, &spec).unwrap();
        let select = fs::read_to_string(root.join("data/select.launcher.def")).unwrap();
        assert!(select.contains("[Characters]\r\nc0/c0.def\r\nc1/c1.def\r\nc2/c2.def\r\nc3/c3.def\r\nrandomselect\r\nc4/c4.def, exclude = 1\r\nc5/c5.def, exclude = 1\r\n"), "{}", select);

        let spec = LaunchSpec { motif: Some("IKEMEN-GO-Launcher/Screenpacks/MvC/system.def".into()), ..spec };
        let plan = prepare_launch(&layout, &spec).unwrap();
        assert_eq!(plan.system_arg, "IKEMEN-GO-Launcher/Screenpacks/MvC/system.launcher.def");
        assert!(!fs::read_to_string(layout.screenpacks_dir().join("MvC/select.launcher.def")).unwrap().contains("exclude"));

        // Grid editor layout: gaps become skipslot, trailing gaps are
        // dropped, cells beyond the grid become extras.
        let cell = |n: u32| Some(format!("chars/c{n}/c{n}.def"));
        let spec = LaunchSpec {
            motif: Some("data/system.def".into()),
            grid: Some(vec![cell(0), None, Some("randomselect".into()), Some("chars/gone/gone.def".into()), cell(1), cell(2), None]),
            extras: vec!["chars/c5/c5.def".into()],
            ..spec
        };
        let plan = prepare_launch(&layout, &spec).unwrap();
        assert_eq!(plan.missing, vec!["chars/gone/gone.def"]);
        let select = fs::read_to_string(root.join("data/select.launcher.def")).unwrap();
        assert!(select.contains("[Characters]\r\nc0/c0.def\r\nskipslot\r\nrandomselect\r\nskipslot\r\nc1/c1.def\r\nc2/c2.def, exclude = 1\r\nc5/c5.def, exclude = 1\r\n\r\n[ExtraStages]"), "{}", select);
    }

    #[test]
    fn packages_params_and_maxmatches() {
        let layout = temp_engine("packages");
        let root = layout.engine_root.clone();
        layout.ensure_folders();

        let pack = layout.screenpacks_dir().join("CvS BE");
        let system = |rows: u32| format!("[Info]\r\nname = \"Capcom VS SNK\"\r\n[Files]\r\nselect = select.def\r\n[Select Info]\r\nrows = {rows}\r\ncolumns = 34;20\r\n");
        write(&pack.join("cvsbe/system.def"), &system(6));
        write(&pack.join("cvsbe/120 slots.def"), &system(3));
        write(&pack.join("cvsbe/start.def"), "[Info]\r\nname = intro\r\n[SceneDef]\r\n");
        write(&pack.join("cvsbe/select.def"), "[Characters]\r\n[Options]\r\narcade.maxmatches = 6,1,1,0,0,0,0,0,0,0\r\nsurvival.maxmatches = -1,0,0,0,0,0,0,0,0,0\r\n");

        let packs = scan_screenpacks(&layout);
        let packs: Vec<_> = packs.iter().filter(|p| p.source == "launcher").collect();
        assert_eq!(packs.len(), 2);
        assert!(packs.iter().all(|p| p.package == "IKEMEN-GO-Launcher/Screenpacks/CvS BE" && p.package_name == "CvS BE"));
        let mut variants: Vec<_> = packs.iter().map(|p| (p.variant.as_str(), p.slots)).collect();
        variants.sort();
        assert_eq!(variants, vec![("120 slots", 102), ("system", 204)]);
        assert_eq!(packs[0].maxmatches[0], ("arcade".to_string(), "6,1,1,0,0,0,0,0,0,0".to_string()));

        // Parameters: exclude before unlock (IKEMEN reads unlock to the end).
        let p = CharParams { hidden: 2, order: Some(3), ordersurvival: None, bonus: true, unlock: Some("stats.modes.arcade.clear >= 1; x\n".into()) };
        assert_eq!(char_params_suffix(Some(&p), true), ", hidden = 2, order = 3, bonus = 1, exclude = 1, unlock = stats.modes.arcade.clear >= 1 x");
        assert_eq!(char_params_suffix(Some(&CharParams { order: Some(1), ..Default::default() }), false), "");
        assert_eq!(char_params_suffix(None, true), ", exclude = 1");

        for n in 0..2 {
            write(&root.join(format!("chars/c{n}/c{n}.def")), "[Files]\r\n");
        }

        let mut params = std::collections::HashMap::new();
        params.insert("chars/c1/c1.def".to_string(), CharParams { bonus: true, ..Default::default() });

        let spec = LaunchSpec {
            motif: Some(packs.iter().find(|p| p.variant == "system").unwrap().id.clone()),
            characters: vec![],
            stages: vec![],
            lifebar: None,
            random_slot: false,
            grid: Some(vec![Some("chars/c0/c0.def".into())]),
            extras: vec!["chars/c1/c1.def".into()],
            params,
            maxmatches: vec![("arcade".into(), "8,1,0,0,0,0,0,0,0,0".into()), ("team".into(), "3,0,0,0,0,0,0,0,0,0".into())],
        };

        prepare_launch(&layout, &spec).unwrap();
        let select = fs::read_to_string(pack.join("cvsbe/select.launcher.def")).unwrap();
        assert!(select.contains("c0/c0.def\r\nc1/c1.def, bonus = 1, exclude = 1\r\n"), "{select}");
        assert!(select.contains("[Options]\r\nteam.maxmatches = 3,0,0,0,0,0,0,0,0,0\r\narcade.maxmatches = 8,1,0,0,0,0,0,0,0,0\r\nsurvival.maxmatches = -1"), "{select}");

        let text = apply_maxmatches("[Characters]\r\n", &[("arcade".into(), "1".into())]);
        assert_eq!(text, "[Characters]\r\n\r\n[Options]\r\narcade.maxmatches = 1\r\n");
    }

    #[test]
    fn profile_names() {
        assert_eq!(profile_file_name("Clashbound Arcade"), "Clashbound Arcade.json");
        assert_eq!(profile_file_name("Ação/2"), "Ação_2.json");
        assert_eq!(profile_file_name("  "), "Profile.json");
        assert_eq!(profile_file_name("con"), "con_.json");
        assert_eq!(profile_file_name("COM1"), "COM1_.json");
        assert_eq!(profile_file_name("Combo"), "Combo.json");
    }

    #[test]
    fn profile_files() {
        let dir = std::env::temp_dir().join("ikl_test_profiles");
        let _ = fs::remove_dir_all(&dir);

        save_profile_file(&dir, "A/B", None, "1").unwrap();
        // Another profile that maps to the same file is refused.
        assert!(save_profile_file(&dir, "A_B", None, "2").is_err());
        assert_eq!(fs::read_to_string(dir.join("A_B.json")).unwrap(), "1");

        // Normal save and rename.
        save_profile_file(&dir, "A/B", Some("A/B"), "3").unwrap();
        save_profile_file(&dir, "Arcade", Some("A/B"), "4").unwrap();
        assert!(!dir.join("A_B.json").exists());

        // Case-only rename keeps the profile.
        save_profile_file(&dir, "ARCADE", Some("Arcade"), "5").unwrap();
        let names: Vec<String> = fs::read_dir(&dir).unwrap().flatten().map(|e| e.file_name().to_string_lossy().to_string()).collect();
        assert_eq!(names, vec!["ARCADE.json".to_string()]);
        assert_eq!(fs::read_to_string(dir.join("ARCADE.json")).unwrap(), "5");
    }

    #[test]
    fn old_config_json_and_commas() {
        assert_eq!(json_motif("{\n  \"Motif\": \"data/mvc/system.def\",\n}").as_deref(), Some("data/mvc/system.def"));
        assert_eq!(json_motif("{\"Motif\" : \"data\\\\x\\\\system.def\"}").as_deref(), Some("data/x/system.def"));
        assert_eq!(json_motif("{}"), None);

        let layout = temp_engine("commas");
        let root = layout.engine_root.clone();
        write(&root.join("data/system.def"), "[Files]\r\nselect = select.def\r\n[Select Info]\r\nrows=1\r\ncolumns=3\r\n");
        write(&root.join("data/mvc/system.def"), "[Files]\r\n[Select Info]\r\nrows=1\r\ncolumns=3\r\n");
        write(&root.join("save/config.json"), "{\"Motif\": \"data/mvc/system.def\"}");
        assert_eq!(engine_motif(&layout), "data/mvc/system.def");

        write(&root.join("chars/a/a.def"), "[Files]\r\n");
        write(&root.join("chars/b,c/b.def"), "[Files]\r\n");
        write(&root.join("stages/s,1.def"), "[BGDef]\r\n");

        let spec = LaunchSpec {
            motif: Some("data/system.def".into()),
            characters: vec![],
            stages: vec!["stages/s,1.def".into()],
            lifebar: None,
            random_slot: false,
            grid: Some(vec![Some("chars/a/a.def".into()), Some("chars/b,c/b.def".into())]),
            extras: vec![],
            params: Default::default(),
            maxmatches: vec![],
        };

        let plan = prepare_launch(&layout, &spec).unwrap();
        assert_eq!(plan.warnings.len(), 2, "{:?}", plan.warnings);
        let select = fs::read_to_string(root.join("data/select.launcher.def")).unwrap();
        assert!(select.contains("[Characters]\r\na/a.def\r\nskipslot\r\n"), "{select}");
        assert!(!select.contains("s,1"));
    }
}
