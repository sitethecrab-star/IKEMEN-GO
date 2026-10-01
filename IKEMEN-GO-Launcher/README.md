# IKEMEN GO Launcher

**One Engine. Multiple Games.**

Created by **Muttley Creations**.

Profile launcher for IKEMEN GO: pick a screenpack, characters, stages and lifebar, save them as a profile and play — without changing the original engine files. Similar to VSelect.

## Download

👉 **[Download the latest version (Releases)](https://github.com/sitethecrab-star/IKEMEN-GO/releases)** — get `IKEMEN-GO-Launcher-v1.0.0.zip`.

1. Extract the `IKEMEN-GO-Launcher` folder **inside your IKEMEN GO folder**, next to `Ikemen_GO.exe`.
2. Open `IKEMEN GO Launcher.exe`. Nothing to install.

Requirements: Windows 10/11 (64-bit), IKEMEN GO 1.0, Microsoft Edge WebView2 (already included in Windows 11 and up-to-date Windows 10).

> The `.exe` is not digitally signed, so Windows may show "Windows protected your PC": click **More info → Run anyway**.

This folder contains the full source code. End users only need the `.zip` from Releases.

## Version 1.0.0

- Zero configuration: the Launcher lives inside the IKEMEN GO folder and finds the engine by itself.
- Own library (`Characters/`, `Stages/`, `Lifebars/`, `Screenpacks/`) plus the engine's `chars/`, `stages/` and `data/`.
- Subfolders are scanned; group folders become collections (e.g. `Characters/KOF 94/Terry/`, `Stages/KOF 95/`), with collapsible headers, a collection filter, and list or thumbnail views.
- Fast library refresh: parallel scanning and a cache that only re-reads changed .def files; images load as they scroll into view.
- Animated character preview (SFF v1/v2 + AIR), with action selection (0 = stand, 181, etc.).
- Real screenpack select screen (animated `[SelectBG]` layers, cell positions and per-row overrides) with drag & drop grid editing, or a simple grid.
- Stage, lifebar and screenpack galleries with 1280x720 preview images (screenpacks: image carousel).
- Per-character select.def options: hidden/secret/locked, unlock, arcade/survival order, bonus.
- Order tab: arcade/survival orders, maxmatches, and a bonus stage in the arcade route.
- Profiles are saved automatically in `Profiles/` with relative paths.
- PLAY creates `system.launcher.def` and `select.launcher.def` next to the screenpack and starts the engine with `-r`.

## Layout

```text
IKEMEN GO/
├── Ikemen_GO.exe
├── chars/                     engine characters
├── stages/                    engine stages
├── data/system.def            default screenpack (save/config.ini)
└── IKEMEN-GO-Launcher/
    ├── IKEMEN GO Launcher.exe
    ├── Characters/            one folder per character (subfolders allowed)
    ├── Stages/                extra stages
    ├── Lifebars/              one folder per lifebar (fight.def or any other name, e.g. VP_Fight.def)
    ├── Screenpacks/           one folder per screenpack, with system.def (variants are grouped)
    ├── Previews/              1280x720 images set in the app
    └── Profiles/              profiles (.json)
```

## How PLAY works

1. Uses the profile screenpack (Screenpack tab) or, if none, `save/config.ini` → `Motif` (older IKEMEN GO: `save/config.json`). The config file is never changed.
2. Creates in the screenpack folder:
   - `select.launcher.def` — `[Characters]` (grid, `skipslot` gaps, extras with `exclude = 1`, per-character params) and `[ExtraStages]` from the profile, plus the other sections of the original `select.def` (`[Options]` with the profile maxmatches, etc.).
   - `system.launcher.def` — copy of the screenpack `system.def` with `select` and `fight` pointing to the profile. If the screenpack's own lifebar does not exist, the engine default (`data/fight.def`) is used; fonts that moved with a lifebar are looked up in the lifebar folders.
3. Starts `Ikemen_GO.exe -r <screenpack folder>/system.launcher.def`.

Paths with a comma (`,`) are skipped with a warning, because `select.def` uses commas to separate parameters.

Original files are never modified. Launcher library characters are written as `../IKEMEN-GO-Launcher/Characters/...` (relative to `chars/`).

## Profile format (v3)

```json
{
  "version": 3,
  "name": "Clashbound",
  "motif": "IKEMEN-GO-Launcher/Screenpacks/CvS/cvsbe/system.def",
  "grid": ["chars/kfm/kfm.def", null, "randomselect"],
  "extras": ["IKEMEN-GO-Launcher/Characters/Bonus/DuckHunt/DuckHunt.def"],
  "params": { "chars/kfm/kfm.def": { "order": 2 } },
  "maxmatches": { "arcade": [6, 1, 1, 0, 0, 0, 0, 0, 0, 0] },
  "bonusStage": { "enabled": true, "after": 1, "chars": ["IKEMEN-GO-Launcher/Characters/Bonus/DuckHunt/DuckHunt.def"] },
  "stages": ["stages/kfm.def"],
  "lifebar": "IKEMEN-GO-Launcher/Lifebars/SF6/fight.def"
}
```

Older profiles (v2, plain `characters` list) are converted automatically.

## Screenpacks and slots

- Screenpacks are found in `data/` and `Screenpacks/` (any `.def` with `[Select Info]`, any file name).
- Several `.def` files of the same screenpack (e.g. `system.def`, `120 slots.def`, `204 slots (wide).def`) are shown in one card with a variant selector. The package is the first folder inside `Screenpacks/`.
- Slots = `rows × columns` of `[Select Info]`, minus cells with `cell.C-R.skip = 1`. The random cell takes one slot.
- Characters that do not fit (e.g. after switching to a smaller screenpack) become extras (`exclude = 1`).

## Bonus stage

IKEMEN builds the arcade route from `arcade.maxmatches` (N fights against order 1, then order 2...). The bonus stage is a new order inserted after the chosen order, with one fight against a bonus character. At launch, the following orders are shifted by one, the bonus characters get `bonus = 1` and `ordersurvival = 10`, and Time Attack skips the bonus order.

## Development

Requirements (developer only): Node.js and Rust.

```bash
npm install
npm run tauri dev      # run in development mode
npm run tauri build    # build the executable
```

The version lives in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` (keep the three equal); the app reads it from `package.json`.

Or just double-click **`BUILD_PACKAGE.bat`**: it installs the dependencies (first time), builds, updates `ikemen_go_launcher.exe` in this folder and creates `Package/IKEMEN-GO-Launcher-v<version>.zip` from `package-template/` — ready to share. End users only need the zip.

Rust core tests (no Tauri needed):

```bash
rustc --edition 2021 --test src-tauri/src/engine.rs -o engine_tests && ./engine_tests
rustc --edition 2021 --test src-tauri/src/sff.rs -o sff_tests && ./sff_tests
```

## Credits

IKEMEN GO Launcher — created by **Muttley Creations**.

IKEMEN GO is developed by the Ikemen GO team. This Launcher is an independent, unofficial tool and is not affiliated with the Ikemen GO project. Characters, stages, lifebars and screenpacks belong to their respective authors.
