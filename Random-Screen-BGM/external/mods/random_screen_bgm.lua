-- ============================================================
-- RANDOM SCREEN BGM
-- IKEMEN GO 1.0.0
-- ============================================================
--
-- Random BGM manager for IKEMEN GO screens.
--
-- Supported screens:
--   Title
--   Options
--   Character Select
--   Versus
--   Results
--   Victory
--   Continue
--   Hiscore
--   Challenger
--   Replay entry
--
-- Game Over is a storyboard in IKEMEN GO 1.0.0 and does not have
-- a dedicated public hook, so its playlist is reserved for now.
--
-- ============================================================


-- ============================================================
-- SCREEN CONFIGURATION
-- ============================================================
--
-- Add songs to the playlist for each screen.
--
-- sffGroup / sffIndex are optional.
-- They identify the corresponding image in music.sff.
--
-- ============================================================

local function displayUsesText(config)
    return config.display == "text" or config.display == "both"
end

local function displayUsesSprite(config)
    return config.display == "sprite" or config.display == "both"
end

local screenConfig = {

    title = {
        enabled = true,
        display = "text",
        folder = "sound/random_screen_bgm/title/",
        playlist = {
            -- {file = "sound/random_screen_bgm/title/My Song.mp3", sffGroup = 0, sffIndex = 4},
        },
    },

    options = {
        enabled = true,
        display = "text",
        folder = "sound/random_screen_bgm/options/",
        playlist = {
        },
    },

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
        },
    },

    versus = {
        enabled = true,
        display = "text",
        folder = "sound/random_screen_bgm/versus/",
        playlist = {
        },
    },

    results = {
        enabled = true,
        display = "sprite",
        folder = "sound/random_screen_bgm/results/",
        playlist = {
        },
    },

    victory = {
        enabled = true,
        display = "text",
        folder = "sound/random_screen_bgm/victory/",
        playlist = {
        },
    },

    continue = {
        enabled = true,
        display = "sprite",
        folder = "sound/random_screen_bgm/continue/",
        playlist = {
        },
    },

    hiscore = {
        enabled = true,
        display = "text",
        folder = "sound/random_screen_bgm/hiscore/",
        playlist = {
        },
    },

    challenger = {
        enabled = true,
        display = "sprite",
        folder = "sound/random_screen_bgm/challenger/",
        playlist = {
        },
    },

    replay = {
        enabled = true,
        display = "text",
        folder = "sound/random_screen_bgm/replay/",
        playlist = {
        },
    },

    -- Reserved: no dedicated public game-over hook in IKEMEN GO 1.0.0.
    gameover = {
        enabled = false,
        display = "text",
        folder = "sound/random_screen_bgm/gameover/",
        playlist = {
        },
    },

}


-- ============================================================
-- MUSIC TITLE
-- ============================================================

local musicTitleConfig = {
    enabled = true,
    delay = 3,
    duration = 6,
    label = "MUSIC: ",
}


local musicTitleAppearance = {
    font = "font/Roboto-Condensed.def",
    x = 250,
    y = 690,
    scaleX = 0.50,
    scaleY = 0.50,

    -- 0 = left | 1 = center | 2 = right
    align = 0,

    color = {
        r = 0,
        g = 0,
        b = 255,
    },
}


-- ============================================================
-- MUSIC SFF
-- ============================================================

local musicSffConfig = {
    enabled = true,
    file = "external/mods/random_screen_bgm/music.sff",

    x = 0,
    y = 0,

    scaleX = 1.00,
    scaleY = 1.00,

    layer = 2,
    facing = 1,
}


-- ============================================================
-- INTERNAL STATE
-- ============================================================

local state = {}
local musicSff = nil
local activeScreen = nil


local function getState(screen)

    if state[screen] == nil then
        state[screen] = {
            bag = {},
            currentTrack = nil,
            startFrame = nil,
            text = nil,
            anim = nil,
        }
    end

    return state[screen]

end


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

local function refillBag(config, s)

    s.bag = {}

    for i = 1, #config.playlist do
        s.bag[i] = i
    end

    for i = #s.bag, 2, -1 do
        local j = math.random(i)
        s.bag[i], s.bag[j] = s.bag[j], s.bag[i]
    end

end


local function nextTrack(screen)

    local config = screenConfig[screen]
    local s = getState(screen)

    if config == nil
        or not config.enabled
        or #config.playlist == 0
    then
        return nil
    end

    if #s.bag == 0 then
        refillBag(config, s)
    end

    local index = table.remove(s.bag)

    if index == nil then
        return nil
    end

    return config.playlist[index]

end


-- ============================================================
-- MUSIC TITLE
-- ============================================================

local function trackName(path)

    local filename =
        path:match("([^/\\]+)$")
        or path

    return filename:gsub("%.[^%.]+$", "")

end


local function createText()

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


local function drawText(screen)

    if not musicTitleConfig.enabled then
        return
    end

    local config = screenConfig[screen]

    if config == nil or not displayUsesText(config) then
        return
    end

    local s = getState(screen)

    if s.currentTrack == nil or s.startFrame == nil then
        return
    end

    local frame = getFrameCount()

    if frame == nil then
        return
    end

    local elapsed = (frame - s.startFrame) / 60

    if elapsed < musicTitleConfig.delay then
        return
    end

    if elapsed >=
        musicTitleConfig.delay + musicTitleConfig.duration
    then
        return
    end

    if s.text == nil then
        s.text = createText()
    end

    if s.text == nil then
        return
    end

    textImgReset(s.text)

    local w, h = localcoord()

    if type(textImgSetLocalcoord) == "function" then
        textImgSetLocalcoord(s.text, w, h)
    end

    textImgSetScale(
        s.text,
        musicTitleAppearance.scaleX,
        musicTitleAppearance.scaleY
    )

    textImgSetPos(
        s.text,
        musicTitleAppearance.x,
        musicTitleAppearance.y
    )

    textImgSetAlign(
        s.text,
        musicTitleAppearance.align
    )

    textImgSetText(
        s.text,
        musicTitleConfig.label .. trackName(s.currentTrack.file)
    )

    if type(textImgSetColor) == "function" then
        textImgSetColor(
            s.text,
            musicTitleAppearance.color.r,
            musicTitleAppearance.color.g,
            musicTitleAppearance.color.b
        )
    end

    textImgDraw(s.text)

end


-- ============================================================
-- MUSIC SFF
-- ============================================================

local function loadSff()

    if not musicSffConfig.enabled then
        return
    end

    if not fileExists(musicSffConfig.file) then
        return
    end

    musicSff = sffNew(musicSffConfig.file)

end


local function createAnim(screen)

    local s = getState(screen)
    local track = s.currentTrack

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

    local anim = animNew(musicSff, animDef)

    if anim == nil then
        return nil
    end

    local w, h = localcoord()

    animSetLocalcoord(anim, w, h)
    animSetScale(anim, musicSffConfig.scaleX, musicSffConfig.scaleY)
    animSetLayerno(anim, musicSffConfig.layer)
    animSetFacing(anim, musicSffConfig.facing)
    animSetPos(anim, musicSffConfig.x, musicSffConfig.y)

    animUpdate(anim)

    return anim

end


local function drawSff(screen)

    if not musicSffConfig.enabled then
        return
    end

    local config = screenConfig[screen]

    if config == nil or not displayUsesSprite(config) then
        return
    end

    local s = getState(screen)

    if s.currentTrack == nil or s.startFrame == nil then
        return
    end

    local frame = getFrameCount()

    if frame == nil then
        return
    end

    local elapsed = (frame - s.startFrame) / 60

    if elapsed < musicTitleConfig.delay then
        return
    end

    if elapsed >=
        musicTitleConfig.delay + musicTitleConfig.duration
    then
        return
    end

    if s.anim == nil then
        s.anim = createAnim(screen)
    end

    if s.anim == nil then
        return
    end

    animUpdate(s.anim)
    animDraw(s.anim)

end


-- ============================================================
-- SCREEN MUSIC
-- ============================================================

local function playScreen(screen)

    local config = screenConfig[screen]

    if config == nil
        or not config.enabled
        or #config.playlist == 0
    then
        return false
    end

    local track = nextTrack(screen)

    if track == nil then
        return false
    end

    playBgm({
        bgm = track.file,
        loop = 1,
        volume = 100,
        loopstart = 0,
        loopend = 0,
        interrupt = true,
    })

    local s = getState(screen)

    s.currentTrack = track
    s.startFrame = getFrameCount()
    s.anim = nil

    return true

end


local function drawScreen(screen)

    local config = screenConfig[screen]

    if config == nil
        or not config.enabled
        or #config.playlist == 0
    then
        return
    end

    drawSff(screen)
    drawText(screen)

end


local function enterScreen(screen)

    if playScreen(screen) then
        drawScreen(screen)
    end

end


-- ============================================================
-- SCREEN HOOK HANDLERS
-- ============================================================

local function onTitle()

    activeScreen = "title"

    local s = getState("title")

    if s.currentTrack == nil then
        enterScreen("title")
    else
        drawScreen("title")
    end

end


local function onOptions()

    activeScreen = "options"

    local s = getState("options")

    if s.currentTrack == nil then
        enterScreen("options")
    else
        drawScreen("options")
    end

end


local function onSelectReset()

    local s = getState("select")

    s.currentTrack = nil
    s.startFrame = nil
    s.anim = nil

end


local function onSelect()

    activeScreen = "select"

    local s = getState("select")

    if s.currentTrack == nil then
        enterScreen("select")
    else
        drawScreen("select")
    end

end


local function onVersus()

    activeScreen = "versus"

    local s = getState("versus")

    if s.currentTrack == nil then
        enterScreen("versus")
    else
        drawScreen("versus")
    end

end


local function postMatchInit(screen)

    activeScreen = screen

    local s = getState(screen)

    s.currentTrack = nil
    s.startFrame = nil
    s.anim = nil

    enterScreen(screen)

end


local function postMatchDraw(screen)

    return function()
        activeScreen = screen
        drawScreen(screen)
    end

end


-- ============================================================
-- REPLAY ENTRY
-- ============================================================
--
-- IKEMEN GO 1.0.0 has no dedicated public replay hook.
-- We select the replay track when the Replay menu item is entered.
--
-- ============================================================

local function onMenuItem(t, item)

    if t == nil
        or item == nil
        or t[item] == nil
        or t[item].itemname ~= "replay"
    then
        return
    end

    activeScreen = "replay"

    local s = getState("replay")

    s.currentTrack = nil
    s.startFrame = nil
    s.anim = nil

    enterScreen("replay")

end


-- ============================================================
-- INITIALIZATION
-- ============================================================

loadSff()


-- ============================================================
-- MENU DRAW OVERLAY
-- ============================================================
--
-- Standard menu hooks run before IKEMEN GO draws the menu.
-- Drawing the music title directly from those hooks would make
-- it get overwritten by the native menu renderer.
--
-- Wrap the common menu draw function so the music title/SFF is
-- drawn after the native menu and remains visible.
--
-- ============================================================

if type(main) == "table"
    and type(main.f_menuCommonDraw) == "function"
then

    local originalMenuDraw = main.f_menuCommonDraw

    main.f_menuCommonDraw = function(...)
        local result1, result2, result3 = originalMenuDraw(...)

        if activeScreen ~= nil then
            drawScreen(activeScreen)
        end

        return result1, result2, result3
    end

end


if type(hook) == "table"
    and type(hook.add) == "function"
then

    -- Title
    hook.add(
        "main.menu.loop",
        "randomScreenBgmTitle",
        onTitle
    )

    -- Options
    hook.add(
        "options.menu.loop",
        "randomScreenBgmOptions",
        onOptions
    )

    -- Character Select
    hook.add(
        "start.f_selectReset",
        "randomScreenBgmSelectReset",
        onSelectReset
    )

    hook.add(
        "start.f_selectScreen",
        "randomScreenBgmSelect",
        onSelect
    )

    -- Versus
    hook.add(
        "start.f_selectVersus",
        "randomScreenBgmVersus",
        onVersus
    )

    -- Results
    hook.add(
        "game.result_init",
        "randomScreenBgmResultsInit",
        function()
            postMatchInit("results")
        end
    )

    hook.add(
        "game.result",
        "randomScreenBgmResults",
        postMatchDraw("results")
    )

    -- Victory
    hook.add(
        "game.victory_init",
        "randomScreenBgmVictoryInit",
        function()
            postMatchInit("victory")
        end
    )

    hook.add(
        "game.victory",
        "randomScreenBgmVictory",
        postMatchDraw("victory")
    )

    -- Continue
    hook.add(
        "game.continue_init",
        "randomScreenBgmContinueInit",
        function()
            postMatchInit("continue")
        end
    )

    hook.add(
        "game.continue",
        "randomScreenBgmContinue",
        postMatchDraw("continue")
    )

    -- Hiscore
    hook.add(
        "game.hiscore_init",
        "randomScreenBgmHiscoreInit",
        function()
            postMatchInit("hiscore")
        end
    )

    hook.add(
        "game.hiscore",
        "randomScreenBgmHiscore",
        postMatchDraw("hiscore")
    )

    -- Challenger
    hook.add(
        "game.challenger_init",
        "randomScreenBgmChallengerInit",
        function()
            postMatchInit("challenger")
        end
    )

    hook.add(
        "game.challenger",
        "randomScreenBgmChallenger",
        postMatchDraw("challenger")
    )

    -- Replay
    hook.add(
        "main.t_itemname",
        "randomScreenBgmReplay",
        onMenuItem
    )

end
