// ============================================================
// IKEMEN GO Launcher — Tauri commands
// ------------------------------------------------------------
// Thin layer over engine.rs (all file logic and tests live there).
// ============================================================

mod engine;
mod sff;

use serde_json::{json, Value};
use std::{collections::HashMap, fs, process::Command, sync::OnceLock};

use crate::engine::Layout;

// ============================================================
// Layout (detected once from the Launcher location)
// ============================================================

static LAYOUT: OnceLock<Result<Layout, String>> = OnceLock::new();

fn layout() -> Result<&'static Layout, String> {
    LAYOUT
        .get_or_init(|| {
            let exe = std::env::current_exe()
                .map_err(|e| format!("Could not locate the Launcher: {}", e))?;

            let dir = exe.parent().ok_or("Invalid Launcher folder.")?;
            let layout = engine::detect_layout(dir)?;
            layout.ensure_folders();

            Ok(layout)
        })
        .as_ref()
        .map_err(Clone::clone)
}

// ============================================================
// Environment
// ============================================================

#[tauri::command]
fn get_environment() -> Value {
    match layout() {
        Ok(layout) => json!({
            "ok": true,
            "engine_root": layout.engine_root.to_string_lossy(),
            "launcher_name": layout.launcher_name(),
            "motif": engine::engine_motif(layout),
        }),
        Err(error) => json!({ "ok": false, "error": error }),
    }
}

// ============================================================
// Library
// ============================================================

#[tauri::command]
async fn scan_library() -> Result<Value, String> {
    let layout = layout()?;

    // The four scans run at the same time (each one is also parallel).
    let (found_characters, found_stages, found_lifebars, found_screenpacks) = std::thread::scope(|scope| {
        let c = scope.spawn(|| engine::scan_characters(layout));
        let s = scope.spawn(|| engine::scan_stages(layout));
        let l = scope.spawn(|| engine::scan_lifebars(layout));
        let p = scope.spawn(|| engine::scan_screenpacks(layout));
        (
            c.join().unwrap_or_default(),
            s.join().unwrap_or_default(),
            l.join().unwrap_or_default(),
            p.join().unwrap_or_default(),
        )
    });

    let characters: Vec<Value> = found_characters
        .into_iter()
        .map(|c| {
            json!({
                "id": c.id,
                "name": c.name,
                "author": c.author,
                "source": c.source,
                "folder": c.folder,
                "collection": c.collection,
                "sprite": c.sprite,
                "anim": c.anim,
                "palette": c.palette,
                "localcoord": c.localcoord,
                "info": c.info,
            })
        })
        .collect();

    let stages: Vec<Value> = found_stages
        .into_iter()
        .map(|s| {
            json!({
                "id": s.id,
                "name": s.name,
                "author": s.author,
                "source": s.source,
                "type": s.stage_type,
                "collection": s.collection,
                "preview": s.preview,
            })
        })
        .collect();

    let lifebars: Vec<Value> = found_lifebars
        .into_iter()
        .map(|l| {
            json!({
                "id": l.id,
                "name": l.name,
                "author": l.author,
                "resolution": l.resolution,
                "preview": l.preview,
            })
        })
        .collect();

    let screenpacks: Vec<Value> = found_screenpacks
        .into_iter()
        .map(|s| {
            json!({
                "id": s.id,
                "package": s.package,
                "package_name": s.package_name,
                "variant": s.variant,
                "maxmatches": s.maxmatches.iter().cloned().collect::<std::collections::HashMap<String, String>>(),
                "name": s.name,
                "author": s.author,
                "source": s.source,
                "rows": s.rows,
                "columns": s.columns,
                "skipped": s.skipped,
                "slots": s.slots,
                "localcoord": s.localcoord,
                "previews": s.previews,
                "preview": s.previews.first(),
                "lifebar": s.lifebar,
                "lifebar_preview": s.lifebar_preview,
                "skip_cells": s.skip_cells,
                "spr": s.spr,
                "cell_size": [s.cell_size.0, s.cell_size.1],
                "portrait_spr": [s.portrait_spr.0, s.portrait_spr.1],
                "cell_bg_spr": s.cell_bg_spr.map(|(g, i)| [g, i]),
                "cell_random_spr": s.cell_random_spr.map(|(g, i)| [g, i]),
            })
        })
        .collect();

    let default_lifebar = engine::default_lifebar(layout)
        .map(|(id, preview)| json!({ "id": id, "preview": preview }));

    Ok(json!({
        "characters": characters,
        "stages": stages,
        "lifebars": lifebars,
        "default_lifebar": default_lifebar,
        "screenpacks": screenpacks,
    }))
}

/// Binary file inside the engine folder (sprites, animations, images).
#[tauri::command]
async fn read_file(id: String) -> Result<tauri::ipc::Response, String> {
    let path = layout()?.resolve_id(&id)?;
    let bytes = fs::read(&path).map_err(|e| format!("{}: {}", id, e))?;

    Ok(tauri::ipc::Response::new(bytes))
}

/// One sprite of an SFF (e.g. a character portrait), without loading
/// the whole file. Returns null when the sprite does not exist.
#[tauri::command]
async fn read_sprite(id: String, group: u16, index: u16) -> Result<Value, String> {
    let path = layout()?.resolve_id(&id)?;

    Ok(match sff::extract_file(&path, group, index) {
        Some(r) => json!({
            "version": r.version,
            "width": r.width,
            "height": r.height,
            "axis_x": r.axis_x,
            "axis_y": r.axis_y,
            "format": r.format,
            "data": sff::encode_base64(&r.data),
            "palette": sff::encode_base64(&r.palette),
        }),
        None => Value::Null,
    })
}

/// Opens the file location in the Windows Explorer (file selected).
#[tauri::command]
async fn reveal(id: String) -> Result<(), String> {
    let layout = layout()?;
    let path = if id.trim().is_empty() {
        layout.engine_root.clone()
    } else {
        layout.resolve_id(&id)?
    };

    if !path.exists() {
        return Err(format!("File not found:\n{}", id));
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;

        let windows_path = path.to_string_lossy().replace('/', "\\");
        let mut command = Command::new("explorer");

        if path.is_file() {
            command.raw_arg(format!("/select,\"{}\"", windows_path));
        } else {
            command.raw_arg(format!("\"{}\"", windows_path));
        }

        command.spawn().map_err(|e| format!("Error opening Explorer:\n{}", e))?;
    }

    #[cfg(not(windows))]
    {
        let folder = if path.is_file() { path.parent().unwrap_or(&path).to_path_buf() } else { path };
        Command::new("xdg-open")
            .arg(folder)
            .spawn()
            .map_err(|e| format!("Error opening the folder:\n{}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn add_preview(kind: String, id: String, data_url: String, ext: String) -> Result<String, String> {
    let bytes = engine::decode_base64(&data_url)?;

    engine::add_preview(layout()?, &kind, &id, &bytes, &ext)
}

#[tauri::command]
async fn delete_preview(image: String) -> Result<(), String> {
    engine::delete_preview(layout()?, &image)
}

#[tauri::command]
async fn save_preview(kind: String, id: String, data_url: String, ext: String) -> Result<String, String> {
    let bytes = engine::decode_base64(&data_url)?;

    engine::save_preview(layout()?, &kind, &id, &bytes, &ext)
}

// ============================================================
// Profiles
// ============================================================

#[tauri::command]
async fn list_profiles() -> Result<Vec<Value>, String> {
    let dir = layout()?.profiles_dir();
    let mut profiles = Vec::new();

    let entries = match fs::read_dir(&dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(profiles),
    };

    for entry in entries.flatten() {
        let path = entry.path();

        let is_json = path
            .extension()
            .map(|e| e.eq_ignore_ascii_case("json"))
            .unwrap_or(false);

        if !is_json {
            continue;
        }

        match fs::read_to_string(&path).map(|t| serde_json::from_str::<Value>(&t)) {
            Ok(Ok(profile)) if profile.get("name").and_then(Value::as_str).is_some() => {
                profiles.push(profile)
            }
            _ => eprintln!("Profile ignored: {}", path.display()),
        }
    }

    profiles.sort_by_key(|p| {
        p.get("name")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_lowercase()
    });

    Ok(profiles)
}

#[tauri::command]
async fn save_profile(profile: Value, previous_name: Option<String>) -> Result<(), String> {
    let dir = layout()?.profiles_dir();

    let name = profile
        .get("name")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|n| !n.is_empty())
        .ok_or("The profile needs a name.")?;

    let text = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;

    engine::save_profile_file(&dir, name, previous_name.as_deref(), &text)
}

#[tauri::command]
async fn delete_profile(name: String) -> Result<(), String> {
    let file = layout()?.profiles_dir().join(engine::profile_file_name(&name));

    fs::remove_file(&file).map_err(|e| format!("Error deleting the profile:\n{}", e))
}

// ============================================================
// PLAY
// ============================================================

fn string_list(profile: &Value, key: &str) -> Vec<String> {
    profile
        .get(key)
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default()
}

/// profile.params = { "<character id>": { hidden, order, ordersurvival, bonus, unlock } }
fn char_params(profile: &Value) -> HashMap<String, engine::CharParams> {
    let mut result = HashMap::new();

    let entries = match profile.get("params").and_then(Value::as_object) {
        Some(entries) => entries,
        None => return result,
    };

    for (id, p) in entries {
        let number = |key: &str| p.get(key).and_then(Value::as_i64).map(|n| n as i32);

        result.insert(
            id.clone(),
            engine::CharParams {
                hidden: number("hidden").unwrap_or(0).clamp(0, 3) as u8,
                order: number("order"),
                ordersurvival: number("ordersurvival"),
                // true (character form) or 1 (bonus stage of the arcade route).
                bonus: p
                    .get("bonus")
                    .map(|b| b.as_bool().unwrap_or_else(|| b.as_i64().map(|n| n != 0).unwrap_or(false)))
                    .unwrap_or(false),
                unlock: p
                    .get("unlock")
                    .and_then(Value::as_str)
                    .map(str::trim)
                    .filter(|u| !u.is_empty())
                    .map(str::to_string),
            },
        );
    }

    result
}

#[tauri::command]
async fn launch_profile(profile: Value) -> Result<Value, String> {
    let layout = layout()?;

    let spec = engine::LaunchSpec {
        motif: profile
            .get("motif")
            .and_then(Value::as_str)
            .filter(|m| !m.is_empty())
            .map(str::to_string),
        characters: string_list(&profile, "characters"),
        stages: string_list(&profile, "stages"),
        lifebar: profile
            .get("lifebar")
            .and_then(Value::as_str)
            .filter(|l| !l.is_empty())
            .map(str::to_string),
        random_slot: profile
            .get("random_slot")
            .and_then(Value::as_bool)
            .unwrap_or(true),
        grid: profile.get("grid").and_then(Value::as_array).map(|cells| {
            cells
                .iter()
                .map(|cell| cell.as_str().filter(|c| !c.is_empty()).map(str::to_string))
                .collect()
        }),
        extras: string_list(&profile, "extras"),
        params: char_params(&profile),
        maxmatches: profile
            .get("maxmatches")
            .and_then(Value::as_object)
            .map(|modes| {
                engine::MAXMATCHES_KEYS
                    .iter()
                    .filter_map(|k| {
                        let values = modes.get(*k)?.as_array()?;
                        let numbers: Vec<String> = values
                            .iter()
                            .filter_map(Value::as_i64)
                            .map(|n| n.to_string())
                            .collect();

                        (!numbers.is_empty()).then(|| (k.to_string(), numbers.join(",")))
                    })
                    .collect()
            })
            .unwrap_or_default(),
    };

    let plan = engine::prepare_launch(layout, &spec)?;

    Command::new(&layout.engine_exe)
        .current_dir(&layout.engine_root)
        .arg("-r")
        .arg(&plan.system_arg)
        .spawn()
        .map_err(|e| format!("Error starting IKEMEN GO:\n{}", e))?;

    Ok(json!({ "missing": plan.missing, "warnings": plan.warnings }))
}

// ============================================================
// Startup
// ============================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_environment,
            scan_library,
            read_file,
            read_sprite,
            reveal,
            save_preview,
            add_preview,
            delete_preview,
            list_profiles,
            save_profile,
            delete_profile,
            launch_profile
        ])
        .run(tauri::generate_context!())
        .expect("error while running IKEMEN GO Launcher");
}
