-- ============================================================
-- RANDOM SCREEN BGM
-- Ikemen GO 1.0.0
-- ============================================================
--
-- Generic random BGM manager for screen music.
--
-- Current screen:
--   Character Select
--
-- BGM folder:
--   sound/random_screen_bgm/select/
--
-- Shared music SFF:
--   external/mods/random_screen_bgm/music.sff
--
-- Music title:
--   appears after 3 seconds
--   remains visible for 6 seconds
--   disappears automatically
--
-- SFF mapping:
--   Street Fighter 2       -> 0,1
--   Mortal Kombat          -> 0,2
--   The King Of Fighters 94-> 0,3
--
-- ============================================================


-- ============================================================
-- CONFIGURATION
-- ============================================================
--
-- Everything in this section is intended to be edited by the
-- project author. The rest of the file is the module engine.
--
-- ============================================================


-- ============================================================
-- QUICK CONFIGURATION — EDIT ONLY THE MARKED BLOCKS
-- ============================================================
--
-- [1] MUSIC TITLE — GERAL
--     Enable/disable text, set appearance delay, duration, and prefix.
--
-- [2] MUSIC TITLE — APARÊNCIA
--     Font, position, size, alignment, and color.
--
-- [3] MUSIC SFF — APARÊNCIA
--     Enable/disable SFF, set file, position, size, and layer.
--
-- [4] PLAYLIST
--     Músicas e respectivos sprites do music.sff.
--
-- The rest of the file contains the internal module logic.
-- ============================================================

-- ============================================================
-- 1. MUSIC TITLE — GENERAL
-- ============================================================

local musicTitleConfig = {

    -- Enable or disable the music title.
    enabled = true,              -- <<< EDIT HERE: true = text enabled | false = disabled

    -- Seconds before the title appears.
    delay = 3,                   -- <<< EDIT HERE: seconds before appearing

    -- Seconds the title remains visible.
    duration = 6,                -- <<< EDIT HERE: seconds visible

    -- Text shown before the song name.
    label = "MUSIC: ",           -- <<< EDIT HERE: text displayed before the song name

}


-- ============================================================
-- 2. MUSIC TITLE — APPEARANCE
-- ============================================================

local musicTitleAppearance = {

    -- Font file.
    -- You can replace this with another .def font.
    font = "font/Roboto-Condensed.def", -- <<< EDIT HERE: font

    -- Position in the 1280x720 local coordinate space.
    x = 250,                     -- <<< EDIT HERE: X position
    y = 690,                     -- <<< EDIT HERE: Y position

    -- Text size.
    scaleX = 0.50,               -- <<< EDIT HERE: horizontal size
    scaleY = 0.50,               -- <<< EDIT HERE: vertical size

    -- Alignment:
    -- 0 = left
    -- 1 = center
    -- 2 = right
    align = 0,                   -- <<< EDIT HERE: 0 = left | 1 = center | 2 = right

    -- Text color (RGB).
    -- 255,255,255 = white
    -- 255,0,0   = red
    -- 0,255,0   = green
    -- 0,0,255   = blue
    color = {
        r = 0,                      -- <<< EDIT HERE: red (0-255)
        g = 0,                      -- <<< EDIT HERE: green (0-255)
        b = 255,                    -- <<< EDIT HERE: blue (0-255)
    },

}


-- ============================================================
-- 3. MUSIC SFF — APPEARANCE (1280x720 SPRITES)
-- ============================================================

local musicSffConfig = {

    -- Enable or disable the SFF image.
    enabled = true,              -- <<< EDIT HERE: true = SFF enabled | false = disabled

    -- Shared SFF file.
    file = "external/mods/random_screen_bgm/music.sff", -- <<< EDIT HERE: SFF file

    -- Position of the SFF image.
    -- IMPORTANT: the sprites are 1280x720.
    -- To fill the entire screen, use X=0 and Y=0.
    x = 0,                        -- <<< EDIT HERE: X position do SFF
    y = 0,                        -- <<< EDIT HERE: Y position do SFF

    -- SFF image size.
    -- IMPORTANT: 1.00 = native size (1280x720).
    scaleX = 1.00,                -- <<< EDIT HERE: horizontal size
    scaleY = 1.00,                -- <<< EDIT HERE: vertical size

    -- Drawing layer.
    layer = 2,                   -- <<< EDIT HERE: drawing layer

    -- Sprite facing.
    facing = 1,                  -- <<< EDIT HERE: sprite facing

}


-- ============================================================
-- 4. PLAYLIST
-- ============================================================
--
-- >>> EDIT HERE: adicione, remova ou altere músicas nesta lista.
--
-- file      = audio file
-- sffGroup  = SFF group
-- sffIndex  = SFF image index
--
-- Example:
--
-- {
--     file = "sound/random_screen_bgm/select/My Song.mp3",
--     sffGroup = 0,
--     sffIndex = 4,
-- },
--
-- ============================================================

-- CURRENT music.sff MAPPING:
--   0,1 = Street Fighter 2
--   0,2 = Mortal Kombat
--   0,3 = The King Of Fighters 94
--
local playlist = {

    {
        file = "sound/random_screen_bgm/select/Street Fighter 2.mp3",
        sffGroup = 0,
        sffIndex = 1,
    },

    {
        file = "sound/random_screen_bgm/select/Mortal Kombat.mp3",
        sffGroup = 0,
        sffIndex = 2,
    },

    {
        file = "sound/random_screen_bgm/select/The King Of Fighters 94.mp3",
        sffGroup = 0,
        sffIndex = 3,
    },

}


-- ============================================================
-- INTERNAL STATE
-- ============================================================

local bag = {}
local currentTrack = nil
local pendingTrack = nil
local musicRequested = false

-- This is deliberately started when playBgm() is executed,
-- not when f_selectReset runs.
local musicStartFrame = nil

local musicText = nil
local musicAnim = nil
local musicSff = nil


-- ============================================================
-- LOCALCOORD
-- ============================================================

local function localcoord()

    if motif
        and motif.info
        and motif.info.localcoord
        and motif.info.localcoord[1]
        and motif.info.localcoord[2]
    then
        return motif.info.localcoord[1], motif.info.localcoord[2]
    end

    return 1280, 720
end


-- ============================================================
-- SHUFFLE BAG
-- ============================================================

local function refillBag()

    bag = {}

    for i = 1, #playlist do
        bag[i] = i
    end

    for i = #bag, 2, -1 do
        local j = math.random(i)
        bag[i], bag[j] = bag[j], bag[i]
    end

end


local function nextTrack()

    if #playlist == 0 then
        return nil
    end

    if #bag == 0 then
        refillBag()
    end

    local index = table.remove(bag)

    return playlist[index]

end


-- ============================================================
-- FILENAME
-- ============================================================

local function getTrackName(path)

    local filename =
        path:match("([^/\\]+)$")
        or path

    return filename:gsub("%.[^%.]+$", "")

end


-- ============================================================
-- MUSIC TEXT
-- ============================================================

local function createMusicText()

    if type(textImgNew) ~= "function" then
        return nil
    end

    local t = textImgNew()

    if type(fontNew) == "function"
        and type(textImgSetFont) == "function"
    then
        local font = fontNew(musicTitleAppearance.font)
        if font ~= nil then
            textImgSetFont(t, font)
        end
    end

    if type(textImgSetLocalcoord) == "function" then
        local w, h = localcoord()
        textImgSetLocalcoord(t, w, h)
    end

    return t

end


local function drawMusicText()

    if not musicTitleConfig.enabled
        or currentTrack == nil
        or musicStartFrame == nil
    then
        return
    end

    local frame = getFrameCount()

    if frame == nil then
        return
    end

    local elapsed =
        (frame - musicStartFrame) / 60

    -- Before delay.
    if elapsed < musicTitleConfig.delay then
        return
    end

    -- After delay + duration.
    if elapsed >=
        (musicTitleConfig.delay + musicTitleConfig.duration)
    then
        return
    end

    if musicText == nil then
        musicText = createMusicText()
    end

    if musicText == nil then
        return
    end

    textImgReset(musicText)

    if type(textImgSetLocalcoord) == "function" then
        local w, h = localcoord()
        textImgSetLocalcoord(musicText, w, h)
    end

    textImgSetScale(
        musicText,
        musicTitleAppearance.scaleX,
        musicTitleAppearance.scaleY
    )

    textImgSetPos(
        musicText,
        musicTitleAppearance.x,
        musicTitleAppearance.y
    )

    textImgSetAlign(
        musicText,
        musicTitleAppearance.align
    )

    textImgSetText(
        musicText,
        musicTitleConfig.label
        .. getTrackName(currentTrack.file)
    )

    if type(textImgSetColor) == "function" then
        textImgSetColor(
            musicText,
            musicTitleAppearance.color.r,
            musicTitleAppearance.color.g,
            musicTitleAppearance.color.b
        )
    end

    textImgDraw(musicText)

end


-- ============================================================
-- MUSIC SFF
-- ============================================================

local function loadMusicSff()

    if not musicSffConfig.enabled then
        return
    end

    if not fileExists(musicSffConfig.file) then
        return
    end

    musicSff =
        sffNew(musicSffConfig.file)

end


local function createMusicAnim(track)

    if not musicSff
        or not track
        or track.sffGroup == nil
        or track.sffIndex == nil
    then
        return nil
    end

    local animDef =
        tostring(track.sffGroup)
        .. ","
        .. tostring(track.sffIndex)
        .. ", 0,0, -1"

    local anim =
        animNew(
            musicSff,
            animDef
        )

    if anim == nil then
        return nil
    end

    local w, h = localcoord()

    animSetLocalcoord(anim, w, h)

    animSetScale(
        anim,
        musicSffConfig.scaleX,
        musicSffConfig.scaleY
    )

    animSetLayerno(
        anim,
        musicSffConfig.layer
    )

    animSetFacing(
        anim,
        musicSffConfig.facing
    )

    animSetPos(
        anim,
        musicSffConfig.x,
        musicSffConfig.y
    )

    animUpdate(anim)

    return anim

end


local function drawMusicSff()

    if not musicSffConfig.enabled
        or currentTrack == nil
        or musicStartFrame == nil
    then
        return
    end

    local frame = getFrameCount()

    if frame == nil then
        return
    end

    local elapsed =
        (frame - musicStartFrame) / 60

    -- Same visibility window as the music title.
    if elapsed < musicTitleConfig.delay then
        return
    end

    if elapsed >=
        (musicTitleConfig.delay + musicTitleConfig.duration)
    then
        return
    end

    if musicAnim == nil then
        musicAnim =
            createMusicAnim(currentTrack)
    end

    if musicAnim == nil then
        return
    end

    animUpdate(musicAnim)
    animDraw(musicAnim)

end


-- ============================================================
-- REQUEST MUSIC
-- ============================================================

local function requestSelectMusic()

    pendingTrack = nextTrack()

    musicRequested =
        pendingTrack ~= nil

end


-- ============================================================
-- PLAY MUSIC
-- ============================================================

local function playPendingSelectMusic()

    if not musicRequested
        or pendingTrack == nil
    then
        return
    end

    playBgm({
        bgm = pendingTrack.file,
        loop = 1,
        volume = 100,
        loopstart = 0,
        loopend = 0,
        interrupt = true,
    })

    currentTrack = pendingTrack

    -- IMPORTANT:
    -- The timer starts exactly when the new BGM is requested.
    musicStartFrame = getFrameCount()

    -- Force the SFF animation to be rebuilt for the new song.
    musicAnim = nil

    pendingTrack = nil
    musicRequested = false

end


-- ============================================================
-- SELECT HOOKS
-- ============================================================

local function onSelectReset()

    requestSelectMusic()

end


local function onSelectScreen()

    playPendingSelectMusic()

    drawMusicSff()
    drawMusicText()

end


-- ============================================================
-- INITIALIZATION
-- ============================================================

loadMusicSff()


if type(hook) == "table"
    and type(hook.add) == "function"
then

    hook.add(
        "start.f_selectReset",
        "randomScreenBgmSelectReset",
        onSelectReset
    )

    hook.add(
        "start.f_selectScreen",
        "randomScreenBgmSelectScreen",
        onSelectScreen
    )

end
