# IKEMEN-GO Random Screen BGM

A generic random screen BGM manager module for **IKEMEN GO**.

The module allows screens to randomly select background music from a configurable playlist, with support for optional music titles and SFF-based visual music cards.

---

## Compatibility

**IKEMEN GO 1.0.0**

Compatible with the latest **IKEMEN GO 1.0** release.

The module uses the external Lua scripting and hook system provided by IKEMEN GO and does not require modifications to the engine source code.

---

## Features

- Randomly selects background music from a configurable playlist.
- Uses a shuffle-bag system to avoid repeating songs until the playlist is exhausted.
- Supports screen-specific BGM playlists.
- Supports optional music title text.
- Supports optional SFF-based music cards.
- Supports 1280×720 SFF artwork at native resolution.
- Allows text and SFF display to be enabled or disabled independently.
- Configurable text position, size, font, alignment, and color.
- Configurable SFF position, size, layer, and facing.
- Configurable display delay and duration.
- Does not require modifications to the IKEMEN GO engine source code.
- Designed to be reusable across different IKEMEN GO projects.

---

## How It Works

The module selects a random song from the configured playlist when the supported screen is opened.

The selected song is played automatically and the module can optionally display:

1. A music title.
2. An SFF-based music card.
3. Both simultaneously.
4. Neither, if both visual options are disabled.

The playlist uses a shuffle-bag system, preventing the same song from being selected again until all available songs have been played.

---

## File Structure

A complete installation should look like this:

```text
IKEMEN-GO/
│
├── external/
│   └── mods/
│       │
│       ├── random_screen_bgm.lua
│       │
│       └── random_screen_bgm/
│           └── music.sff
│
└── ...

Installation

Copy the module files to your IKEMEN GO installation:

external/
└── mods/
    ├── random_screen_bgm.lua
    │
    └── random_screen_bgm/
        └── music.sff

The module can then be loaded through the external script system of IKEMEN GO.

Configuration

The main configuration is located at the beginning of:

external/mods/random_screen_bgm.lua

The configuration is divided into clearly marked sections.

Music Title — General

Controls whether the music title is displayed and defines its timing.

local titleConfig = {
    enabled = true,
    delay = 3,
    duration = 6,
    label = "MUSIC: ",
}
Music Title — Appearance

Controls the visual appearance of the music title.

Available settings include:

Font
X position
Y position
Horizontal scale
Vertical scale
Alignment
RGB color
SFF Music Cards

The module can display an image from a shared SFF file corresponding to the selected song.

The default SFF location is:

external/mods/random_screen_bgm/music.sff

SFF display can be enabled or disabled independently:

musicSffConfig.enabled = true

The SFF position and scale are configurable.

For 1280×720 artwork, native resolution is:

x = 0
y = 0

scaleX = 1.00
scaleY = 1.00

This displays the artwork at its original 1280×720 resolution.

Text and SFF Display Modes

The music title and SFF card can be controlled independently.

Text + SFF
titleConfig.enabled = true
musicSffConfig.enabled = true
Text only
titleConfig.enabled = true
musicSffConfig.enabled = false
SFF only
titleConfig.enabled = false
musicSffConfig.enabled = true
Both disabled
titleConfig.enabled = false
musicSffConfig.enabled = false

In this mode, the module continues to manage the random BGM selection without displaying additional visual information.

Playlist

Songs are added to the playlist in the module configuration.

Each entry can contain:

Audio file path
SFF group
SFF index

Example:

{
    file = "sound/random_screen_bgm/select/Street Fighter 2.mp3",
    sffGroup = 0,
    sffIndex = 1,
},

The user can add, remove, or replace songs according to their own project.

SFF Sprite Mapping

Each music entry can be associated with a sprite inside music.sff.

Example:

Group    Index
-----    -----
0        1
0        2
0        3

The association is defined in the playlist configuration.

For example:

0,1 → Street Fighter 2
0,2 → Mortal Kombat
0,3 → The King Of Fighters 94

The SFF file can contain as many music cards as required by the project.

Music Files

The module does not include music files.

Users should provide their own audio files and configure their paths in the playlist.

Example:

sound/
└── random_screen_bgm/
    └── select/
        ├── song1.mp3
        ├── song2.mp3
        └── song3.mp3

The audio files should be configured in random_screen_bgm.lua.

Timing

The visual elements use configurable timing.

Example:

delay = 3
duration = 6

This means:

The music starts immediately.
The visual information appears after 3 seconds.
The visual information remains visible for 6 seconds.
The music continues playing normally after the visual information disappears.
Requirements
IKEMEN GO 1.0.0
External Lua scripting
random_screen_bgm.lua
music.sff when SFF display is enabled
User-provided music files

No engine source-code modifications are required.

License

See the LICENSE file included with this module.

Credits

Developed for the IKEMEN GO community.
