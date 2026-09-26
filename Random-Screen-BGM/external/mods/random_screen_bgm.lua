-- ============================================================
-- RANDOM SCREEN BGM
-- IKEMEN GO 1.0.0
-- ============================================================
--
-- Random BGM manager for IKEMEN GO screens.
--
-- Supported screens:
--   Main Menu (Title)
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
-- DEBUG (disabled in release build)
-- ============================================================

local debugConfig = {
    enabled = false,
    file = "external/mods/random_screen_bgm/random_screen_bgm_debug.log",
}


local function debugLog(message)

    if not debugConfig.enabled then
        return
    end

    local line = "[Random Screen BGM] " .. tostring(message)

    -- Console output, when the IKEMEN GO console is available.
    if type(print) == "function" then
        print(line)
    end

    -- Persistent debug log for tests.
    if type(io) == "table" and type(io.open) == "function" then
        local file = io.open(debugConfig.file, "a")

        if file ~= nil then
            file:write(line .. "\n")
            file:close()
        end
    end

end


-- Start a fresh log for each game launch.
if debugConfig.enabled
    and type(io) == "table"
    and type(io.open) == "function"
then

    local file = io.open(debugConfig.file, "w")

    if file ~= nil then
        file:write("============================================================\n")
        file:write("Random Screen BGM - DEBUG LOG\n")
        file:write("============================================================\n")
        file:close()
    end

end


-- ============================================================
-- SCREEN CONFIGURATION
-- ============================================================
--
-- display:
--   "text"   = music title only
--   "sprite" = SFF image only
--   "both"   = music title + SFF image
--
-- ============================================================

local function displayUsesText(config)
    return config.display == "text" or config.display == "both"
end

local function displayUsesSprite(config)
    return config.display == "sprite" or config.display == "both"
end


-- --------------------------------------------------------------
-- MAIN MENU (TITLE)
-- --------------------------------------------------------------

local screenConfig = {

    title = {
        enabled = true,
        display = "text",
        folder = "sound/random_screen_bgm/title/",
        playlist = {
            {
                file = "sound/random_screen_bgm/title/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/random_screen_bgm/title/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/random_screen_bgm/title/The King Of Fighters 94.mp3",
                sffGroup = 0,
                sffIndex = 3,
            },
        },
    },

    -- --------------------------------------------------------------
    -- OPTIONS
    -- --------------------------------------------------------------

    options = {
        enabled = true,
        display = "text",
        folder = "sound/random_screen_bgm/options/",
        playlist = {
            {
                file = "sound/random_screen_bgm/options/Eternal Champions.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/random_screen_bgm/options/Marvel Super Heroes.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/random_screen_bgm/options/Samurai Shodown.mp3",
                sffGroup = 0,
                sffIndex = 3,
            },
        },
    },

    -- --------------------------------------------------------------
    -- SELECT
    -- --------------------------------------------------------------

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

    -- --------------------------------------------------------------
    -- VERSUS
    -- --------------------------------------------------------------

    versus = {
        enabled = true,
        display = "sprite",
        folder = "sound/random_screen_bgm/versus/",
        playlist = {
            {
                file = "sound/random_screen_bgm/versus/ssbu.mp3",
                sffGroup = 0,
                sffIndex = 4,
            },
            {
                file = "sound/random_screen_bgm/versus/Naruto -The Raising Fighting Spirit.mp3",
                sffGroup = 0,
                sffIndex = 5,
            },
            {
                file = "sound/random_screen_bgm/versus/Versus Mode - Street Fighter X Tekken.mp3",
                sffGroup = 0,
                sffIndex = 6,
            },
        },
    },

    -- --------------------------------------------------------------
    -- RESULTS
    -- --------------------------------------------------------------

    results = {
        enabled = true,
        display = "sprite",
        folder = "sound/random_screen_bgm/results/",
        playlist = {
            {
                file = "sound/random_screen_bgm/results/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/random_screen_bgm/results/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/random_screen_bgm/results/The King Of Fighters 94.mp3",
                sffGroup = 0,
                sffIndex = 3,
            },
        },
    },

    -- --------------------------------------------------------------
    -- VICTORY
    -- --------------------------------------------------------------

    victory = {
        enabled = true,
        display = "text",
        folder = "sound/random_screen_bgm/victory/",
        playlist = {
            {
                file = "sound/random_screen_bgm/victory/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/random_screen_bgm/victory/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/random_screen_bgm/victory/The King Of Fighters 94.mp3",
                sffGroup = 0,
                sffIndex = 3,
            },
        },
    },

    -- --------------------------------------------------------------
    -- CONTINUE
    -- --------------------------------------------------------------

    continue = {
        enabled = true,
        display = "sprite",
        folder = "sound/random_screen_bgm/continue/",
        playlist = {
            {
                file = "sound/random_screen_bgm/continue/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/random_screen_bgm/continue/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/random_screen_bgm/continue/The King Of Fighters 94.mp3",
                sffGroup = 0,
                sffIndex = 3,
            },
        },
    },

    -- --------------------------------------------------------------
    -- HISCORE
    -- --------------------------------------------------------------

    hiscore = {
        enabled = true,
        display = "text",
        folder = "sound/random_screen_bgm/hiscore/",
        playlist = {
            {
                file = "sound/random_screen_bgm/hiscore/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/random_screen_bgm/hiscore/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/random_screen_bgm/hiscore/The King Of Fighters 94.mp3",
                sffGroup = 0,
                sffIndex = 3,
            },
        },
    },

    -- --------------------------------------------------------------
    -- CHALLENGER
    -- --------------------------------------------------------------

    challenger = {
        enabled = true,
        display = "sprite",
        folder = "sound/random_screen_bgm/challenger/",
        playlist = {
            {
                file = "sound/random_screen_bgm/challenger/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/random_screen_bgm/challenger/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/random_screen_bgm/challenger/The King Of Fighters 94.mp3",
                sffGroup = 0,
                sffIndex = 3,
            },
        },
    },

    -- --------------------------------------------------------------
    -- REPLAY
    -- --------------------------------------------------------------

    replay = {
        enabled = true,
        display = "text",
        folder = "sound/random_screen_bgm/replay/",
        playlist = {
            {
                file = "sound/random_screen_bgm/replay/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/random_screen_bgm/replay/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/random_screen_bgm/replay/The King Of Fighters 94.mp3",
                sffGroup = 0,
                sffIndex = 3,
            },
        },
    },

    -- --------------------------------------------------------------
    -- GAME OVER
    -- --------------------------------------------------------------

    -- Reserved: no dedicated public game-over hook in IKEMEN GO 1.0.0.
    gameover = {
        enabled = false,
        display = "text",
        folder = "sound/random_screen_bgm/gameover/",
        playlist = {
            {
                file = "sound/random_screen_bgm/gameover/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/random_screen_bgm/gameover/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/random_screen_bgm/gameover/The King Of Fighters 94.mp3",
                sffGroup = 0,
                sffIndex = 3,
            },
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
local lastTextDebugFrame = {}
local lastSelectFrame = nil
local selectLeaveGraceFrames = 5

-- Generic freshness tracker: any "session" screen (select, versus,
-- results, victory, continue, hiscore, challenger, replay) stamps
-- its own frame every time its own hook fires. If the screen has
-- gone stale (its hook stopped firing), the draw wrapper further
-- below will refuse to draw it, no matter which menu we came back
-- to or which specific hook was supposed to catch the transition.
local lastFrameByScreen = {}
local staleGraceFrames = 5

local function markScreenFrame(screen)
    lastFrameByScreen[screen] = getFrameCount()
end

local function getState(screen)

    if state[screen] == nil then
        state[screen] = {
            bag = {},
            currentTrack = nil,
            startFrame = nil,
            text = nil,
            anim = nil,
            musicStarted = false,
            cycle = 0,
            textWindowLogged = false,
            textDrawConfirmed = false,
            textDrawLogged = false,
            sffDrawConfirmed = false,
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


local function createText(screen)

    if type(textImgNew) ~= "function" then
        debugLog(screen .. " text create: ERROR | textImgNew unavailable")
        return nil
    end

    local t = textImgNew()

    if t == nil then
        debugLog(screen .. " text create: ERROR | textImgNew returned nil")
        return nil
    end

    debugLog(screen .. " text create: textImgNew OK")

    if type(fontNew) == "function"
        and type(textImgSetFont) == "function"
    then
        local font = fontNew(
            musicTitleAppearance.font
        )

        if font ~= nil then
            textImgSetFont(t, font)
            debugLog(
                screen .. " text create: font OK | "
                .. tostring(musicTitleAppearance.font)
            )
        else
            debugLog(
                screen .. " text create: WARNING | fontNew returned nil"
            )
        end
    else
        debugLog(
            screen .. " text create: WARNING | fontNew/textImgSetFont unavailable"
        )
    end

    if type(textImgSetLocalcoord) == "function" then
        local w, h = localcoord()
        textImgSetLocalcoord(t, w, h)
        debugLog(
            screen .. " text create: localcoord OK | "
            .. tostring(w) .. "x" .. tostring(h)
        )
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

    if (screen == "title" or screen == "options")
        and elapsed >= musicTitleConfig.delay
        and not s.textWindowLogged
    then
        s.textWindowLogged = true
        lastTextDebugFrame[screen] = frame
        debugLog(
            screen .. " text window reached | Cycle: #"
            .. tostring(s.cycle or 0)
            .. " | Elapsed: " .. tostring(elapsed)
            .. " | StartFrame: " .. tostring(s.startFrame)
            .. " | Frame: " .. tostring(frame)
        )
    end

    if elapsed < musicTitleConfig.delay then
        return
    end

    if elapsed >=
        musicTitleConfig.delay + musicTitleConfig.duration
    then
        return
    end

    if s.text == nil then
        s.text = createText(screen)
    end

    if s.text == nil then
        debugLog(screen .. " text draw: ABORT | text object nil")
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

    local drawOk, drawErr = pcall(function()
        textImgDraw(s.text)
    end)

    if not drawOk then
        debugLog(
            screen .. " textImgDraw: ERROR | " .. tostring(drawErr)
        )
    elseif (screen == "title" or screen == "options")
        and not s.textDrawConfirmed
    then
        s.textDrawConfirmed = true
        debugLog(screen .. " textImgDraw: OK | Cycle: #" .. tostring(s.cycle or 0))
    end

    if (screen == "title" or screen == "options")
        and not s.textDrawLogged
    then
        s.textDrawLogged = true
        debugLog(
            screen .. " text: DRAW | Cycle: #"
            .. tostring(s.cycle or 0)
            .. " | Track: " .. tostring(s.currentTrack.file)
            .. " | Frame: " .. tostring(frame)
        )
    end

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

        if s.anim ~= nil then
            debugLog(
                screen .. " SFF anim create: OK | Group: "
                .. tostring(s.currentTrack.sffGroup)
                .. " | Index: "
                .. tostring(s.currentTrack.sffIndex)
            )
        else
            debugLog(
                screen .. " SFF anim create: ERROR | Group: "
                .. tostring(s.currentTrack.sffGroup)
                .. " | Index: "
                .. tostring(s.currentTrack.sffIndex)
            )
        end
    end

    if s.anim == nil then
        return
    end

    animUpdate(s.anim)

    local drawOk, drawErr = pcall(function()
        animDraw(s.anim)
    end)

    if not drawOk then
        debugLog(
            screen .. " animDraw: ERROR | " .. tostring(drawErr)
        )
    elseif not s.sffDrawConfirmed then
        s.sffDrawConfirmed = true
        debugLog(screen .. " animDraw: OK")
    end

end


-- ============================================================
-- SCREEN MUSIC
-- ============================================================

local function beginScreenCycle(screen)

    local s = getState(screen)

    s.cycle = (s.cycle or 0) + 1
    s.currentTrack = nil
    s.startFrame = nil
    s.anim = nil
    s.text = nil
    s.musicStarted = false
    s.postDrawAudioPending = false

    s.textWindowLogged = false
    s.textDrawConfirmed = false
    s.textDrawLogged = false
    s.sffDrawConfirmed = false

    lastTextDebugFrame[screen] = nil

    return s.cycle

end


local function playScreen(screen)

    local config = screenConfig[screen]

    if config == nil
        or not config.enabled
        or #config.playlist == 0
    then
        return false
    end

    -- Every entry starts a completely fresh visual/audio cycle.
    -- The shuffle bag itself is preserved, so randomization continues
    -- across entries without reusing a track until the bag is empty.
    local cycle = beginScreenCycle(screen)
    local track = nextTrack(screen)

    if track == nil then
        debugLog("Cycle aborted: " .. screen)
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
    s.musicStarted = true

    debugLog(
        "Cycle: " .. screen
        .. " | #" .. tostring(cycle)
        .. " | Track: " .. tostring(track.file)
        .. " | Display: " .. tostring(config.display)
        .. " | Frame: " .. tostring(s.startFrame)
    )

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

    local s = getState(screen)

    if s.currentTrack == nil or s.startFrame == nil then
        return
    end

    drawSff(screen)
    drawText(screen)

end


local function enterScreen(screen)

    debugLog("Enter: " .. screen)

    if playScreen(screen) then
        drawScreen(screen)
    else
        debugLog("No playlist available: " .. screen)
    end

end


local function resetScreenState(screen)

    local s = getState(screen)

    if s.currentTrack ~= nil then
        debugLog(
            "Reset: " .. screen
            .. " | Previous track: " .. tostring(s.currentTrack.file)
        )
    else
        debugLog("Reset: " .. screen)
    end

    s.currentTrack = nil
    s.startFrame = nil
    s.anim = nil
    s.text = nil
    s.textDrawConfirmed = false
    s.textDrawLogged = false
    s.textWindowLogged = false
    s.sffDrawConfirmed = false
    s.musicStarted = false
    s.postDrawAudioPending = false

    lastTextDebugFrame[screen] = nil

end


local function clearActiveScreen(reason)

    if activeScreen ~= nil then
        debugLog(
            "Leave: " .. tostring(activeScreen)
            .. " | Reason: " .. tostring(reason)
        )
    end

    activeScreen = nil

end


-- ============================================================
-- MENU RENDER / ENTRY ARCHITECTURE (V13)
-- ============================================================
--
-- The native IKEMEN GO flow is:
--
--   Main Menu loop
--       -> native title BGM / intro
--       -> main.f_menuCommonDraw()
--
--   Options loop
--       -> native options BGM
--       -> main.f_menuCommonDraw()
--
-- The important point is that main.menu.loop and options.menu.loop
-- are long-running loops. Their *.menu.loop hooks are NOT reliable
-- "entered this screen" events on every return.
--
-- V13 therefore does not use pendingMenuEntry, main.menu.loop hooks,
-- or refresh() as an entry trigger.
--
-- Instead, the active menu context is established for the duration
-- of the actual native loop. The first real common-menu draw in that
-- context starts a fresh screen cycle. refresh() is used ONLY for
-- rendering the already-active overlay, never for changing state.
--
-- This gives us one clear separation:
--
--   MENU LOOP  -> identifies where we are
--   MENU DRAW  -> starts a cycle if needed
--   REFRESH    -> draws the active overlay
--
-- Intro/storyboard refreshes happen outside menuDrawContext and can
-- therefore never start Title BGM or draw the Title overlay.
--
-- ============================================================

local refreshWrapped = false
local refreshOverlayLogged = false
local menuDrawWrapped = false
local menuLoopsWrapped = false

-- "title", "options", "submenu", or nil.
local menuContext = nil
local menuDrawContext = nil


local function reassertScreenMusic(screen)

    local s = getState(screen)

    if s.currentTrack == nil then
        return false
    end

    playBgm({
        bgm = s.currentTrack.file,
        loop = 1,
        volume = 100,
        loopstart = 0,
        loopend = 0,
        interrupt = true,
    })

    debugLog(
        "Post-draw BGM reassert: OK | Screen: "
        .. tostring(screen)
        .. " | Track: " .. tostring(s.currentTrack.file)
    )

    return true

end


local function enterMenuScreen(screen)

    if screen ~= "title" and screen ~= "options" then
        return
    end

    if activeScreen == screen then
        return
    end

    -- If we are changing menu screens, discard the previous visual cycle.
    local previousScreen = activeScreen

    if previousScreen ~= nil then
        resetScreenState(previousScreen)
        clearActiveScreen("menu context changed")
    end

    activeScreen = screen
    markScreenFrame(screen)

    debugLog(
        "MENU ENTER | Screen: " .. screen
        .. " | Previous: " .. tostring(previousScreen)
    )

    enterScreen(screen)

    local state = getState(screen)
    state.postDrawAudioPending = true

end


local function clearMenuOverlayIfNeeded(context)

    if context == "submenu" then

        if activeScreen == "title" or activeScreen == "options" then
            resetScreenState(activeScreen)
            clearActiveScreen("entered submenu")
        end

    end

end


-- --------------------------------------------------------------
-- REFRESH WRAPPER
-- --------------------------------------------------------------
--
-- This wrapper never changes screen state. It only draws an overlay
-- that has already been entered by the menu-draw controller below.
--
-- --------------------------------------------------------------

local function installRefreshOverlayWrapper()

    if refreshWrapped then
        return true
    end

    if type(refresh) ~= "function" then
        return false
    end

    local originalRefresh = refresh

    refresh = function(...)

        if menuDrawContext == "title"
            or menuDrawContext == "options"
        then

            local drawOk, drawErr = pcall(function()
                drawScreen(menuDrawContext)
            end)

            if not drawOk then
                debugLog(
                    "ERROR in menu overlay: " .. tostring(drawErr)
                )
            elseif not refreshOverlayLogged then
                refreshOverlayLogged = true
                debugLog(
                    "Refresh overlay: OK | Context: "
                    .. tostring(menuDrawContext)
                )
            end

        end

        return originalRefresh(...)

    end

    refreshWrapped = true
    debugLog("Refresh overlay wrapper installed")

    return true

end


-- --------------------------------------------------------------
-- COMMON MENU DRAW WRAPPER
-- --------------------------------------------------------------
--
-- This is the ONLY place where Title/Options screen entry is
-- initiated. It is called once per actual native menu frame.
--
-- --------------------------------------------------------------

local function installMenuDrawWrapper()

    if menuDrawWrapped then
        return true
    end

    if type(main) ~= "table"
        or type(main.f_menuCommonDraw) ~= "function"
    then
        return false
    end

    local originalMenuDraw = main.f_menuCommonDraw

    main.f_menuCommonDraw = function(t, item, cursorPosY, moveTxt, sec, bg, skipClear, opts)

        local context = menuContext
        local previousDrawContext = menuDrawContext

        -- Only Title and Options own the Random Screen BGM overlay.
        if context == "title" or context == "options" then

            menuDrawContext = context

            -- Start the cycle BEFORE native drawing. The native menu has
            -- already selected/started its own BGM by this point, so our
            -- playBgm(interrupt=true) safely becomes the active track.
            enterMenuScreen(context)

        elseif context == "submenu" then

            menuDrawContext = "submenu"
            clearMenuOverlayIfNeeded(context)

        else

            menuDrawContext = nil

        end

        local ok, result = pcall(
            originalMenuDraw,
            t,
            item,
            cursorPosY,
            moveTxt,
            sec,
            bg,
            skipClear,
            opts
        )

        -- Native menu drawing is complete here. Reassert the selected
        -- Random Screen BGM once, after the engine has finished its own
        -- menu rendering/audio work. This is intentionally one-shot.
        if ok and (context == "title" or context == "options") then
            local state = getState(context)

            if state.postDrawAudioPending then
                reassertScreenMusic(context)
                state.postDrawAudioPending = false
            end
        end

        menuDrawContext = previousDrawContext

        if not ok then
            error(result)
        end

        return result

    end

    menuDrawWrapped = true
    debugLog("Menu draw wrapper installed")

    return true

end


-- --------------------------------------------------------------
-- DIRECT MENU LOOP CONTEXT
-- --------------------------------------------------------------
--
-- main.menu.loop and its submenu loops already exist when external
-- modules are loaded. We wrap those existing functions rather than
-- trying to wrap main.f_createMenu after the functions were created.
--
-- --------------------------------------------------------------

local function installMenuLoopContextWrappers()

    if menuLoopsWrapped then
        return true
    end

    if type(main) ~= "table"
        or type(main.menu) ~= "table"
        or type(main.menu.loop) ~= "function"
    then
        return false
    end

    local wrappedFunctions = {}

    local function wrapLoop(fn, context, label)

        if type(fn) ~= "function" then
            return fn
        end

        if wrappedFunctions[fn] ~= nil then
            return wrappedFunctions[fn]
        end

        local wrapped = function(...)

            local previousContext = menuContext
            menuContext = context

            local ok, result = pcall(fn, ...)

            menuContext = previousContext

            if not ok then
                error(result)
            end

            return result

        end

        wrappedFunctions[fn] = wrapped

        debugLog(
            "Menu loop context installed | "
            .. tostring(label)
            .. " | Context: " .. tostring(context)
        )

        return wrapped

    end

    -- The real Main Menu.
    main.menu.loop = wrapLoop(
        main.menu.loop,
        "title",
        "main"
    )

    -- All main-menu submenus share the same native loop implementation,
    -- but they must suppress Title/Options rendering while active.
    local function wrapSubmenus(tbl, path)

        if type(tbl) ~= "table"
            or type(tbl.submenu) ~= "table"
        then
            return
        end

        for name, submenu in pairs(tbl.submenu) do

            if type(submenu) == "table"
                and type(submenu.loop) == "function"
            then

                submenu.loop = wrapLoop(
                    submenu.loop,
                    "submenu",
                    path .. tostring(name)
                )

                wrapSubmenus(
                    submenu,
                    path .. tostring(name) .. "/"
                )

            end

        end

    end

    wrapSubmenus(main.menu, "")

    -- Options is a separate loop tree and must have its own context.
    if type(options) == "table"
        and type(options.menu) == "table"
        and type(options.menu.loop) == "function"
    then

        options.menu.loop = wrapLoop(
            options.menu.loop,
            "options",
            "options"
        )

        local function wrapOptionSubmenus(tbl, path)

            if type(tbl) ~= "table"
                or type(tbl.submenu) ~= "table"
            then
                return
            end

            for name, submenu in pairs(tbl.submenu) do

                if type(submenu) == "table"
                    and type(submenu.loop) == "function"
                then

                    submenu.loop = wrapLoop(
                        submenu.loop,
                        "submenu",
                        path .. tostring(name)
                    )

                    wrapOptionSubmenus(
                        submenu,
                        path .. tostring(name) .. "/"
                    )

                end

            end

        end

        wrapOptionSubmenus(options.menu, "options/")

    end

    menuLoopsWrapped = true
    debugLog("Menu loop contexts installed")

    return true

end


-- Install immediately. These functions already exist by the time the
-- external module is loaded in the standard IKEMEN GO 1.0.0 startup.
installRefreshOverlayWrapper()
installMenuDrawWrapper()


-- --------------------------------------------------------------
-- MENU ITEM / SELECT / VERSUS
-- --------------------------------------------------------------

local function onMenuItem(t, item)

    if t == nil
        or item == nil
        or t[item] == nil
    then
        return
    end

    local itemName = t[item].itemname

    -- Replay entry remains on main.t_itemname.
    if itemName == "replay" then

        activeScreen = "replay"
        markScreenFrame("replay")

        resetScreenState("replay")
        enterScreen("replay")

    end

end


-- --------------------------------------------------------------
-- SELECT RESET
-- --------------------------------------------------------------

local function onSelectReset()

    resetScreenState("select")
    resetScreenState("versus")

end


-- --------------------------------------------------------------
-- SELECT
-- --------------------------------------------------------------

local function onSelect()

    activeScreen = "select"
    lastSelectFrame = getFrameCount()
    markScreenFrame("select")

    local s = getState("select")

    if s.currentTrack == nil then
        enterScreen("select")
    else
        drawScreen("select")
    end

end


-- --------------------------------------------------------------
-- VERSUS
-- --------------------------------------------------------------

local function onVersus()

    activeScreen = "versus"
    markScreenFrame("versus")

    local s = getState("versus")

    if s.currentTrack == nil then
        enterScreen("versus")
    else
        drawScreen("versus")
    end

end


-- SELECT EXIT WATCHDOG
-- ============================================================
--
-- The Select screen hook is called while the Character Select
-- screen is active. When the game returns to the mode menu, that
-- hook stops running. We use the global loop to detect that gap
-- and clear the previous Select overlay without depending on a
-- specific menu hook.
--
-- ============================================================

local function onGlobalLoop()

    local frame = getFrameCount()

    if frame == nil then
        return
    end

    if activeScreen == "select"
        and lastSelectFrame ~= nil
        and frame - lastSelectFrame > selectLeaveGraceFrames
    then
        debugLog(
            "Select hook stopped | Last frame: "
            .. tostring(lastSelectFrame)
            .. " | Current frame: "
            .. tostring(frame)
        )

        resetScreenState("select")
        clearActiveScreen("select hook stopped")
        lastSelectFrame = nil
    end

end


-- --------------------------------------------------------------
-- POST-MATCH INITIALIZATION
-- --------------------------------------------------------------
--
-- IKEMEN GO calls the *_init hooks BEFORE the native result/victory/
-- continue BGM is played. If this module calls playBgm() from the
-- init hook, the engine immediately replaces it with its own music.
--
-- Therefore post-match screens are prepared during *_init and their
-- custom BGM is started on the first *_screen hook, after the native
-- BGM setup has completed.
--
-- --------------------------------------------------------------

local function prepareScreen(screen)

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

    local s = getState(screen)

    s.currentTrack = track
    s.startFrame = getFrameCount()
    s.anim = nil
    s.text = nil
    s.musicStarted = false

    debugLog(
        "Prepare: " .. screen
        .. " | Track: " .. tostring(track.file)
        .. " | Display: " .. tostring(config.display)
        .. " | Frame: " .. tostring(s.startFrame)
    )

    return true

end


local function startPreparedMusic(screen)

    local s = getState(screen)

    if s.currentTrack == nil or s.musicStarted then
        return
    end

    playBgm({
        bgm = s.currentTrack.file,
        loop = 1,
        volume = 100,
        loopstart = 0,
        loopend = 0,
        interrupt = true,
    })

    s.musicStarted = true

    debugLog(
        "Play deferred: " .. screen
        .. " | Track: " .. tostring(s.currentTrack.file)
        .. " | Frame: " .. tostring(getFrameCount())
    )

end


local function postMatchInit(screen)

    activeScreen = screen
    markScreenFrame(screen)

    resetScreenState(screen)
    prepareScreen(screen)

end


local function postMatchDraw(screen)

    return function()

        activeScreen = screen
        markScreenFrame(screen)

        startPreparedMusic(screen)
        drawScreen(screen)

    end

end

-- ============================================================
-- INITIALIZATION
-- ============================================================

loadSff()


debugLog("Module loaded | RELEASE")



-- ============================================================
-- MENU DRAW OVERLAY
-- ============================================================
--
-- Standard menu hooks run before IKEMEN GO draws the menu.
-- Drawing the music title directly from those hooks would make
-- it get overwritten by the native menu renderer.
--
-- The common menu draw function is wrapped so the music title/SFF
-- is drawn after the native menu and remains visible.
--
-- ============================================================

-- Wrapper is installed lazily from the hooks above, because external modules
-- may be loaded before main.f_menuCommonDraw exists.


-- ============================================================
-- SAFETY WRAPPER
-- ============================================================
--
-- A Lua error thrown inside a hook callback can silently break
-- the rest of that frame's hook chain (including native engine
-- drawing that runs after it), with nothing visible on screen
-- and no crash dialog. Every hook callback is wrapped so any
-- error is caught and written to the debug log instead.
--
-- ============================================================

local function safeHook(label, fn)

    return function(...)

        local ok, err = pcall(fn, ...)

        if not ok then
            debugLog("ERROR in " .. label .. ": " .. tostring(err))
        end

    end

end


if type(hook) == "table"
    and type(hook.add) == "function"
then

    -- ============================================================
    -- MAIN MENU / OPTIONS CONTEXT
    -- ============================================================
    --
    -- IMPORTANT:
    -- At external-module load time, IKEMEN GO has not necessarily created
    -- main.menu.loop/options.menu.loop yet. V13 tried to wrap them
    -- immediately, so the wrappers were never installed. The V13 debug
    -- log proved this: it contained "Menu draw wrapper installed" but
    -- never "Menu loop contexts installed".
    --
    -- Install the loop wrappers lazily from the native hooks, when the
    -- actual menu functions already exist. The current invocation also
    -- receives its context immediately; later invocations use the wrappers.
    -- ============================================================

    hook.add(
        "main.menu.loop",
        "randomScreenBgmMainMenuContext",
        safeHook("main.menu.loop context", function()

            installMenuLoopContextWrappers()

            menuContext = "title"

            debugLog("Menu context: title")

        end)
    )

    hook.add(
        "options.menu.loop",
        "randomScreenBgmOptionsContext",
        safeHook("options.menu.loop context", function()

            installMenuLoopContextWrappers()

            menuContext = "options"

            debugLog("Menu context: options")

        end)
    )

    -- Global Select exit watchdog
    hook.add(
        "loop",
        "randomScreenBgmSelectExitWatchdog",
        safeHook("onGlobalLoop", onGlobalLoop)
    )

    -- Options / Replay entry
    -- main.t_itemname is fired by IKEMEN GO when a menu item is
    -- selected, immediately before the corresponding action runs.
    hook.add(
        "main.t_itemname",
        "randomScreenBgmMenuItems",
        safeHook("onMenuItem", onMenuItem)
    )

    -- Character Select
    hook.add(
        "start.f_selectReset",
        "randomScreenBgmSelectReset",
        safeHook("onSelectReset", onSelectReset)
    )

    hook.add(
        "start.f_selectScreen",
        "randomScreenBgmSelect",
        safeHook("onSelect", onSelect)
    )

    -- Versus
    hook.add(
        "start.f_selectVersus",
        "randomScreenBgmVersus",
        safeHook("onVersus", onVersus)
    )

    -- Results
    hook.add(
        "game.result_init",
        "randomScreenBgmResultsInit",
        safeHook("postMatchInit:results", function()
            postMatchInit("results")
        end)
    )

    hook.add(
        "game.result",
        "randomScreenBgmResults",
        safeHook("postMatchDraw:results", postMatchDraw("results"))
    )

    -- Victory
    hook.add(
        "game.victory_init",
        "randomScreenBgmVictoryInit",
        safeHook("postMatchInit:victory", function()
            postMatchInit("victory")
        end)
    )

    hook.add(
        "game.victory",
        "randomScreenBgmVictory",
        safeHook("postMatchDraw:victory", postMatchDraw("victory"))
    )

    -- Continue
    hook.add(
        "game.continue_init",
        "randomScreenBgmContinueInit",
        safeHook("postMatchInit:continue", function()
            postMatchInit("continue")
        end)
    )

    hook.add(
        "game.continue",
        "randomScreenBgmContinue",
        safeHook("postMatchDraw:continue", postMatchDraw("continue"))
    )

    -- Hiscore
    hook.add(
        "game.hiscore_init",
        "randomScreenBgmHiscoreInit",
        safeHook("postMatchInit:hiscore", function()
            postMatchInit("hiscore")
        end)
    )

    hook.add(
        "game.hiscore",
        "randomScreenBgmHiscore",
        safeHook("postMatchDraw:hiscore", postMatchDraw("hiscore"))
    )

    -- Challenger
    hook.add(
        "game.challenger_init",
        "randomScreenBgmChallengerInit",
        safeHook("postMatchInit:challenger", function()
            postMatchInit("challenger")
        end)
    )

    hook.add(
        "game.challenger",
        "randomScreenBgmChallenger",
        safeHook("postMatchDraw:challenger", postMatchDraw("challenger"))
    )

end