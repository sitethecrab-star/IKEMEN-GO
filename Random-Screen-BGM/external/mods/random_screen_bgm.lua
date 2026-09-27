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

    if type(print) == "function" then
        print(line)
    end

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
-- file:
--   Path of the audio file, relative to the IKEMEN GO folder, just
--   like the [Music] section of system.def (e.g. "sound/Title.mp3").
--   Subfolders also work (e.g. "sound/clashbound/select.mp3").
--
-- ============================================================


-- --------------------------------------------------------------
-- MAIN MENU (TITLE)
-- --------------------------------------------------------------

local screenConfig = {

    title = {
        enabled = true,
        display = "text",
        playlist = {
            {
                file = "sound/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/The King Of Fighters 94.mp3",
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
        playlist = {
            {
                file = "sound/Eternal Champions.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/Marvel Super Heroes.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/Samurai Shodown.mp3",
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
        playlist = {
            {
                file = "sound/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/The King Of Fighters 94.mp3",
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
        playlist = {
            {
                file = "sound/ssbu.mp3",
                sffGroup = 0,
                sffIndex = 4,
            },
            {
                file = "sound/Naruto -The Raising Fighting Spirit.mp3",
                sffGroup = 0,
                sffIndex = 5,
            },
            {
                file = "sound/Versus Mode - Street Fighter X Tekken.mp3",
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
        playlist = {
            {
                file = "sound/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/The King Of Fighters 94.mp3",
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
        playlist = {
            {
                file = "sound/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/The King Of Fighters 94.mp3",
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
        playlist = {
            {
                file = "sound/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/The King Of Fighters 94.mp3",
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
        playlist = {
            {
                file = "sound/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/The King Of Fighters 94.mp3",
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
        playlist = {
            {
                file = "sound/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/The King Of Fighters 94.mp3",
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
        playlist = {
            {
                file = "sound/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/The King Of Fighters 94.mp3",
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
        playlist = {
            {
                file = "sound/Street Fighter 2.mp3",
                sffGroup = 0,
                sffIndex = 1,
            },
            {
                file = "sound/Mortal Kombat.mp3",
                sffGroup = 0,
                sffIndex = 2,
            },
            {
                file = "sound/The King Of Fighters 94.mp3",
                sffGroup = 0,
                sffIndex = 3,
            },
        },
    },

}

-- ============================================================
-- GENERAL
-- ============================================================

local generalConfig = {
    -- BGM volume used for every random track (0-100).
    volume = 100,

    -- Used to convert delay/duration (seconds) into engine frames.
    framesPerSecond = 60,

    -- Frames without a Select/Versus hook call before that screen is
    -- considered finished (its state is then reset for the next visit).
    leaveGraceFrames = 5,

    -- Title/Options: frames after entry in which the chosen track is
    -- re-requested without restarting it (guards against the engine
    -- replacing or stopping it right after the menu opens).
    menuSafetyFrames = { 20, 90 },
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
local musicFont = nil
local musicFontLoaded = false
local activeScreen = nil

-- Last frame in which each watched screen's own hook ran.
local lastFrameByScreen = {}
local watchedScreens = { "select", "versus" }

-- Display window in frames, computed once.
local displayStartFrames =
    musicTitleConfig.delay * generalConfig.framesPerSecond
local displayEndFrames =
    (musicTitleConfig.delay + musicTitleConfig.duration)
    * generalConfig.framesPerSecond

local unpackValues = table.unpack or unpack

local function packValues(...)
    return { n = select("#", ...), ... }
end


local function isScreenEnabled(config)
    return config ~= nil
        and config.enabled
        and #config.playlist > 0
end


local function getState(screen)

    local s = state[screen]

    if s == nil then
        s = {
            bag = {},
            lastIndex = nil,
            currentTrack = nil,
            startFrame = nil,
            text = nil,
            textFailed = false,
            anim = nil,
            animFailed = false,
            musicStarted = false,
            postDrawAudioPending = false,
            safetyStep = 0,
            cycle = 0,
        }
        state[screen] = s
    end

    return s

end


local function localcoord()

    local info = motif and motif.info
    local lc = info and info.localcoord

    if lc and lc[1] and lc[2] then
        return lc[1], lc[2]
    end

    return 1280, 720

end


-- Clears the per-visit data of a screen. The shuffle bag is kept, so
-- randomization continues across visits.
local function resetScreenState(screen)

    local s = getState(screen)

    if debugConfig.enabled then
        debugLog(
            "Reset: " .. screen
            .. " | Previous track: "
            .. tostring(s.currentTrack and s.currentTrack.file)
        )
    end

    s.currentTrack = nil
    s.startFrame = nil
    s.text = nil
    s.textFailed = false
    s.anim = nil
    s.animFailed = false
    s.musicStarted = false
    s.postDrawAudioPending = false
    s.safetyStep = 0

end


local function clearActiveScreen(reason)

    if activeScreen ~= nil and debugConfig.enabled then
        debugLog(
            "Leave: " .. tostring(activeScreen)
            .. " | Reason: " .. tostring(reason)
        )
    end

    activeScreen = nil

end


local function markScreenFrame(screen)
    lastFrameByScreen[screen] = getFrameCount()
end


-- ============================================================
-- SHUFFLE BAG
-- ============================================================

local function refillBag(config, s)

    local n = #config.playlist
    local bag = {}

    for i = 1, n do
        bag[i] = i
    end

    for i = n, 2, -1 do
        local j = math.random(i)
        bag[i], bag[j] = bag[j], bag[i]
    end

    -- Tracks are taken from the end of the bag. Avoid playing the
    -- same track twice in a row across a refill boundary.
    if n > 1 and bag[n] == s.lastIndex then
        local j = math.random(n - 1)
        bag[n], bag[j] = bag[j], bag[n]
    end

    s.bag = bag

end


local function nextTrack(screen)

    local config = screenConfig[screen]

    if not isScreenEnabled(config) then
        return nil
    end

    local s = getState(screen)

    if #s.bag == 0 then
        refillBag(config, s)
    end

    local index = table.remove(s.bag)

    if index == nil then
        return nil
    end

    s.lastIndex = index

    return config.playlist[index]

end


-- interrupt = false asks the engine to keep the track if it is
-- already playing, and only (re)start it when something else replaced it.
local function playTrack(track, keepIfPlaying)

    playBgm({
        bgm = track.file,
        loop = 1,
        volume = generalConfig.volume,
        loopstart = 0,
        loopend = 0,
        interrupt = not keepIfPlaying,
    })

end


-- ============================================================
-- MUSIC TITLE
-- ============================================================

local function trackName(path)

    local filename = path:match("([^/\\]+)$") or path
    local name = filename:gsub("%.[^%.]+$", "")

    return name

end


-- The font is loaded once and shared by every text object.
local function getMusicFont()

    if not musicFontLoaded then

        musicFontLoaded = true

        if type(fontNew) == "function" then
            musicFont = fontNew(musicTitleAppearance.font)
        end

        if musicFont == nil then
            debugLog("WARNING | font not loaded: " .. tostring(musicTitleAppearance.font))
        end

    end

    return musicFont

end


-- Creates and fully configures the text object once per visit.
-- Per frame, only textImgDraw is called.
local function createText(track)

    if type(textImgNew) ~= "function" then
        return nil
    end

    local t = textImgNew()

    if t == nil then
        return nil
    end

    local font = getMusicFont()

    if font ~= nil and type(textImgSetFont) == "function" then
        textImgSetFont(t, font)
    end

    if type(textImgSetLocalcoord) == "function" then
        local w, h = localcoord()
        textImgSetLocalcoord(t, w, h)
    end

    textImgSetScale(t, musicTitleAppearance.scaleX, musicTitleAppearance.scaleY)
    textImgSetPos(t, musicTitleAppearance.x, musicTitleAppearance.y)
    textImgSetAlign(t, musicTitleAppearance.align)
    textImgSetText(t, musicTitleConfig.label .. trackName(track.file))

    if type(textImgSetColor) == "function" then
        local c = musicTitleAppearance.color
        textImgSetColor(t, c.r, c.g, c.b)
    end

    return t

end


local function drawText(screen, s)

    if s.text == nil then

        if s.textFailed then
            return
        end

        s.text = createText(s.currentTrack)

        if s.text == nil then
            s.textFailed = true
            debugLog(screen .. " text create: ERROR")
            return
        end

    end

    local ok, err = pcall(textImgDraw, s.text)

    if not ok then
        debugLog(screen .. " textImgDraw: ERROR | " .. tostring(err))
    end

end


-- ============================================================
-- MUSIC SFF
-- ============================================================

local function loadSff()

    if not musicSffConfig.enabled then
        return
    end

    if type(fileExists) == "function"
        and not fileExists(musicSffConfig.file)
    then
        debugLog("WARNING | SFF not found: " .. musicSffConfig.file)
        return
    end

    musicSff = sffNew(musicSffConfig.file)

end


local function createAnim(track)

    if musicSff == nil
        or track.sffGroup == nil
        or track.sffIndex == nil
    then
        return nil
    end

    local anim = animNew(
        musicSff,
        tostring(track.sffGroup) .. "," .. tostring(track.sffIndex) .. ", 0,0, -1"
    )

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


local function drawSff(screen, s)

    if s.anim == nil then

        -- A missing sprite is reported once, not retried every frame.
        if s.animFailed then
            return
        end

        s.anim = createAnim(s.currentTrack)

        if s.anim == nil then
            s.animFailed = true
            debugLog(
                screen .. " SFF anim create: ERROR | Group: "
                .. tostring(s.currentTrack.sffGroup)
                .. " | Index: " .. tostring(s.currentTrack.sffIndex)
            )
            return
        end

    end

    animUpdate(s.anim)

    local ok, err = pcall(animDraw, s.anim)

    if not ok then
        debugLog(screen .. " animDraw: ERROR | " .. tostring(err))
    end

end


-- ============================================================
-- SCREEN MUSIC
-- ============================================================

local function drawScreen(screen)

    local s = state[screen]

    if s == nil or s.currentTrack == nil or s.startFrame == nil then
        return
    end

    local config = screenConfig[screen]

    if not isScreenEnabled(config) then
        return
    end

    local frame = getFrameCount()

    if frame == nil then
        return
    end

    local elapsed = frame - s.startFrame

    if elapsed < displayStartFrames or elapsed >= displayEndFrames then
        return
    end

    local display = config.display

    if musicSffConfig.enabled
        and (display == "sprite" or display == "both")
    then
        drawSff(screen, s)
    end

    if musicTitleConfig.enabled
        and (display == "text" or display == "both")
    then
        drawText(screen, s)
    end

end


-- Starts a fresh visual cycle and picks a new track (does not play it).
local function prepareScreen(screen)

    local config = screenConfig[screen]

    if not isScreenEnabled(config) then
        return false
    end

    resetScreenState(screen)

    local s = getState(screen)
    s.cycle = s.cycle + 1

    local track = nextTrack(screen)

    if track == nil then
        return false
    end

    s.currentTrack = track
    s.startFrame = getFrameCount()
    s.musicStarted = false

    if debugConfig.enabled then
        debugLog(
            "Cycle: " .. screen
            .. " | #" .. tostring(s.cycle)
            .. " | Track: " .. tostring(track.file)
            .. " | Display: " .. tostring(config.display)
            .. " | Frame: " .. tostring(s.startFrame)
        )
    end

    return true

end


-- Starts a fresh cycle and plays the new track right away.
local function playScreen(screen)

    if not prepareScreen(screen) then
        return false
    end

    local s = state[screen]
    playTrack(s.currentTrack)
    s.musicStarted = true

    return true

end


local function enterScreen(screen)

    if playScreen(screen) then
        drawScreen(screen)
    else
        debugLog("No playlist available: " .. screen)
    end

end


-- ============================================================
-- MENU RENDER / ENTRY ARCHITECTURE
-- ============================================================
--
--   MENU LOOP  -> identifies where we are (menuContext)
--   MENU DRAW  -> starts a cycle if needed
--   REFRESH    -> draws the active overlay (never changes state)
--
-- Intro/storyboard refreshes happen outside menuDrawContext and can
-- therefore never start Title BGM or draw the Title overlay.
--
-- ============================================================

local refreshWrapped = false
local menuDrawWrapped = false
local menuLoopsWrapped = false

-- "title", "options", "submenu", or nil.
local menuContext = nil
local menuDrawContext = nil


local function enterMenuScreen(screen)

    if activeScreen == screen then
        return
    end

    local previousScreen = activeScreen

    if previousScreen ~= nil then
        resetScreenState(previousScreen)
        clearActiveScreen("menu context changed")
    end

    activeScreen = screen

    debugLog("MENU ENTER | Screen: " .. screen .. " | Previous: " .. tostring(previousScreen))

    -- The track is chosen now but played only once, after the native
    -- menu finished drawing (see the menu draw wrapper).
    if prepareScreen(screen) then
        getState(screen).postDrawAudioPending = true
    end

end


local function clearMenuOverlay()

    if activeScreen == "title" or activeScreen == "options" then
        resetScreenState(activeScreen)
        clearActiveScreen("entered submenu")
    end

end


-- --------------------------------------------------------------
-- REFRESH WRAPPER
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

        local screen = nil

        if menuDrawContext == "title" or menuDrawContext == "options" then
            screen = menuDrawContext
        elseif menuDrawContext == nil and activeScreen == "replay" then
            -- Replay has no per-frame hook of its own; draw it here.
            screen = "replay"
        end

        if screen ~= nil then
            local ok, err = pcall(drawScreen, screen)

            if not ok then
                debugLog("ERROR in overlay (" .. screen .. "): " .. tostring(err))
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
-- The ONLY place where Title/Options screen entry is initiated.
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

    main.f_menuCommonDraw = function(...)

        local context = menuContext
        local previousDrawContext = menuDrawContext
        local isMenuScreen = context == "title" or context == "options"

        if isMenuScreen then

            menuDrawContext = context

            local ok, err = pcall(enterMenuScreen, context)

            if not ok then
                debugLog("ERROR in enterMenuScreen: " .. tostring(err))
            end

        elseif context == "submenu" then

            menuDrawContext = "submenu"
            clearMenuOverlay()

        else

            menuDrawContext = nil

        end

        local results = packValues(pcall(originalMenuDraw, ...))

        if isMenuScreen and activeScreen == context then

            local s = state[context]

            if s ~= nil and s.currentTrack ~= nil then

                if s.postDrawAudioPending then

                    s.postDrawAudioPending = false
                    s.musicStarted = true
                    playTrack(s.currentTrack)
                    debugLog("Post-draw BGM play | Screen: " .. context .. " | Frame: " .. tostring(getFrameCount()))

                else

                    local offset = generalConfig.menuSafetyFrames[s.safetyStep + 1]
                    local frame = getFrameCount()

                    if offset ~= nil and frame ~= nil and frame - s.startFrame >= offset then
                        s.safetyStep = s.safetyStep + 1
                        playTrack(s.currentTrack, true)
                        debugLog("Safety BGM check #" .. s.safetyStep .. " | Screen: " .. context .. " | Frame: " .. tostring(frame))
                    end

                end

            end

        end

        menuDrawContext = previousDrawContext

        if not results[1] then
            error(results[2], 0)
        end

        return unpackValues(results, 2, results.n)

    end

    menuDrawWrapped = true
    debugLog("Menu draw wrapper installed")

    return true

end


-- --------------------------------------------------------------
-- MENU LOOP CONTEXT
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

            local results = packValues(pcall(fn, ...))

            menuContext = previousContext

            if not results[1] then
                error(results[2], 0)
            end

            return unpackValues(results, 2, results.n)

        end

        wrappedFunctions[fn] = wrapped

        debugLog("Menu loop context installed | " .. tostring(label) .. " | Context: " .. context)

        return wrapped

    end

    -- All submenus share the native loop implementation but must
    -- suppress Title/Options rendering while active.
    local function wrapSubmenus(tbl, path)

        if type(tbl) ~= "table" or type(tbl.submenu) ~= "table" then
            return
        end

        for name, submenu in pairs(tbl.submenu) do

            if type(submenu) == "table" and type(submenu.loop) == "function" then
                submenu.loop = wrapLoop(submenu.loop, "submenu", path .. tostring(name))
                wrapSubmenus(submenu, path .. tostring(name) .. "/")
            end

        end

    end

    main.menu.loop = wrapLoop(main.menu.loop, "title", "main")
    wrapSubmenus(main.menu, "")

    if type(options) == "table"
        and type(options.menu) == "table"
        and type(options.menu.loop) == "function"
    then
        options.menu.loop = wrapLoop(options.menu.loop, "options", "options")
        wrapSubmenus(options.menu, "options/")
    end

    menuLoopsWrapped = true
    debugLog("Menu loop contexts installed")

    return true

end


local function installWrappers()
    installRefreshOverlayWrapper()
    installMenuDrawWrapper()
    installMenuLoopContextWrappers()
end


-- Refresh/menu-draw exist at load time in IKEMEN GO 1.0.0. The menu
-- loops may not, so every wrapper is retried lazily from the hooks.
installRefreshOverlayWrapper()
installMenuDrawWrapper()


-- --------------------------------------------------------------
-- MENU ITEM (REPLAY)
-- --------------------------------------------------------------

local function onMenuItem(t, item)

    if t == nil or item == nil or t[item] == nil then
        return
    end

    if t[item].itemname == "replay" then
        activeScreen = "replay"
        enterScreen("replay")
    end

end


-- --------------------------------------------------------------
-- SELECT / VERSUS
-- --------------------------------------------------------------

local function onSelectReset()

    resetScreenState("select")
    resetScreenState("versus")

end


local function onSessionScreen(screen)

    activeScreen = screen
    markScreenFrame(screen)

    local s = state[screen]

    if s == nil or s.currentTrack == nil then
        enterScreen(screen)
    else
        drawScreen(screen)
    end

end


-- ============================================================
-- SELECT / VERSUS EXIT WATCHDOG
-- ============================================================
--
-- The Select and Versus hooks run every frame while those screens
-- are active. When a hook stops running, the screen was left: its
-- state is reset so the next visit gets a new random track (e.g. the
-- Versus screen before every Arcade match).
--
-- ============================================================

local function onGlobalLoop()

    local frame = getFrameCount()

    if frame == nil then
        return
    end

    for i = 1, #watchedScreens do

        local screen = watchedScreens[i]
        local last = lastFrameByScreen[screen]

        if last ~= nil and frame - last > generalConfig.leaveGraceFrames then

            lastFrameByScreen[screen] = nil

            debugLog(screen .. " hook stopped | Last frame: " .. tostring(last))

            resetScreenState(screen)

            if activeScreen == screen then
                clearActiveScreen(screen .. " hook stopped")
            end

        end

    end

end


-- --------------------------------------------------------------
-- POST-MATCH SCREENS
-- --------------------------------------------------------------
--
-- *_init hooks run BEFORE the native BGM is played, so the track is
-- chosen in *_init and started on the first *_screen hook.
--
-- --------------------------------------------------------------

local function postMatchInit(screen)

    activeScreen = screen
    resetScreenState(screen)

    if not isScreenEnabled(screenConfig[screen]) then
        return
    end

    local track = nextTrack(screen)

    if track == nil then
        return
    end

    local s = getState(screen)

    s.currentTrack = track
    s.startFrame = getFrameCount()

    if debugConfig.enabled then
        debugLog("Prepare: " .. screen .. " | Track: " .. tostring(track.file))
    end

end


local function postMatchDraw(screen)

    return function()

        activeScreen = screen

        local s = state[screen]

        if s == nil or s.currentTrack == nil then
            return
        end

        if not s.musicStarted then
            playTrack(s.currentTrack)
            s.musicStarted = true
            debugLog("Play deferred: " .. screen)
        end

        drawScreen(screen)

    end

end


-- ============================================================
-- INITIALIZATION
-- ============================================================

loadSff()

-- Preload the font so the first title display does not hitch.
if musicTitleConfig.enabled then
    for _, config in pairs(screenConfig) do
        if config.enabled
            and (config.display == "text" or config.display == "both")
        then
            getMusicFont()
            break
        end
    end
end

debugLog("Module loaded | RELEASE")


-- ============================================================
-- HOOKS
-- ============================================================
--
-- Every hook callback is wrapped so a Lua error is written to the
-- debug log instead of breaking the rest of that frame's hook chain.
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


if type(hook) == "table" and type(hook.add) == "function" then

    local function setMenuContext(context)

        installWrappers()

        if menuContext ~= context then
            menuContext = context
            debugLog("Menu context: " .. context)
        end

    end

    hook.add("main.menu.loop", "randomScreenBgmMainMenuContext",
        safeHook("main.menu.loop context", function()
            setMenuContext("title")
        end))

    hook.add("options.menu.loop", "randomScreenBgmOptionsContext",
        safeHook("options.menu.loop context", function()
            setMenuContext("options")
        end))

    -- Select/Versus exit watchdog
    hook.add("loop", "randomScreenBgmSelectExitWatchdog",
        safeHook("onGlobalLoop", onGlobalLoop))

    -- Replay entry
    hook.add("main.t_itemname", "randomScreenBgmMenuItems",
        safeHook("onMenuItem", onMenuItem))

    -- Character Select / Versus
    hook.add("start.f_selectReset", "randomScreenBgmSelectReset",
        safeHook("onSelectReset", onSelectReset))

    hook.add("start.f_selectScreen", "randomScreenBgmSelect",
        safeHook("onSelect", function()
            onSessionScreen("select")
        end))

    hook.add("start.f_selectVersus", "randomScreenBgmVersus",
        safeHook("onVersus", function()
            onSessionScreen("versus")
        end))

    -- Post-match screens
    local postMatchHooks = {
        { screen = "results",    init = "game.result_init",     draw = "game.result",     id = "Results" },
        { screen = "victory",    init = "game.victory_init",    draw = "game.victory",    id = "Victory" },
        { screen = "continue",   init = "game.continue_init",   draw = "game.continue",   id = "Continue" },
        { screen = "hiscore",    init = "game.hiscore_init",    draw = "game.hiscore",    id = "Hiscore" },
        { screen = "challenger", init = "game.challenger_init", draw = "game.challenger", id = "Challenger" },
    }

    for _, h in ipairs(postMatchHooks) do

        local screen = h.screen

        hook.add(h.init, "randomScreenBgm" .. h.id .. "Init",
            safeHook("postMatchInit:" .. screen, function()
                postMatchInit(screen)
            end))

        hook.add(h.draw, "randomScreenBgm" .. h.id,
            safeHook("postMatchDraw:" .. screen, postMatchDraw(screen)))

    end

end
