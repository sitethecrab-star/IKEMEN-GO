-- ============================================================
-- CHARACTER INFO - SHARED SFF
-- IKEMEN GO v1.0.0
-- ============================================================
--
-- Verified against the v1.0.0 stable engine source
-- (start.f_selectMenu, start.f_getCharData, start.c[].selRef,
-- getInput, hook.add/hook.run, animNew/animSet*/animDraw,
-- fileExists, sffNew): all unchanged since v1.0.0-rc.3,
-- so no functional changes were required for this module.
--
-- All character cards are stored in ONE SFF:
--
--     external/mods/character_info.sff
--
-- Each character is identified by a GROUP + INDEX pair.
--
-- Format:
--
--     character = {GROUP, INDEX}
--
-- Examples:
--
--     kfm     = {0, 1}
--     a-ryu   = {0, 2}
--     seiya   = {0, 3}
--     ryu     = {1, 0}
--     ken     = {2, 6}
--
-- The module accepts any valid SFF GROUP and INDEX combination.
--
-- The folder structure of the character does not matter.
-- The identifier is taken from the final .def filename.
--
-- X opens the card.
-- X closes the card.
--
-- The complete card is a single sprite from the shared SFF.
-- No per-character SFF is required.
-- ============================================================

local cis = {
    key = 'x',

    -- Shared SFF containing all character cards.
    sffPath = 'external/mods/character_info.sff',

    -- Card dimensions.
    panel = {
        width = 330,
        height = 450,
        y = 145,
        margin = 35,
    },

    open = {false, false},
    ref = {nil, nil},
    char = {nil, nil},
    anim = {nil, nil},
}

-- ============================================================
-- CHARACTER -> SFF GROUP / INDEX
-- ============================================================
--
-- IMPORTANT:
-- The first number is the SFF GROUP.
-- The second number is the SFF INDEX.
--
-- Examples:
--
--     {0, 1}   = group 0, index 1
--     {0, 2}   = group 0, index 2
--     {1, 0}   = group 1, index 0
--     {2, 6}   = group 2, index 6
--     {600, 2} = group 600, index 2
--
-- There is no artificial limit imposed by this Lua table.
--
-- Add new characters here.
-- ============================================================

local charIndex = {
    kfm = {0, 1},
    ['kyo-svc'] = {0,2}
 

-- Add new characters here:
-- chunli = {3, 0},
-- guile = {3, 1},
-- akuma = {10, 5},
-- ['kyo-svc'] = {3, 2},
-- example = {600, 2},
}

-- ============================================================
-- LOAD SHARED SFF
-- ============================================================

local sharedSff = nil

if fileExists(cis.sffPath) then
    sharedSff = sffNew(cis.sffPath)
end

-- ============================================================
-- LOCALCOORD / POSITION
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

local function panelX(side)
    local w = localcoord()

    if side == 1 then
        return cis.panel.margin
    end

    return w - cis.panel.margin - cis.panel.width
end

-- ============================================================
-- SELECTED CHARACTER
-- ============================================================

local function getSelectedRef(player)
    if player == nil then
        return nil
    end

    if start.c[player] == nil then
        return nil
    end

    return start.c[player].selRef
end

-- Extract only the final .def filename.
--
-- Examples:
--   kfm.def                           -> kfm
--   A-ryu/A-ryu.def                   -> a-ryu
--   Anime/CDZ/Seiya/Seiya.def         -> seiya
--   Capcom/StreetFighter/Ryu/Ryu.def  -> ryu

local function getCharacterName(ref)
    if ref == nil then
        return nil
    end

    local cd = start.f_getCharData(ref)

    if cd == nil then
        return nil
    end

    local raw = cd.char or cd.def

    if raw == nil then
        return nil
    end

    raw = tostring(raw)
    raw = raw:gsub('\\', '/')

    local filename = raw:match('([^/]+)$') or raw
    local char = filename:gsub('%.def$', ''):lower()

    return char
end

-- ============================================================
-- LOAD CARD FROM SHARED SFF
-- ============================================================

local function clearSkin(side)
    cis.anim[side] = nil
    cis.char[side] = nil
end

local function loadSkin(side, player)
    clearSkin(side)

    if sharedSff == nil then
        return false
    end

    local ref = getSelectedRef(player)

    if ref == nil then
        return false
    end

    local char = getCharacterName(ref)

    if char == nil
        or char == ''
        or char == 'randomselect'
    then
        return false
    end

    local mapping = charIndex[char]

    if mapping == nil then
        return false
    end

    local group = mapping[1]
    local index = mapping[2]

    if group == nil or index == nil then
        return false
    end

    -- Build the animation definition from GROUP + INDEX.
    --
    -- {0, 1}   -> "0,1, 0,0, -1"
    -- {1, 0}   -> "1,0, 0,0, -1"
    -- {2, 6}   -> "2,6, 0,0, -1"
    -- {600, 2} -> "600,2, 0,0, -1"

    local animDef =
        tostring(group)
        .. ','
        .. tostring(index)
        .. ', 0,0, -1'

    local anim = animNew(sharedSff, animDef)

    if anim == nil then
        return false
    end

    local w, h = localcoord()

    animSetLocalcoord(anim, w, h)
    animSetScale(anim, 1, 1)
    animSetLayerno(anim, 2)
    animSetFacing(anim, 1)
    animSetPos(anim, panelX(side), cis.panel.y)
    animUpdate(anim)

    cis.ref[side] = ref
    cis.char[side] = char
    cis.anim[side] = anim

    return true
end

-- ============================================================
-- OPEN / CLOSE
-- ============================================================

local function openInfo(side, player)
    if loadSkin(side, player) then
        cis.open[side] = true
    end
end

local function closeInfo(side)
    cis.open[side] = false
    cis.ref[side] = nil
    clearSkin(side)
end

-- ============================================================
-- INPUT
-- ============================================================

local originalSelectMenu = start.f_selectMenu

local function infoPressed(cmd, player)
    if cmd ~= nil then
        local ok, result = pcall(
            getInput,
            cmd,
            cis.key
        )

        if ok and result then
            return true
        end
    end

    if player ~= nil then
        local ok, result = pcall(
            getInput,
            player,
            cis.key
        )

        if ok and result then
            return true
        end
    end

    return false
end

start.f_selectMenu = function(
    side,
    cmd,
    player,
    member,
    selectState
)

    -- Card is open: X closes it and blocks normal selection
    -- during this frame.
    if cis.open[side] then

        if infoPressed(cmd, player) then
            closeInfo(side)
            return selectState, false
        end

        if cmd ~= nil
            and motif
            and motif.select_info
            and motif.select_info.cancel
        then
            local ok, result = pcall(
                getInput,
                cmd,
                motif.select_info.cancel.key
            )

            if ok and result then
                closeInfo(side)
                return selectState, false
            end
        end

        return selectState, false
    end

    -- Card is closed: X opens it.
    if infoPressed(cmd, player) then
        openInfo(side, player)
        return selectState, false
    end

    -- Any other command continues through the original
    -- Select Character function.
    return originalSelectMenu(
        side,
        cmd,
        player,
        member,
        selectState
    )
end

-- ============================================================
-- DRAW
-- ============================================================

local function drawInfo(side)
    if not cis.open[side] then
        return
    end

    local anim = cis.anim[side]

    if anim == nil then
        return
    end

    animSetLayerno(anim, 2)
    animSetPos(anim, panelX(side), cis.panel.y)
    animUpdate(anim)
    animDraw(anim, 2)
end

hook.add(
    'start.f_selectScreen',
    'characterInfoSFF',
    function()
        drawInfo(1)
        drawInfo(2)
    end
)

-- ============================================================
-- RESET
-- ============================================================

hook.add(
    'start.f_selectReset',
    'characterInfoSFFReset',
    function()
        closeInfo(1)
        closeInfo(2)
    end
)

-- ============================================================
-- END
-- ============================================================
