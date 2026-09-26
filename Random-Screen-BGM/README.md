# IKEMEN-GO Random Screen BGM

A reusable random background-music manager for **IKEMEN GO 1.0.0**.

The module assigns a configurable random playlist to supported game screens and can optionally display the current track title and/or a visual music card from a shared SFF file.

## Compatibility

**IKEMEN GO 1.0.0**

The module uses IKEMEN GO's external Lua scripting and hook system and does not require modifications to the engine source code.

## Features

- Random BGM selection per supported screen.
- Shuffle-bag system to avoid repeating a track until the current playlist is exhausted.
- Independent playlists for each screen.
- Music starts immediately when the screen cycle begins.
- Optional music title display.
- Optional SFF music-card display.
- Three display modes: `text`, `sprite`, and `both`.
- Configurable title position, font, scale, alignment, color, delay, and duration.
- Configurable SFF position, scale, layer, and facing.
- Shared SFF file for all music cards.
- No engine source-code modifications required.

## Supported Screens

- Main Menu / Title
- Options
- Character Select
- Versus
- Results
- Victory
- Continue
- Hiscore
- Challenger
- Replay entry

**Game Over:** reserved for now. In IKEMEN GO 1.0.0 it is handled as a storyboard and does not expose a dedicated public hook used by this module.

## Installation

Copy the following files into the corresponding locations of the IKEMEN GO installation:

```text
external/
└── mods/
    ├── random_screen_bgm.lua
    └── random_screen_bgm/
        └── music.sff
```

Then load `random_screen_bgm.lua` through IKEMEN GO's external module system.

The module does not include music files. Add the audio files to the configured `sound/random_screen_bgm/` folders.

## Audio Folder Structure

The recommended structure is:

```text
sound/
└── random_screen_bgm/
    ├── title/
    ├── options/
    ├── select/
    ├── versus/
    ├── results/
    ├── victory/
    ├── continue/
    ├── hiscore/
    ├── challenger/
    ├── replay/
    └── gameover/
```

## Configuration

The main configuration is at the beginning of:

```text
external/mods/random_screen_bgm.lua
```

Each screen has:

- `enabled`
- `display`
- `folder`
- `playlist`

Example:

```lua
select = {
    enabled = true,
    display = "sprite",
    folder = "sound/random_screen_bgm/select/",
    playlist = {
        {
            file = "sound/random_screen_bgm/select/Street Fighter 2.mp3",
            sffGroup = 0,
            sffIndex = 1,
        },
    },
},
```

Each playlist entry requires an audio path. `sffGroup` and `sffIndex` are used when the selected track has an associated image in `music.sff`.

## Display Modes

### Text

```lua
display = "text"
```

Shows the music title.

### Sprite

```lua
display = "sprite"
```

Shows the corresponding image from the shared SFF.

### Both

```lua
display = "both"
```

Shows the music title and SFF image simultaneously.

## Music Title

The default timing is:

```lua
local musicTitleConfig = {
    enabled = true,
    delay = 3,
    duration = 6,
    label = "MUSIC: ",
}
```

The music starts immediately. The visual information appears after the configured delay and remains visible for the configured duration.

The music continues playing after the visual information disappears.

## SFF Music Cards

The default shared SFF file is:

```text
external/mods/random_screen_bgm/music.sff
```

Default native-resolution configuration:

```lua
x = 0
y = 0
scaleX = 1.00
scaleY = 1.00
```

A playlist entry can reference a sprite using:

```lua
sffGroup = 0,
sffIndex = 1,
```

The SFF can contain as many music cards as required by the project.

## Shuffle Bag

The module uses a shuffle-bag system.

When the playlist is exhausted, it is refilled and shuffled. This prevents the same track from being selected again before the other tracks in the current bag have been used.

## Music Files

Music is not included with the module.

Users must provide their own audio files and configure their paths in the playlist.

Example:

```text
sound/
└── random_screen_bgm/
    └── select/
        ├── song1.mp3
        ├── song2.mp3
        └── song3.mp3
```

## Notes

The module was tested with **IKEMEN GO 1.0.0** across the supported screens.

The Main Menu, Character Select, Versus, Results, Victory, Continue, Hiscore, Challenger and Replay flows were tested successfully. Options was also tested successfully, with an occasional audio-start inconsistency observed during repeated manual testing.

The release build has debug logging disabled.

## License

See the `LICENSE` file included with this module.

## Credits

Developed for the IKEMEN GO community.
