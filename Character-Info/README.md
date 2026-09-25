# IKEMEN-GO Character Info

A character information module for **IKEMEN GO** that displays an individual character information card directly on the character select screen.

The module was designed to work with a **single shared SFF file**, making character management simpler and avoiding the need to create a separate folder and SFF file for every character.

---

## Compatibility

**IKEMEN GO 1.0.0**

Compatible with the latest **IKEMEN GO 1.0** release.

The module uses the external Lua scripting and hook system provided by IKEMEN GO and does not require modifications to the engine source code.

---

## Features

- Displays a character information card on the character select screen.
- Supports Player 1 and Player 2 independently.
- Uses a single shared SFF file for all character cards.
- Identifies characters automatically from their `.def` filename.
- Folder structure does not matter.
- Uses a simple character-to-sprite index mapping.
- Card is opened and closed using a configurable keyboard key.
- Supports the default `X` key.
- Does not require modifications to individual character files.
- Does not require a dedicated character information folder.
- Automatically resets when the character select screen is reset.

---

## How It Works

The module consists of two main files:

```text
external/
└── mods/
    ├── character_info.lua
    └── character_info.sff
character_info.lua

The Lua file contains the module logic, character detection, sprite mapping, screen hooks, and input handling.

character_info.sff

The SFF file contains the character information cards displayed by the module.

Multiple character cards can be stored in the same SFF file.

Installation

Copy the module files to your IKEMEN GO installation:

IKEMEN-GO/
└── external/
    └── mods/
        ├── character_info.lua
        └── character_info.sff

The module can then be loaded through the external script system of IKEMEN GO.

Character Identification

The module identifies the selected character using the character's .def filename.

For example:

characters/
├── Ryu/
│   └── Ryu.def
│
├── Ken/
│   └── Ken.def
│
└── ChunLi/
    └── ChunLi.def

The character name is used by the module to determine which information card should be displayed.

SFF Sprite Mapping

Each character information card is associated with a sprite index inside the shared SFF file.

Example:

Group    Index
-----    -----
0        1
0        2
0        3

The Lua configuration determines which sprite corresponds to each character.

This allows multiple character information cards to be stored in a single SFF file.

Player Support

The module supports both players independently.

Player 1 and Player 2 can display their respective character information cards during character selection.

Controls

The default key used to open and close the character information card is:

X

The key can be changed in the module configuration.

Configuration

The module configuration is located in:

external/mods/character_info.lua

Configuration values are documented inside the Lua file.

You can customize the module without modifying individual character .def files.

Requirements
IKEMEN GO 1.0.0
External Lua scripting enabled
character_info.lua
character_info.sff

No engine source-code modifications are required.

File Structure

A complete installation should look like this:

IKEMEN-GO/
│
├── external/
│   └── mods/
│       ├── character_info.lua
│       └── character_info.sff
│
└── ...
License

See the LICENSE file included with this module.

Credits

Developed for the IKEMEN GO community.
