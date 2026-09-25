# IKEMEN-GO Modules

Open-source modules and tools for **IKEMEN GO**.

This repository provides reusable modules designed to extend the functionality of IKEMEN GO without requiring modifications to the engine source code.

---

## Available Modules

### Character Info

A character information module for IKEMEN GO that displays an individual character information card directly on the character select screen.

**Features:**

- Character information cards.
- Player 1 and Player 2 support.
- Shared SFF system.
- Automatic character identification.
- Configurable keyboard shortcut.
- No modifications to individual character files.

[Open Character Info](./Character-Info)

---

### Random Screen BGM

A generic random screen BGM manager for IKEMEN GO.

**Features:**

- Random background music selection.
- Shuffle-bag system to prevent immediate repetition.
- Configurable music playlist.
- Optional music title display.
- Optional SFF music cards.
- Independent text and SFF controls.
- Configurable position, size, font, color, and timing.

[Open Random Screen BGM](./Random-Screen-BGM)

---

## Compatibility

The modules in this repository are developed and tested for:

**IKEMEN GO 1.0.0**

Please check the documentation of each module for specific requirements and installation instructions.

---

## Repository Structure

```text
IKEMEN-GO/
│
├── Character-Info/
│   ├── character_info.lua
│   ├── character_info.sff
│   └── README.md
│
├── Random-Screen-BGM/
│   ├── external/
│   │   └── mods/
│   │       ├── random_screen_bgm.lua
│   │       └── random_screen_bgm/
│   │           └── music.sff
│   │
│   └── README.md
│
└── README.md

About

This repository is intended to provide modular and reusable tools for the IKEMEN GO community.

Each module is maintained independently and includes its own documentation and installation instructions.

License

See the documentation and license information provided with each module.
