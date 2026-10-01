import "./styles.css";
import { parseSff, parseAir, parseAct, loadAction, decodeRecord } from "./sprites.js";
import { SelectScreen, readSelectLayout, readBackground, cellGeometry, cellStyle } from "./selectscreen.js";
import logoUrl from "./assets/ikemen-logo.png";
import creatorLogoUrl from "./assets/muttley-creations.png";

// ============================================================
// IKEMEN GO Launcher 1.0
// ============================================================

const VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.0.0";
const invoke = window.__TAURI__?.core?.invoke;

function loadSetting(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(`launcher.${key}`));
    return value && typeof value === "object" ? { ...fallback, ...value } : fallback;
  } catch {
    return fallback;
  }
}

function saveSetting(key, value) {
  try {
    localStorage.setItem(`launcher.${key}`, JSON.stringify(value));
  } catch {
    // Settings are a convenience only.
  }
}

const state = {
  env: null,
  library: { characters: [], stages: [], lifebars: [] },
  profiles: [],
  profile: null,
  savedName: null,
  tab: "characters",
  filters: {
    characters: { text: "", source: "all", status: "all", collection: "all" },
    stages: { text: "", source: "all", onlySelected: false, collection: "all" }
  },
  // "list" or "tiles" per library (remembered on this PC).
  views: loadSetting("views", { characters: "list", stages: "tiles" }),
  // Collapsed collection groups per library.
  collapsed: { characters: new Set(), stages: new Set() },
  previewCharacter: null,
  carousel: {},
  message: ""
};

const app = document.querySelector("#app");

// ============================================================
// Utilities
// ============================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function call(command, args = {}) {
  if (!invoke) {
    throw new Error("Open the Launcher through the app (Tauri).");
  }

  return invoke(command, args);
}

// Opens the file location in the Windows Explorer.
async function reveal(id) {
  try {
    await call("reveal", { id: id || "" });
  } catch (error) {
    setMessage(String(error), "error");
  }
}

function $(selector, root = document) {
  return root.querySelector(selector);
}

function setMessage(text, kind = "") {
  state.message = text;
  const el = $("#message");

  if (el) {
    el.textContent = text;
    el.className = `message ${kind}`;
  }
}

function matchesText(item, text) {
  if (!text) return true;
  const haystack = `${item.name} ${item.author} ${item.folder ?? ""} ${item.id}`.toLowerCase();
  return text.toLowerCase().split(/\s+/).every(word => haystack.includes(word));
}

function sourceLabel(source) {
  return source === "launcher" ? "Launcher" : "Engine";
}

// ============================================================
// Images (read through Rust, cached as object URLs)
// ============================================================

const imageCache = new Map();

function mimeOf(id) {
  return /\.jpe?g$/i.test(id) ? "image/jpeg" : "image/png";
}

async function imageUrl(id) {
  if (!id) return null;

  if (!imageCache.has(id)) {
    imageCache.set(
      id,
      call("read_file", { id })
        .then(buffer => URL.createObjectURL(new Blob([buffer], { type: mimeOf(id) })))
        .catch(() => null)
    );
  }

  return imageCache.get(id);
}

// Loads images only when they scroll into view (large libraries).
const lazyLoaders = new WeakMap();
const lazyObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    lazyObserver.unobserve(entry.target);
    const load = lazyLoaders.get(entry.target);
    lazyLoaders.delete(entry.target);
    load?.(entry.target);
  }
}, { rootMargin: "300px" });

function lazy(el, load) {
  lazyLoaders.set(el, load);
  lazyObserver.observe(el);
}

function hydrateImages(root) {
  root.querySelectorAll("img[data-src]").forEach(img => lazy(img, loadImage));
}

async function loadImage(img) {
  {
    const url = await imageUrl(img.dataset.src);

    if (url) {
      img.src = url;
      img.removeAttribute("data-src");
    } else {
      img.replaceWith(Object.assign(document.createElement("div"), {
        className: "no-image",
        textContent: "Image not found"
      }));
    }
  }
}

// Converts any picked image to a 1280x720 JPEG (cover crop).
async function imageFileTo720(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;

  const scale = Math.max(1280 / bitmap.width, 720 / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (1280 - w) / 2, (720 - h) / 2, w, h);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", 0.9);
}

function pickPreviewImage(kind, item) {
  const input = Object.assign(document.createElement("input"), {
    type: "file",
    accept: "image/png,image/jpeg,image/webp,image/bmp"
  });

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      setMessage("Saving image...");
      const dataUrl = await imageFileTo720(file);
      const id = await call("save_preview", { kind, id: item.id, dataUrl, ext: "jpg" });

      imageCache.delete(id);
      item.preview = id;
      renderView();
      setMessage(`Image set for ${item.name}.`, "ok");
    } catch (error) {
      setMessage(`Could not save the image: ${error}`, "error");
    }
  };

  input.click();
}

// ============================================================
// Small dialogs (no dependency on window.prompt)
// ============================================================

function dialog({ title, text = "", input = null, confirm = "OK", danger = false }) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `
      <form class="dialog">
        <h2>${escapeHtml(title)}</h2>
        ${text ? `<p>${escapeHtml(text)}</p>` : ""}
        ${input !== null ? `<input class="input" name="value" maxlength="60" value="${escapeHtml(input)}">` : ""}
        <div class="dialog-actions">
          <button type="button" class="btn" data-cancel>Cancel</button>
          <button type="submit" class="btn ${danger ? "danger" : "primary"}">${escapeHtml(confirm)}</button>
        </div>
      </form>`;

    const form = $("form", overlay);
    const field = $("input", overlay);

    const close = value => {
      overlay.remove();
      resolve(value);
    };

    form.onsubmit = event => {
      event.preventDefault();
      close(field ? field.value.trim() : true);
    };

    $("[data-cancel]", overlay).onclick = () => close(null);
    overlay.onkeydown = event => event.key === "Escape" && close(null);

    document.body.append(overlay);
    (field || $("button[type=submit]", overlay)).focus();
    field?.select();
  });
}

// About window (creator credits).
function showAbout() {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="dialog about" tabindex="-1">
      <img class="about-logo" src="${creatorLogoUrl}" alt="Muttley Creations">
      <h2>IKEMEN GO Launcher</h2>
      <p class="about-version">Version ${VERSION}</p>
      <p>Created by <strong>Muttley Creations</strong></p>
      <p class="muted small">Profile launcher for IKEMEN GO. The original game files are never changed.</p>
      <div class="dialog-actions"><button type="button" class="btn primary" data-close>Close</button></div>
    </div>`;

  const close = () => overlay.remove();
  $("[data-close]", overlay).onclick = close;
  overlay.onclick = event => event.target === overlay && close();
  overlay.onkeydown = event => event.key === "Escape" && close();

  document.body.append(overlay);
  $("[data-close]", overlay).focus();
}

// ============================================================
// Profiles
// ============================================================

// Profile v3: "grid" = one entry per available cell of the screenpack
// grid (character id, "randomselect" or null = empty cell), "extras" =
// characters outside the grid (exclude = 1).
function newProfile(name) {
  return {
    version: 3,
    name,
    motif: null,
    grid: [],
    extras: [],
    // select.def parameters per character: { hidden, order, ordersurvival, bonus, unlock }
    params: {},
    // [Options] overrides: { arcade: [6,1,1,...], team: [...], timeattack: [...], survival: [...] }
    maxmatches: null,
    // Bonus stage in the arcade journey: { enabled, after (order), chars }
    bonusStage: { enabled: false, after: 1, chars: [] },
    stages: [],
    lifebar: null,
    updated_at: new Date().toISOString()
  };
}

function normalizeProfile(raw) {
  const ids = list => (Array.isArray(list) ? list.filter(x => typeof x === "string" && x) : []);
  const profile = {
    ...newProfile(String(raw.name || "Profile")),
    ...raw,
    stages: ids(raw.stages),
    extras: ids(raw.extras),
    lifebar: typeof raw.lifebar === "string" ? raw.lifebar : null,
    motif: typeof raw.motif === "string" && raw.motif ? raw.motif : null,
    params: raw.params && typeof raw.params === "object" ? raw.params : {},
    maxmatches: raw.maxmatches && typeof raw.maxmatches === "object" ? raw.maxmatches : null,
    bonusStage: {
      enabled: !!raw.bonusStage?.enabled,
      after: Math.min(9, Math.max(1, parseInt(raw.bonusStage?.after, 10) || 1)),
      chars: ids(raw.bonusStage?.chars)
    }
  };

  if (Array.isArray(raw.grid)) {
    profile.grid = raw.grid.map(x => (typeof x === "string" && x ? x : null));
  } else {
    // Profiles v2 (plain list): characters in order, then the random
    // cell. Missing characters are left out.
    const known = new Set(state.library.characters.map(c => c.id));
    profile.grid = ids(raw.characters).filter(id => known.has(id));
    if (raw.random_slot !== false) profile.grid.push("randomselect");
  }

  delete profile.characters;
  delete profile.random_slot;
  profile.version = 3;

  return profile;
}

function uniqueName(base) {
  const taken = new Set(state.profiles.map(p => p.name.toLowerCase()));
  let name = base;

  for (let n = 2; taken.has(name.toLowerCase()); n++) {
    name = `${base} ${n}`;
  }

  return name;
}

let saveTimer = null;

function changed() {
  state.profile.updated_at = new Date().toISOString();
  setSaveStatus("Saving...");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
  updateCounts();
}

async function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;

  const profile = state.profile;
  if (!profile) return;

  try {
    await call("save_profile", { profile, previousName: state.savedName });
    state.savedName = profile.name;

    const index = state.profiles.findIndex(p => p === profile);
    if (index < 0) state.profiles.push(profile);

    setSaveStatus("Saved");
    return true;
  } catch (error) {
    setSaveStatus("Save error");
    setMessage(String(error), "error");
    return false;
  }
}

function setSaveStatus(text) {
  const el = $("#saveStatus");
  if (el) el.textContent = text;
}

async function selectProfile(profile) {
  if (saveTimer) await saveNow();

  selectedCell = null;
  state.profile = profile;
  state.savedName = state.profiles.includes(profile) ? profile.name : null;
  render();
}

async function createProfile() {
  const name = await dialog({ title: "New profile", input: uniqueName("New profile"), confirm: "Create" });
  if (!name) return;

  if (state.profiles.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    setMessage("A profile with this name already exists.", "error");
    return;
  }

  if (saveTimer) await saveNow();

  const previous = { profile: state.profile, savedName: state.savedName };
  const profile = newProfile(name);
  state.profiles.push(profile);
  state.profile = profile;
  state.savedName = null;

  if (!(await saveNow())) {
    state.profiles = state.profiles.filter(p => p !== profile);
    Object.assign(state, previous);
  }

  render();
}

async function renameProfile() {
  const profile = state.profile;
  const name = await dialog({ title: "Rename profile", input: profile.name, confirm: "Rename" });

  if (!name || name === profile.name) return;

  if (state.profiles.some(p => p !== profile && p.name.toLowerCase() === name.toLowerCase())) {
    setMessage("A profile with this name already exists.", "error");
    return;
  }

  if (saveTimer) await saveNow();

  const oldName = profile.name;
  profile.name = name;

  if (!(await saveNow())) profile.name = oldName;

  render();
}

async function duplicateProfile() {
  if (saveTimer) await saveNow();

  const copy = normalizeProfile(JSON.parse(JSON.stringify(state.profile)));
  copy.name = uniqueName(`${state.profile.name} (copy)`);

  const previous = { profile: state.profile, savedName: state.savedName };
  state.profiles.push(copy);
  state.profile = copy;
  state.savedName = null;

  if (!(await saveNow())) {
    state.profiles = state.profiles.filter(p => p !== copy);
    Object.assign(state, previous);
  }

  render();
}

async function deleteProfile() {
  const profile = state.profile;

  const ok = await dialog({
    title: "Delete profile",
    text: `Delete "${profile.name}"? Characters, stages and lifebars are not deleted.`,
    confirm: "Delete",
    danger: true
  });

  if (!ok) return;

  clearTimeout(saveTimer);
  saveTimer = null;

  try {
    if (state.savedName) {
      await call("delete_profile", { name: state.savedName });
    }
  } catch (error) {
    setMessage(String(error), "error");
    return;
  }

  state.profiles = state.profiles.filter(p => p !== profile);

  if (state.profiles.length) {
    state.profile = state.profiles[0];
    state.savedName = state.profile.name;
  } else {
    state.profile = newProfile("My profile");
    state.profiles.push(state.profile);
    state.savedName = null;
    await saveNow();
  }

  render();
}

// Library ids referenced by the profile that no longer exist.
function missingItems() {
  const p = state.profile;
  if (!p) return [];

  const chars = new Set(state.library.characters.map(c => c.id));
  const stages = new Set(state.library.stages.map(s => s.id));
  const lifebars = new Set(state.library.lifebars.map(l => l.id));

  const packs = new Set((state.library.screenpacks || []).map(s => s.id));

  return [
    ...(p.motif && !packs.has(p.motif) ? [p.motif] : []),
    ...p.grid.filter(id => id && id !== "randomselect" && !chars.has(id)),
    ...p.extras.filter(id => !chars.has(id)),
    ...p.stages.filter(id => !stages.has(id)),
    ...(p.lifebar && !lifebars.has(p.lifebar) ? [p.lifebar] : [])
  ];
}

function removeMissing() {
  const p = state.profile;
  const chars = new Set(state.library.characters.map(c => c.id));
  const stages = new Set(state.library.stages.map(s => s.id));
  const lifebars = new Set(state.library.lifebars.map(l => l.id));

  p.grid = p.grid.map(id => (id && id !== "randomselect" && !chars.has(id) ? null : id));
  p.extras = p.extras.filter(id => chars.has(id));
  p.stages = p.stages.filter(id => stages.has(id));
  if (p.lifebar && !lifebars.has(p.lifebar)) p.lifebar = null;
  if (p.motif && !(state.library.screenpacks || []).some(s => s.id === p.motif)) p.motif = null;

  changed();
  render();
}

// ============================================================
// PLAY
// ============================================================

async function play() {
  const profile = state.profile;

  const known = new Set(state.library.characters.map(c => c.id));

  if (![...profile.grid, ...profile.extras].some(id => known.has(id))) {
    setMessage("Put at least one character on the grid before playing.", "error");
    state.tab = "characters";
    render();
    return;
  }

  if (!profile.stages.some(id => state.library.stages.some(s => s.id === id))) {
    const ok = await dialog({
      title: "No stages selected",
      text: "This profile has no stages, so IKEMEN GO may not be able to start a fight. Play anyway?",
      confirm: "Play anyway"
    });

    if (!ok) {
      state.tab = "stages";
      renderView();
      return;
    }
  }

  const button = $("#playBtn");
  button.disabled = true;

  try {
    if (saveTimer) await saveNow();

    const result = await call("launch_profile", { profile: withBonusStage(profile) });
    const missing = Array.isArray(result) ? result : result?.missing || [];
    const warnings = Array.isArray(result) ? [] : result?.warnings || [];
    const notes = [
      ...warnings,
      ...(missing.length ? [`${missing.length} profile item(s) were not found and were left out.`] : [])
    ];

    setMessage(
      notes.length ? `IKEMEN GO started. ${notes.join(" ")}` : `IKEMEN GO started with profile "${profile.name}".`,
      notes.length ? "warn" : "ok"
    );
  } catch (error) {
    setMessage(error?.message || String(error), "error");
  } finally {
    setTimeout(() => (button.disabled = false), 1500);
  }
}

// ============================================================
// Render: shell
// ============================================================

function render() {
  const p = state.profile;
  const env = state.env;

  app.innerHTML = `
    <div class="app">
      <header class="topbar">
        <div class="brand"><img src="${logoUrl}" alt=""><div>IKEMEN GO<span>LAUNCHER</span></div></div>

        <div class="profile-bar">
          <label for="profileSelect">Profile</label>
          <select id="profileSelect" class="input">
            ${state.profiles
              .map((profile, i) => `<option value="${i}" ${profile === p ? "selected" : ""}>${escapeHtml(profile.name)}</option>`)
              .join("")}
          </select>
          <button class="btn" id="newProfile" title="New profile">New</button>
          <button class="btn" id="renameProfile" title="Rename">Rename</button>
          <button class="btn" id="duplicateProfile" title="Duplicate">Duplicate</button>
          <button class="btn ghost-danger" id="deleteProfile" title="Delete">Delete</button>
          <span id="saveStatus" class="save-status"></span>
        </div>

        <button class="btn play" id="playBtn">▶ PLAY</button>
      </header>

      <nav class="tabs">
        <button data-tab="screenpack">Screenpack <b id="countScreenpack"></b></button>
        <button data-tab="characters">Characters <b id="countCharacters"></b></button>
        <button data-tab="order">Order</button>
        <button data-tab="stages">Stages <b id="countStages"></b></button>
        <button data-tab="lifebar">Lifebar <b id="countLifebar"></b></button>
        <button class="refresh" id="refreshBtn" title="Look for new characters, stages and lifebars (F5)">⟳ Refresh library</button>
      </nav>

      <main id="view" class="view"></main>

      <footer class="statusbar">
        <span title="${escapeHtml(env?.engine_root)}">Engine: ${escapeHtml(env?.engine_root || "—")}</span>
        <span id="screenpackStatus"></span>
        <span id="missing"></span>
        <span id="message" class="message"></span>
        <button class="creator" id="aboutBtn" title="About"><img src="${creatorLogoUrl}" alt="">by Muttley Creations • v${VERSION}</button>
      </footer>
    </div>`;

  $("#profileSelect").onchange = event => selectProfile(state.profiles[Number(event.target.value)]);
  $("#newProfile").onclick = createProfile;
  $("#renameProfile").onclick = renameProfile;
  $("#duplicateProfile").onclick = duplicateProfile;
  $("#deleteProfile").onclick = deleteProfile;
  $("#playBtn").onclick = play;
  $("#refreshBtn").onclick = reloadLibrary;
  $("#aboutBtn").onclick = showAbout;

  app.querySelectorAll("[data-tab]").forEach(button => {
    button.onclick = () => {
      state.tab = button.dataset.tab;
      renderView();
    };
  });

  setMessage(state.message);
  setSaveStatus(state.savedName ? "Saved" : "");
  renderView();
}

// ============================================================
// Screenpack of the profile and its grid
// ============================================================

const RANDOM = "randomselect";

function currentScreenpackId() {
  return state.profile?.motif || state.env?.motif || "";
}

function currentScreenpack() {
  return state.library.screenpacks?.find(s => s.id === currentScreenpackId()) || null;
}

// Variants of the same screenpack (e.g. "system", "120 slots") are
// grouped in one package; the carousel images belong to the package.
function screenpackPackages() {
  if (state.packages) return state.packages;

  const map = new Map();

  for (const sp of state.library.screenpacks || []) {
    const key = sp.package || sp.id;

    if (!map.has(key)) {
      map.set(key, { key, name: sp.package_name || sp.name, variants: [], previews: sp.previews || [] });
    }

    map.get(key).variants.push(sp);
  }

  for (const pack of map.values()) {
    // "system.def" first, then by number of slots.
    pack.variants.sort((a, b) =>
      (b.variant.toLowerCase() === "system") - (a.variant.toLowerCase() === "system") || a.slots - b.slots
    );
    pack.variants.forEach(v => (v.pack = pack));
  }

  state.packages = [...map.values()].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  return state.packages;
}

function packOf(sp) {
  screenpackPackages();
  return sp?.pack || null;
}

// Cells of the screenpack grid in reading order. Disabled cells
// (cell.C-R.skip = 1) have no index; the others are numbered 0..slots-1,
// which is the order of the [Characters] entries.
function gridCells(sp) {
  const rows = sp?.rows || 5;
  const columns = sp?.columns || 6;
  const skip = new Set((sp?.skip_cells || []).map(([c, r]) => `${c}-${r}`));
  const cells = [];
  let index = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      cells.push(skip.has(`${c}-${r}`) ? { col: c, row: r, skip: true } : { col: c, row: r, index: index++ });
    }
  }

  return { rows, columns, cells, slots: index };
}

function gridCapacity() {
  return gridCells(currentScreenpack()).slots;
}

function occupiedCount() {
  return state.profile.grid.filter(Boolean).length;
}

function gridIndexOf(id) {
  return state.profile.grid.indexOf(id);
}

function trimGrid() {
  const grid = state.profile.grid;
  while (grid.length && !grid[grid.length - 1]) grid.pop();
}

// Cells beyond the grid (smaller screenpack) move to the extras.
function fitGridToScreenpack() {
  // Unknown screenpack (missing folder, library not loaded): its real size
  // is unknown, so nothing is moved.
  if (!currentScreenpack()) return 0;

  const cap = gridCapacity();
  const p = state.profile;

  if (p.grid.length <= cap) return 0;

  const overflow = p.grid.splice(cap).filter(id => id && id !== RANDOM);

  for (const id of overflow.reverse()) {
    if (!p.extras.includes(id)) p.extras.unshift(id);
  }

  trimGrid();
  return overflow.length;
}

function slotText() {
  return `${occupiedCount()}/${gridCapacity()}`;
}

function updateSlotInfo() {
  const el = $("#slotInfo");
  if (!el) return;

  const sp = currentScreenpack();
  const { rows, columns, slots } = gridCells(sp);
  const used = occupiedCount();
  const extras = state.profile.extras.length;

  el.className = `slot-info ${used >= slots ? "full" : ""}`;
  el.textContent =
    `Grid ${rows}×${columns} — ${used} used / ${slots - used} free` +
    (extras ? ` • ${extras} extra(s)` : "");
}

function updateCounts() {
  const p = state.profile;
  if (!p) return;

  const sp = currentScreenpack();
  const pack = packOf(sp);
  const label = sp ? (pack?.variants.length > 1 ? `${pack.name} — ${sp.variant}` : pack?.name || sp.name) : "—";
  $("#countScreenpack").textContent = label;
  $("#screenpackStatus").textContent = `Screenpack: ${sp ? `${label} (${sp.id})` : currentScreenpackId() || "—"}`;

  $("#countCharacters").textContent = slotText();
  $("#countStages").textContent = p.stages.length;

  const lifebar = state.library.lifebars.find(l => l.id === p.lifebar);
  $("#countLifebar").textContent = lifebar ? "1" : "default";

  updateSlotInfo();

  const missing = missingItems();
  const el = $("#missing");
  el.innerHTML = missing.length
    ? `<button class="link warn" id="removeMissing" title="${escapeHtml(missing.join("\n"))}">⚠ ${missing.length} item(s) not found — remove</button>`
    : "";

  if (missing.length) $("#removeMissing").onclick = removeMissing;
}

function renderView() {
  const view = $("#view");

  app.querySelectorAll("[data-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === state.tab);
  });

  stopAnimation();
  stopCarousel();
  stopSelectScreen();
  closeContextMenu();

  if (state.tab === "screenpack") renderScreenpacks(view);
  else if (state.tab === "characters") renderCharacters(view);
  else if (state.tab === "order") renderOrder(view);
  else if (state.tab === "stages") renderStages(view);
  else renderLifebars(view);

  updateCounts();
}

// ============================================================
// Portraits and screenpack cell sprites (read_sprite)
// ============================================================

const spriteCache = new Map();
const spriteQueue = [];
let spriteActive = 0;

function runSpriteQueue() {
  while (spriteActive < 4 && spriteQueue.length) {
    const job = spriteQueue.shift();
    spriteActive++;
    job().finally(() => {
      spriteActive--;
      runSpriteQueue();
    });
  }
}

// Returns one decoded SFF sprite (cached): { url, canvas, width,
// height, axisX, axisY }, or null.
function spriteInfo(file, group, index) {
  if (!file) return Promise.resolve(null);

  const key = `${file}|${group}|${index}`;

  if (!spriteCache.has(key)) {
    spriteCache.set(key, new Promise(resolve => {
      spriteQueue.push(async () => {
        try {
          const record = await call("read_sprite", { id: file, group, index });
          const image = await decodeRecord(record);

          if (!image) return resolve(null);

          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          canvas.getContext("2d").putImageData(new ImageData(image.rgba, image.width, image.height), 0, 0);
          resolve({
            url: canvas.toDataURL(),
            canvas,
            width: image.width,
            height: image.height,
            axisX: image.axisX || 0,
            axisY: image.axisY || 0,
            // SFF v2 PNG 24/32 bits: true color with its own alpha.
            alpha: record.version === 2 && record.format >= 11
          });
        } catch {
          resolve(null);
        }
      });
      runSpriteQueue();
    }));
  }

  return spriteCache.get(key);
}

// Data URL of one SFF sprite, or null.
async function spriteUrl(file, group, index) {
  return (await spriteInfo(file, group, index))?.url || null;
}

// Portrait of the screenpack (portrait.spr), or the standard 9000,0
// when the character does not have that sprite. `small` = list icon,
// 9000,0 first.
async function portraitUrl(character, small = false) {
  const [g, i] = currentScreenpack()?.portrait_spr || [9000, 0];
  const order = small ? [[9000, 0], [g, i]] : [[g, i], [9000, 0]];
  const tried = new Set();

  for (const [group, index] of order) {
    if (tried.has(`${group},${index}`)) continue;
    tried.add(`${group},${index}`);

    const url = await spriteUrl(character?.sprite, group, index);
    if (url) return url;
  }

  return null;
}

function hydratePortraits(root, small = false) {
  root.querySelectorAll("img[data-portrait]").forEach(img => lazy(img, target => loadPortrait(target, small)));
}

async function loadPortrait(img, small) {
  {
    const c = charById(img.dataset.portrait);
    const url = await portraitUrl(c, small);

    if (url) {
      img.src = url;
    } else {
      img.replaceWith(Object.assign(document.createElement("span"), {
        className: "portrait-fallback",
        textContent: (c?.name || "?").slice(0, 2).toUpperCase()
      }));
    }

    img.removeAttribute("data-portrait");
  }
}

// id -> character (rebuilt when the library changes).
let charIndex = { source: null, map: new Map() };

function charById(id) {
  if (charIndex.source !== state.library.characters) {
    charIndex = { source: state.library.characters, map: new Map(state.library.characters.map(c => [c.id, c])) };
  }

  return charIndex.map.get(id) || null;
}

// ============================================================
// Collections (group folders) and list/thumbnail views
// ============================================================

function collectionsOf(items) {
  const counts = new Map();
  for (const item of items) counts.set(item.collection || "", (counts.get(item.collection || "") || 0) + 1);
  return counts;
}

function collectionFilterHtml(filter, items) {
  const counts = collectionsOf(items);
  const names = [...counts.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b));

  if (!names.length) return "";

  return `
    <select class="input small" data-filter="collection" title="Collection (group folder)">
      <option value="all" ${filter.collection === "all" ? "selected" : ""}>All collections</option>
      ${names.map(n => `<option value="${escapeHtml(n)}" ${filter.collection === n ? "selected" : ""}>${escapeHtml(n)} (${counts.get(n)})</option>`).join("")}
      ${counts.has("") ? `<option value="" ${filter.collection === "" ? "selected" : ""}>No collection (${counts.get("")})</option>` : ""}
    </select>`;
}

function matchesCollection(item, filter) {
  return filter.collection === "all" || (item.collection || "") === filter.collection;
}

// Groups items by collection: named collections (A-Z), then the rest.
// Returns null when nothing is grouped (no headers needed).
function groupByCollection(items) {
  const groups = new Map();

  for (const item of items) {
    const key = item.collection || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  if (groups.size === 1 && groups.has("")) return null;

  return [...groups.entries()]
    .sort(([a], [b]) => (a === "") - (b === "") || a.localeCompare(b))
    .map(([name, list]) => ({ name, items: list }));
}

function groupHeadHtml(kind, name, count) {
  const collapsed = state.collapsed[kind].has(name);
  return `<div class="group-head ${collapsed ? "collapsed" : ""}" data-group="${escapeHtml(name)}"><span class="caret">▾</span><span class="group-name">${escapeHtml(name || "Other")}</span><small>${count}</small></div>`;
}

// Items with collection headers (collapsible).
function groupedHtml(kind, items, itemHtml) {
  const groups = groupByCollection(items);
  if (!groups) return items.map(itemHtml).join("");

  return groups
    .map(g => groupHeadHtml(kind, g.name, g.items.length) + (state.collapsed[kind].has(g.name) ? "" : g.items.map(itemHtml).join("")))
    .join("");
}

function bindGroupHeads(root, kind, refill) {
  root.querySelectorAll(".group-head").forEach(head => {
    head.onclick = event => {
      event.stopPropagation();
      const set = state.collapsed[kind];
      const name = head.dataset.group;
      set.has(name) ? set.delete(name) : set.add(name);
      refill();
    };
  });
}

function viewToggleHtml(kind) {
  const view = state.views[kind];
  return `
    <div class="segmented view-toggle" data-view-toggle="${kind}">
      <button data-view="list" class="${view === "list" ? "on" : ""}" title="List">☰</button>
      <button data-view="tiles" class="${view === "tiles" ? "on" : ""}" title="Thumbnails">▦</button>
    </div>`;
}

function bindViewToggle(root, kind, refill) {
  root.querySelectorAll(`[data-view-toggle="${kind}"] [data-view]`).forEach(button => {
    button.onclick = () => {
      state.views[kind] = button.dataset.view;
      saveSetting("views", state.views);
      button.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === button));
      refill();
    };
  });
}

// ============================================================
// Characters: library + grid editor (VSelect style)
// ============================================================

function visibleCharacters() {
  const f = state.filters.characters;
  const inGrid = new Set(state.profile.grid.filter(Boolean));
  const extras = new Set(state.profile.extras);

  return state.library.characters.filter(c => {
    const status = inGrid.has(c.id) ? "grid" : extras.has(c.id) ? "extra" : "free";

    return (f.source === "all" || c.source === f.source) &&
      (f.status === "all" || f.status === status) &&
      matchesCollection(c, f) &&
      matchesText(c, f.text);
  });
}

function renderCharacters(view) {
  const f = state.filters.characters;
  f.status ||= "all";

  const moved = fitGridToScreenpack();

  if (moved) {
    changed();
    setMessage(`${moved} character(s) did not fit this screenpack grid and were moved to the extras.`, "warn");
  }

  view.innerHTML = `
    <div class="editor">
      <section class="panel lib-panel" data-drop="library">
        <div class="toolbar wrap lib-toolbar">
          <input class="input grow full-row" data-filter="text" placeholder="Search character..." value="${escapeHtml(f.text)}">
          ${collectionFilterHtml(f, state.library.characters)}
          <select class="input small" data-filter="source">
            <option value="all" ${f.source === "all" ? "selected" : ""}>All sources</option>
            <option value="launcher" ${f.source === "launcher" ? "selected" : ""}>Launcher</option>
            <option value="engine" ${f.source === "engine" ? "selected" : ""}>Engine</option>
          </select>
          <select class="input small" data-filter="status">
            <option value="all" ${f.status === "all" ? "selected" : ""}>All</option>
            <option value="free" ${f.status === "free" ? "selected" : ""}>Not on grid</option>
            <option value="grid" ${f.status === "grid" ? "selected" : ""}>On grid</option>
            <option value="extra" ${f.status === "extra" ? "selected" : ""}>Extras</option>
          </select>
          ${viewToggleHtml("characters")}
        </div>
        <div class="char-list" id="charList"></div>
        <div class="hint">Drag to the grid • double-click = next free cell</div>
      </section>

      <section class="panel board-panel">
        <div class="toolbar wrap">
          <span id="slotInfo" class="slot-info"></span>
          <span class="random-chip" data-drag="random" title="Drag to a cell">? Random</span>
          <button class="btn small" id="boardView" title="Switch between the real screenpack screen and the simple grid"></button>
          <button class="btn small" id="boardZoom" title="Zoom in on the grid area"></button>
          <button class="btn small right" id="fillGrid" title="Fill the free cells with the characters visible in the list">Auto-fill</button>
          <button class="btn small" id="compactGrid" title="Remove the empty cells between characters">Compact</button>
          <button class="btn small ghost-danger" id="clearGrid">Clear</button>
        </div>
        <div class="board" id="board">
          <div class="board-bg" id="boardBg"></div>
          <div class="board-screen" id="boardScreen"></div>
          <div class="board-grid" id="boardGrid"></div>
          <div class="board-nav" id="boardNav"></div>
        </div>
        <div class="extras" data-drop="extras">
          <span class="extras-label" title="Characters that exist in the game but do not appear on the grid (exclude = 1)">Extras</span>
          <div class="extras-list" id="extrasList"></div>
        </div>
      </section>

      <section class="panel preview-panel" id="charPreview"></section>
    </div>`;

  bindFilters(view, "characters", fillCharacterList);
  bindViewToggle(view, "characters", fillCharacterList);

  $("#fillGrid").onclick = autoFill;
  $("#compactGrid").onclick = compactGrid;
  $("#clearGrid").onclick = clearGrid;
  $("#boardZoom").onclick = () => {
    state.screenZoom = !state.screenZoom;
    renderBoard();
  };
  $("#boardView").onclick = () => {
    state.boardView = boardMode(currentScreenpack()) === "screen" ? "grid" : "screen";
    renderBoard();
  };

  bindDrag(view);
  fillCharacterList();
  renderBoard();
  renderExtras();
  renderCharacterPreview();
}

function fillCharacterList() {
  const list = $("#charList");
  if (!list) return;

  const items = visibleCharacters();
  const inGrid = new Set(state.profile.grid.filter(Boolean));
  const extras = new Set(state.profile.extras);

  if (!state.library.characters.length) {
    list.innerHTML = `
      <div class="empty">
        <strong>No characters found.</strong>
        Put characters in <code>${escapeHtml(state.env?.launcher_name)}/Characters</code> or in <code>chars/</code> and click Refresh library.
      </div>`;
    return;
  }

  const tiles = state.views.characters === "tiles";

  const rowHtml = c => {
    const status = inGrid.has(c.id) ? "grid" : extras.has(c.id) ? "extra" : "";
    const classes = `char-row ${tiles ? "tile" : ""} ${state.previewCharacter === c.id ? "active" : ""} ${status ? "used" : ""}`;

    if (tiles) {
      return `
        <div class="${classes}" data-id="${escapeHtml(c.id)}" data-drag="library" title="${escapeHtml(`${c.name}${c.author ? ` — ${c.author}` : ""}`)}">
          <span class="portrait"><img data-portrait="${escapeHtml(c.id)}" alt=""></span>
          <span class="tile-name">${escapeHtml(c.name)}</span>
          ${status ? `<i class="tile-mark ${status}" title="${status === "grid" ? "On grid" : "Extra"}"></i>` : ""}
        </div>`;
    }

    return `
      <div class="${classes}" data-id="${escapeHtml(c.id)}" data-drag="library">
        <span class="portrait"><img data-portrait="${escapeHtml(c.id)}" alt=""></span>
        <div class="char-info">
          <strong>${escapeHtml(c.name)}</strong>
          <small>${escapeHtml(c.author || c.folder || c.id)}</small>
        </div>
        ${status === "grid" ? `<span class="tag grid">Grid</span>` : status === "extra" ? `<span class="tag">Extra</span>` : `<span class="tag ${c.source}">${sourceLabel(c.source)}</span>`}
      </div>`;
  };

  list.classList.toggle("tiles", tiles);
  list.innerHTML = items.length
    ? groupedHtml("characters", items, rowHtml)
    : `<div class="empty">No character matches the filter.</div>`;

  list.querySelectorAll(".char-row").forEach(row => {
    row.ondblclick = () => placeInFirstFree(row.dataset.id);
  });

  bindGroupHeads(list, "characters", fillCharacterList);
  hydratePortraits(list, true);
}

// ---------- Board ----------

let selectedCell = null;

function cellHtml(cell) {
  if (cell.skip) {
    return `<div class="cell skip" title="Cell disabled by the screenpack"></div>`;
  }

  const id = state.profile.grid[cell.index] || null;
  const selected = selectedCell === cell.index ? "selected" : "";

  if (!id) {
    return `<div class="cell empty ${selected}" data-cell="${cell.index}" data-drop="cell"></div>`;
  }

  if (id === RANDOM) {
    return `<div class="cell random ${selected}" data-cell="${cell.index}" data-drop="cell" data-drag="cell" title="Random"><img data-random alt=""><b>?</b></div>`;
  }

  const c = charById(id);

  return `
    <div class="cell filled ${c ? "" : "missing"} ${selected}" data-cell="${cell.index}" data-drop="cell" data-drag="cell" title="${escapeHtml(c ? c.name : `${id} (not found)`)}">
      ${c ? `<img data-portrait="${escapeHtml(id)}" alt="">` : "<b>!</b>"}
      ${paramBadges(id)}
    </div>`;
}

async function renderBoard() {
  const gridEl = $("#boardGrid");
  if (!gridEl) return;

  const sp = currentScreenpack();
  const layout = gridCells(sp);
  const mode = boardMode(sp);
  const toggle = $("#boardView");

  if (toggle) {
    toggle.textContent = mode === "screen" ? "▦ Simple grid" : "▣ Screenpack screen";
    toggle.hidden = !sp?.spr;
  }

  const zoom = $("#boardZoom");

  if (zoom) {
    zoom.hidden = mode !== "screen";
    zoom.textContent = state.screenZoom ? "⤢ Full screen" : "🔍 Zoom on grid";
  }

  $("#board").classList.toggle("screen-mode", mode === "screen");

  if (mode === "screen") {
    gridEl.innerHTML = "";
    const ok = await renderScreenBoard(sp, layout);
    if (ok) return updateSlotInfo();

    // The motif could not be read: fall back to the simple grid.
    state.boardView = "grid";
    $("#board")?.classList.remove("screen-mode");
    if (toggle) toggle.textContent = "▣ Screenpack screen";
  }

  stopSelectScreen();
  const [cw, ch] = sp?.cell_size || [25, 25];

  gridEl.style.setProperty("--cols", layout.columns);
  gridEl.style.setProperty("--rows", layout.rows);
  gridEl.style.setProperty("--ratio", cw / ch);
  gridEl.innerHTML = layout.cells.map(cellHtml).join("");

  sizeBoard();
  hydratePortraits(gridEl);
  renderBoardBackground();

  // Screenpack sprites: empty cell box and random icon.
  if (sp?.spr && sp.cell_bg_spr) {
    const url = await spriteUrl(sp.spr, ...sp.cell_bg_spr);
    if (url) gridEl.style.setProperty("--cell-bg", `url("${url}")`);
  }

  const randomUrl = sp?.spr && sp.cell_random_spr ? await spriteUrl(sp.spr, ...sp.cell_random_spr) : null;

  gridEl.querySelectorAll("img[data-random]").forEach(img => {
    if (randomUrl) {
      img.src = randomUrl;
      img.nextElementSibling?.remove();
    } else {
      img.remove();
    }
  });

  updateSlotInfo();
}

// Largest cell size that fits the board (keeps the screenpack cell ratio).
function sizeBoard() {
  const board = $("#board");
  const gridEl = $("#boardGrid");
  if (!board || !gridEl) return;

  const cols = Number(gridEl.style.getPropertyValue("--cols")) || 6;
  const rows = Number(gridEl.style.getPropertyValue("--rows")) || 5;
  const ratio = Number(gridEl.style.getPropertyValue("--ratio")) || 1;
  const gap = 6;
  const padding = 48;

  const byWidth = (board.clientWidth - padding - gap * (cols - 1)) / cols;
  const byHeight = ((board.clientHeight - padding - gap * (rows - 1)) / rows) * ratio;
  const width = Math.max(18, Math.min(byWidth, byHeight, 110));

  gridEl.style.setProperty("--cell-w", `${Math.floor(width)}px`);
  gridEl.style.setProperty("--cell-h", `${Math.floor(width / ratio)}px`);
}

window.addEventListener("resize", () => {
  sizeBoard();
  selectScreen?.fit();
});

// Background: the screenpack images (carousel) behind the grid.
async function renderBoardBackground() {
  const sp = currentScreenpack();
  const bg = $("#boardBg");
  const nav = $("#boardNav");
  if (!bg || !nav) return;

  const pack = packOf(sp);
  const images = pack?.previews || [];
  const index = carouselIndex(pack);

  nav.innerHTML = images.length > 1
    ? `<button class="btn tiny" data-bg="-1" title="Previous image">‹</button><span>${index + 1}/${images.length}</span><button class="btn tiny" data-bg="1" title="Next image">›</button>`
    : "";

  nav.querySelectorAll("[data-bg]").forEach(button => {
    button.onclick = () => {
      state.carousel[pack.key] = (index + Number(button.dataset.bg) + images.length) % images.length;
      renderBoardBackground();
    };
  });

  const url = images.length ? await imageUrl(images[index]) : null;
  bg.style.backgroundImage = url ? `url("${url}")` : "";
  bg.classList.toggle("has-image", !!url);
}

// ============================================================
// Screenpack select screen (real background + cell positions)
// ============================================================

let selectScreen = null;
let screenToken = 0;
const motifCache = new Map();

function decodeText(buffer) {
  const bytes = new Uint8Array(buffer);

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("latin1").decode(bytes);
  }
}

// Parsed motif (layout + background), cached per screenpack.
function motifData(sp) {
  if (!motifCache.has(sp.id)) {
    motifCache.set(sp.id, call("read_file", { id: sp.id })
      .then(buffer => {
        const text = decodeText(buffer);
        return { layout: readSelectLayout(text), background: readBackground(text) };
      })
      .catch(() => null));
  }

  return motifCache.get(sp.id);
}

function stopSelectScreen() {
  screenToken++;
  selectScreen?.stop();
  selectScreen = null;
}

// "screen" = real screenpack screen, "grid" = simple grid.
function boardMode(sp) {
  if (!sp?.spr) return "grid";
  if (state.boardView) return state.boardView;

  // Very wide grids (hundreds of slots) scroll in the engine; the simple
  // grid is easier to edit there.
  return gridCells(sp).slots > 150 ? "grid" : "screen";
}

function motifDir(id) {
  const i = id.lastIndexOf("/");
  return i >= 0 ? id.slice(0, i + 1) : "";
}

// Portrait scale compensation (start.lua): portraitscale * motif width /
// character localcoord width.
function portraitResFix(character, layout) {
  const info = new Map((character?.info || []).map(([k, v]) => [String(k).toLowerCase(), v]));
  const portraitScale = parseFloat(info.get("portraitscale")) || 1;
  const charWidth = parseFloat(String(character?.localcoord || "").split(/[x,]/)[0]) || 320;
  return (portraitScale * layout.localcoord[0]) / charWidth;
}

// Places a sprite (with its axis) inside a cell box.
function placeSprite(img, info, x, y, scale, facing, box) {
  const w = info.width * scale[0];
  const h = info.height * scale[1];
  const left = facing < 0 ? x - (info.width - info.axisX) * scale[0] : x - info.axisX * scale[0];

  img.src = info.url;
  img.style.cssText = `left:${left - box.left}px;top:${y - info.axisY * scale[1] - box.top}px;width:${w}px;height:${h}px;${facing < 0 ? "transform:scaleX(-1);" : ""}`;
}

async function renderScreenBoard(sp, grid) {
  const host = $("#boardScreen");
  if (!host) return false;

  const token = ++screenToken;
  const motif = await motifData(sp);

  if (!motif || token !== screenToken) return !!motif;

  const { layout, background } = motif;
  const bgSpr = background.spr ? motifDir(sp.id) + background.spr : sp.spr;

  if (!selectScreen || selectScreen.key !== sp.id || !selectScreen.stage.isConnected) {
    selectScreen?.stop();
    selectScreen = new SelectScreen(host, { layout, background, sprite: (g, i) => spriteInfo(bgSpr, g, i) });
    selectScreen.key = sp.id;
    selectScreen.load().then(() => {
      if (token === screenToken && selectScreen?.key === sp.id) selectScreen.start();
    });
  }

  selectScreen.fit();

  const cellBg = layout.bg.spr ? await spriteInfo(sp.spr, ...layout.bg.spr) : null;
  const randomIcon = layout.random.spr ? await spriteInfo(sp.spr, ...layout.random.spr) : null;

  if (token !== screenToken) return true;

  const boxes = new Map();

  // Cell box (sprite rect relative to the cell position).
  const boxOf = g => {
    const bgScale = g.scale || layout.bg.scale;

    return cellBg
      ? { left: -cellBg.axisX * bgScale[0], top: -cellBg.axisY * bgScale[1], width: cellBg.width * bgScale[0], height: cellBg.height * bgScale[1] }
      : {
          left: 0,
          top: 0,
          width: layout.cellSize[0] * (g.scale ? g.scale[0] / (layout.bg.scale[0] || 1) : 1),
          height: layout.cellSize[1] * (g.scale ? g.scale[1] / (layout.bg.scale[1] || 1) : 1)
        };
  };

  // Tilted grids (cell.*-R.xangle + negative spacing, like IKEMEN1) put
  // the rows closer than the box height: the engine's 3D projection
  // foreshortens each box to fit its row. Here each box is squashed to the
  // distance to the next row (the last row keeps the previous ratio).
  const squashOf = (col, row) => {
    if (row + 1 < grid.rows) {
      const g = cellGeometry(layout, col, row);
      const next = cellGeometry(layout, col, row + 1);
      const box = boxOf(g);
      const pitch = next.y + boxOf(next).top - (g.y + box.top);
      return pitch > 2 && pitch < box.height ? pitch / box.height : 1;
    }

    return row > 0 ? squashOf(col, row - 1) : 1;
  };

  const html = grid.cells
    .filter(cell => !cell.skip)
    .map(cell => {
      const g = cellGeometry(layout, cell.col, cell.row);
      const box = boxOf(g);
      const squash = squashOf(cell.col, cell.row);

      boxes.set(cell.index, { box, g, squash });

      const id = state.profile.grid[cell.index] || null;
      const c = id && id !== RANDOM ? charById(id) : null;
      const selected = selectedCell === cell.index ? "selected" : "";
      const kind = !id ? "empty" : id === RANDOM ? "random" : `filled ${c ? "" : "missing"}`;
      const drag = id ? `data-drag="cell"` : "";
      const title = !id ? "" : id === RANDOM ? "Random" : c ? c.name : `${id} (not found)`;
      const showBox = cellBg && (id || layout.showEmpty);

      return `
        <div class="ss-anchor" style="${cellStyle(g, { scaleY: squash, origin: [box.left + box.width / 2, box.top] })}">
          <div class="cell ss ${kind} ${selected}" data-cell="${cell.index}" data-drop="cell" ${drag} title="${escapeHtml(title)}"
               style="left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px">
            ${showBox ? `<img class="ss-box" src="${cellBg.url}" alt="" style="width:100%;height:100%">` : ""}
            ${id === RANDOM ? (randomIcon ? `<img class="ss-sprite" data-ss-random alt="">` : "<b>?</b>") : ""}
            ${c ? `<img class="ss-sprite" data-ss-portrait="${escapeHtml(id)}" alt="">` : id && id !== RANDOM ? "<b>!</b>" : ""}
            ${id && id !== RANDOM ? paramBadges(id) : ""}
          </div>
        </div>`;
    })
    .join("");

  selectScreen.setCells(html);

  // Zoom: the area of the grid (with a margin).
  let focus = null;

  if (state.screenZoom && boxes.size) {
    const xs = [];
    const ys = [];

    for (const { box, g, squash } of boxes.values()) {
      xs.push(g.x + box.left, g.x + box.left + box.width);
      ys.push(g.y + box.top, g.y + box.top + box.height * squash);
    }

    const margin = 40;
    focus = {
      x: Math.min(...xs) - margin,
      y: Math.min(...ys) - margin,
      w: Math.max(...xs) - Math.min(...xs) + margin * 2,
      h: Math.max(...ys) - Math.min(...ys) + margin * 2
    };
  }

  selectScreen.focus = focus;
  selectScreen.fit();

  const cellsRoot = selectScreen.cells;
  const [ox, oy] = layout.portrait.offset;

  cellsRoot.querySelectorAll("[data-ss-random]").forEach(img => {
    const { box, g } = boxes.get(Number(img.closest("[data-cell]").dataset.cell));
    placeSprite(img, randomIcon, ox, oy, g.scale || layout.random.scale, g.facing || layout.random.facing, box);
  });

  cellsRoot.querySelectorAll("[data-ss-portrait]").forEach(async img => {
    const c = charById(img.dataset.ssPortrait);
    const { box, g } = boxes.get(Number(img.closest("[data-cell]").dataset.cell));
    const info = (await spriteInfo(c?.sprite, ...layout.portrait.spr)) || (await spriteInfo(c?.sprite, 9000, 0));

    if (!info) {
      img.replaceWith(Object.assign(document.createElement("b"), { className: "ss-fallback", textContent: (c?.name || "?").slice(0, 2).toUpperCase() }));
      return;
    }

    const fix = portraitResFix(c, layout);
    const base = g.scale || layout.portrait.scale;
    placeSprite(img, info, ox, oy, [base[0] * fix, base[1] * fix], g.facing || layout.portrait.facing, box);
  });

  return true;
}

const HIDDEN_LABELS = ["Normal", "Secret", "Locked", "As random"];

function paramsOf(id) {
  return state.profile.params?.[id] || {};
}

function setParam(id, key, value) {
  const p = state.profile;
  p.params ||= {};

  const params = { ...(p.params[id] || {}) };

  if (value === null || value === undefined || value === "" || value === false || (key === "hidden" && !value)) {
    delete params[key];
  } else {
    params[key] = value;
  }

  if (Object.keys(params).length) p.params[id] = params;
  else delete p.params[id];

  changed();
}

// Small corner badges: S (secret), L (locked), ? (shown as random),
// B (bonus), order number.
function paramBadges(id) {
  const p = paramsOf(id);
  const badges = [];

  if (p.hidden) badges.push(`<i class="b-hidden" title="${HIDDEN_LABELS[p.hidden]}">${["", "S", "L", "?"][p.hidden]}</i>`);
  if (p.unlock) badges.push(`<i class="b-lock" title="Unlock: ${escapeHtml(p.unlock)}">U</i>`);
  if (p.bonus) badges.push(`<i class="b-bonus" title="Bonus">B</i>`);
  if (p.order && p.order !== 1) badges.push(`<i class="b-order" title="Arcade order ${p.order}">${p.order}</i>`);

  return badges.length ? `<span class="badges">${badges.join("")}</span>` : "";
}

function renderExtras() {
  const el = $("#extrasList");
  if (!el) return;

  const extras = state.profile.extras;

  el.innerHTML = extras.length
    ? extras
        .map(id => {
          const c = charById(id);
          return `
            <span class="extra-chip ${c ? "" : "missing"}" data-id="${escapeHtml(id)}" data-drag="extra" title="${escapeHtml(c ? c.name : `${id} (not found)`)}">
              ${c ? `<img data-portrait="${escapeHtml(id)}" alt="">` : ""}
              ${escapeHtml(c ? c.name : id.split("/").pop())}
              ${paramsOf(id).bonus ? `<i class="chip-bonus">BONUS</i>` : ""}
            </span>`;
        })
        .join("")
    : `<span class="muted">Drag here characters that should exist in the game without taking a grid cell.</span>`;

  hydratePortraits(el);
}

function gridChanged() {
  trimGrid();
  changed();
  renderBoard();
  renderExtras();
  fillCharacterList();
}

// ---------- Grid operations ----------

function removeEverywhere(id) {
  const p = state.profile;
  const index = p.grid.indexOf(id);

  if (index >= 0) p.grid[index] = null;
  p.extras = p.extras.filter(x => x !== id);
}

function putInCell(value, cell) {
  const p = state.profile;

  if (value !== RANDOM) removeEverywhere(value);
  p.grid[cell] = value;

  for (let i = 0; i < cell; i++) {
    if (p.grid[i] === undefined) p.grid[i] = null;
  }
}

function placeInFirstFree(id) {
  const cap = gridCapacity();
  const current = gridIndexOf(id);

  if (current >= 0) {
    setMessage(`${charById(id)?.name || id} is already on the grid.`);
    return;
  }

  for (let i = 0; i < cap; i++) {
    if (!state.profile.grid[i]) {
      putInCell(id, i);
      gridChanged();
      return;
    }
  }

  setMessage(`Grid full (${cap} cells). Drag to "Extras" or free a cell.`, "warn");
}

function autoFill() {
  const cap = gridCapacity();
  const used = new Set([...state.profile.grid, ...state.profile.extras]);
  const queue = visibleCharacters().filter(c => !used.has(c.id));
  let added = 0;

  for (let i = 0; i < cap && queue.length; i++) {
    if (!state.profile.grid[i]) {
      putInCell(queue.shift().id, i);
      added++;
    }
  }

  gridChanged();
  setMessage(
    queue.length ? `${added} added. Grid full: ${queue.length} left out.` : `${added} character(s) added to the grid.`,
    queue.length ? "warn" : "ok"
  );
}

function compactGrid() {
  state.profile.grid = state.profile.grid.filter(Boolean);
  gridChanged();
}

async function clearGrid() {
  const ok = await dialog({
    title: "Clear grid",
    text: "Remove all characters from the grid and extras of this profile?",
    confirm: "Clear",
    danger: true
  });

  if (!ok) return;

  state.profile.grid = [];
  state.profile.extras = [];
  gridChanged();
}

// ---------- Drag and drop (pointer based: works in WebView2 without
// enabling HTML5 drag-and-drop in Tauri) ----------

let drag = null;

function dragValue(el) {
  switch (el.dataset.drag) {
    case "library":
    case "extra":
      return el.dataset.id;
    case "cell":
      return state.profile.grid[Number(el.dataset.cell)];
    case "order":
      return el.dataset.id;
    case "random":
      return RANDOM;
  }
  return null;
}

function bindDrag(view) {
  view.onpointerdown = event => {
    if (event.button !== 0) return;

    const el = event.target.closest("[data-drag]");
    if (!el) return;

    // Stops the browser's own image drag (which would cancel the
    // pointer events) and text selection.
    event.preventDefault();

    drag = {
      el,
      kind: el.dataset.drag,
      value: dragValue(el),
      from: el.dataset.cell !== undefined ? Number(el.dataset.cell) : null,
      x: event.clientX,
      y: event.clientY,
      active: false,
      ghost: null,
      target: null
    };
  };

  view.ondragstart = event => event.preventDefault();

  view.onclick = event => {
    const row = event.target.closest(".char-row");
    const cell = event.target.closest(".cell[data-cell]");
    const chip = event.target.closest(".extra-chip");

    if (row) previewCharacter(row.dataset.id);

    if (cell) {
      selectedCell = Number(cell.dataset.cell);
      view.querySelectorAll(".cell.selected").forEach(c => c.classList.remove("selected"));
      cell.classList.add("selected");

      const id = state.profile.grid[selectedCell];
      if (id && id !== RANDOM) previewCharacter(id);
    }

    if (chip) previewCharacter(chip.dataset.id);
  };

  view.oncontextmenu = event => {
    const cell = event.target.closest(".cell[data-cell]");
    const chip = event.target.closest(".extra-chip");

    const row = event.target.closest(".char-row");

    if (cell) {
      event.preventDefault();
      cellMenu(Number(cell.dataset.cell), event.clientX, event.clientY);
    } else if (chip) {
      event.preventDefault();
      contextMenu(event.clientX, event.clientY, [
        ["Remove from extras", () => { removeEverywhere(chip.dataset.id); gridChanged(); }],
        ["Open file location", () => reveal(chip.dataset.id)]
      ]);
    } else if (row) {
      event.preventDefault();
      const id = row.dataset.id;
      contextMenu(event.clientX, event.clientY, [
        ["Place in next free cell", () => placeInFirstFree(id)],
        ["Move to extras", () => { removeEverywhere(id); state.profile.extras.push(id); gridChanged(); }],
        ["Open file location", () => reveal(id)]
      ]);
    }
  };
}

window.addEventListener("pointermove", event => {
  if (!drag) return;

  if (!drag.active) {
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6 || !drag.value) return;

    drag.active = true;
    drag.ghost = document.createElement("div");
    drag.ghost.className = "drag-ghost";

    const img = drag.el.querySelector("img");
    drag.ghost.innerHTML = img?.src ? `<img src="${img.src}" alt="">` : "";
    drag.ghost.append(drag.value === RANDOM ? "Random" : charById(drag.value)?.name || "");
    document.body.append(drag.ghost);
    document.body.classList.add("dragging");
  }

  drag.ghost.style.transform = `translate(${event.clientX + 12}px, ${event.clientY + 12}px)`;

  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-drop]") || null;

  if (target !== drag.target) {
    drag.target?.classList.remove("drop-over");
    drag.target = target;
    target?.classList.add("drop-over");
  }
});

window.addEventListener("pointerup", () => {
  if (!drag) return;

  const d = drag;
  drag = null;

  if (!d.active) return;

  d.ghost.remove();
  document.body.classList.remove("dragging");
  d.target?.classList.remove("drop-over");

  if (d.target) drop(d, d.target);
});

function drop(d, target) {
  const p = state.profile;
  const where = target.dataset.drop;

  if (where === "cell") {
    const to = Number(target.dataset.cell);

    if (d.kind === "cell") {
      // Swap two cells.
      const moving = p.grid[d.from];
      p.grid[d.from] = p.grid[to] ?? null;
      p.grid[to] = moving;
    } else {
      putInCell(d.value, to);
    }
  } else if (where === "extras") {
    if (d.value === RANDOM) return;

    removeEverywhere(d.value);
    p.extras.push(d.value);
  } else if (where === "order") {
    if (d.value === RANDOM) return;

    const key = state.orderMode === "survival" ? "ordersurvival" : "order";
    const order = Number(target.dataset.order);
    setParam(d.value, key, key === "order" && order === 1 ? null : order);
    renderOrder($("#view"));
    return;
  } else if (where === "library") {
    if (d.kind === "library") return;

    if (d.kind === "cell") p.grid[d.from] = null;
    else removeEverywhere(d.value);
  } else {
    return;
  }

  gridChanged();
}

// ---------- Context menu ----------

function closeContextMenu() {
  document.querySelector(".context-menu")?.remove();
}

function contextMenu(x, y, entries) {
  closeContextMenu();

  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  for (const [label, action] of entries) {
    const item = document.createElement("button");
    item.textContent = label;
    item.onclick = () => {
      closeContextMenu();
      action();
    };
    menu.append(item);
  }

  document.body.append(menu);

  const rect = menu.getBoundingClientRect();
  if (rect.right > innerWidth) menu.style.left = `${innerWidth - rect.width - 8}px`;
  if (rect.bottom > innerHeight) menu.style.top = `${innerHeight - rect.height - 8}px`;
}

window.addEventListener("pointerdown", event => {
  if (!event.target.closest(".context-menu")) closeContextMenu();
});

function cellMenu(index, x, y) {
  const p = state.profile;
  const id = p.grid[index];
  const entries = [];

  if (id && id !== RANDOM) {
    entries.push(["Move to extras", () => { p.grid[index] = null; p.extras.push(id); gridChanged(); }]);
  }

  if (id !== RANDOM) {
    entries.push(["Put random here", () => { p.grid[index] = RANDOM; gridChanged(); }]);
  }

  if (id) {
    entries.push(["Empty cell", () => { p.grid[index] = null; gridChanged(); }]);
  }

  if (id && id !== RANDOM) {
    entries.push(["Open file location", () => reveal(id)]);
  }

  entries.push(["Insert empty cell here", () => {
    p.grid.splice(index, 0, null);
    const overflow = fitGridToScreenpack();
    gridChanged();
    if (overflow) setMessage(`${overflow} character(s) went past the end of the grid and were moved to the extras.`, "warn");
  }]);

  contextMenu(x, y, entries);
}

window.addEventListener("keydown", event => {
  if (state.tab !== "characters" || selectedCell === null) return;
  if (event.target.closest?.("input, select, textarea")) return;
  if (document.querySelector(".overlay, .lightbox")) return;

  if (event.key === "Delete" || event.key === "Backspace") {
    if (state.profile.grid[selectedCell]) {
      state.profile.grid[selectedCell] = null;
      gridChanged();
    }
  }
});

function previewCharacter(id) {
  if (!charById(id)) return;

  state.previewCharacter = id;
  document.querySelectorAll(".char-row.active").forEach(r => r.classList.remove("active"));
  [...document.querySelectorAll(".char-row")].find(r => r.dataset.id === id)?.classList.add("active");
  renderCharacterPreview();
}

function bindFilters(view, key, refill) {
  const filter = state.filters[key];

  view.querySelectorAll("[data-filter]").forEach(el => {
    const name = el.dataset.filter;

    const update = () => {
      filter[name] = el.type === "checkbox" ? el.checked : el.value;
      refill();
    };

    // Text fields filter while typing; selects and checkboxes on change.
    if (el.type === "text") {
      el.oninput = update;
    } else {
      el.onchange = update;
    }
  });
}

// ============================================================
// Character preview (animated sprite)
// ============================================================

const sffCache = { id: null, sff: null };
let animation = null;
let previewToken = 0;

function stopAnimation() {
  if (animation) cancelAnimationFrame(animation.raf);
  animation = null;
}

async function loadCharacterData(c) {
  if (!c.sprite || !c.anim) {
    throw new Error("The .def does not list the sprite/anim files.");
  }

  if (sffCache.id !== c.sprite) {
    sffCache.sff = parseSff(await call("read_file", { id: c.sprite }));
    sffCache.id = c.sprite;
  }

  const airBytes = await call("read_file", { id: c.anim });
  const actions = parseAir(new TextDecoder("latin1").decode(airBytes));

  let palette = null;

  if (c.palette && sffCache.sff.version === 1) {
    palette = parseAct(new Uint8Array(await call("read_file", { id: c.palette })));
  }

  return { sff: sffCache.sff, actions, palette };
}

async function renderCharacterPreview() {
  const panel = $("#charPreview");
  if (!panel) return;

  stopAnimation();

  const c = state.library.characters.find(x => x.id === state.previewCharacter);

  if (!c) {
    panel.innerHTML = `<div class="empty">Click a character to see its animation.</div>`;
    return;
  }

  const token = ++previewToken;

  panel.innerHTML = `
    <div class="stage-canvas"><canvas id="spriteCanvas" width="360" height="300"></canvas><div class="loading">Loading...</div></div>
    <div class="toolbar action-bar">
      <span>Action</span>
      <button class="btn small" id="prevAction" title="Previous action">◀</button>
      <input class="input small action-input" id="actionInput" type="number" value="${c.lastAction ?? 0}">
      <button class="btn small" id="nextAction" title="Next action">▶</button>
      <span class="muted" id="actionInfo"></span>
    </div>
    <div class="name-row">
      <h2>${escapeHtml(c.name)}</h2>
      <button class="btn tiny" id="revealChar" title="Open file location in Explorer">📂 Open folder</button>
    </div>
    <div class="muted small-path">${escapeHtml(c.id)} • ${sourceLabel(c.source)}</div>
    ${paramsForm(c)}
    ${infoTable(c)}`;

  $("#revealChar").onclick = () => reveal(c.id);
  bindParamsForm(c);

  let data;

  try {
    data = await loadCharacterData(c);
  } catch (error) {
    if (token !== previewToken) return;
    $(".loading", panel).textContent = `Could not load the animation: ${error.message || error}`;
    return;
  }

  if (token !== previewToken) return;

  const numbers = [...data.actions.keys()].sort((a, b) => a - b);
  const input = $("#actionInput");

  let actionToken = 0;

  const show = async number => {
    const current = ++actionToken;

    if (!data.actions.has(number)) {
      $("#actionInfo").textContent = "action does not exist";
      return;
    }

    c.lastAction = number;
    input.value = number;
    $("#actionInfo").textContent = "";
    $(".loading", panel).textContent = "Loading...";
    $(".loading", panel).hidden = false;

    const action = await loadAction(data.sff, data.actions, number, { palette: data.palette });

    if (token !== previewToken || current !== actionToken) return;

    if (!action) {
      $(".loading", panel).textContent = "Action has no valid sprites.";
      stopAnimation();
      clearCanvas();
      return;
    }

    $(".loading", panel).hidden = true;
    $("#actionInfo").textContent = `${action.frames.length} frame(s)`;
    playAction(action);
  };

  const step = direction => {
    const current = Number(input.value);
    const next = direction > 0
      ? numbers.find(n => n > current)
      : [...numbers].reverse().find(n => n < current);

    if (next !== undefined) show(next);
  };

  $("#prevAction").onclick = () => step(-1);
  $("#nextAction").onclick = () => step(1);
  input.onchange = () => show(Number(input.value));

  const initial = data.actions.has(c.lastAction ?? 0) ? (c.lastAction ?? 0) : numbers[0];
  show(initial);
}

// select.def options of the character (hidden / locked / bonus / order).
function paramsForm(c) {
  const p = paramsOf(c.id);
  const options = (values, current) =>
    values.map(([v, label]) => `<option value="${v}" ${String(current ?? "") === String(v) ? "selected" : ""}>${label}</option>`).join("");
  const orders = [["", "1 (default)"], ...Array.from({ length: 9 }, (_, i) => [i + 2, String(i + 2)])];

  return `
    <div class="params-box">
      <div class="info-title">In select.def</div>
      <label class="wide">Visibility
        <select class="input small" data-param="hidden" title="Secret: hidden, but can be selected. Locked: hidden and cannot be selected until unlocked. As random: shown with the random icon.">
          ${options(HIDDEN_LABELS.map((label, i) => [i, label]), p.hidden || 0)}
        </select>
      </label>
      <label>Arcade order
        <select class="input small" data-param="order">${options(orders, p.order)}</select>
      </label>
      <label>Survival order
        <select class="input small" data-param="ordersurvival">${options([["", "same (1)"], ...Array.from({ length: 10 }, (_, i) => [i + 1, String(i + 1)])], p.ordersurvival)}</select>
      </label>
      <label class="check" title="Appears in Bonus Games mode (e.g. Duck Hunt). Usually kept in the Extras.">
        <input type="checkbox" data-param="bonus" ${p.bonus ? "checked" : ""}> Bonus character
      </label>
      <label class="wide">Unlock (Lua)
        <input class="input small" data-param="unlock" placeholder="e.g. stats.modes.arcade.clear >= 1" value="${escapeHtml(p.unlock || "")}" title="Condition that unlocks a Locked or Secret character. Leave empty if unused.">
      </label>
    </div>`;
}

function bindParamsForm(c) {
  document.querySelectorAll("[data-param]").forEach(el => {
    const key = el.dataset.param;

    const update = () => {
      let value = el.type === "checkbox" ? el.checked : el.value;
      if (["hidden", "order", "ordersurvival"].includes(key)) value = value === "" ? null : Number(value);
      setParam(c.id, key, value);
      renderBoard();
      renderExtras();
    };

    if (el.type === "text") el.onchange = update;
    else el.onchange = update;
  });
}

// [Info] section of the character .def, as written in the file.
function infoTable(c) {
  const rows = Array.isArray(c.info) ? c.info : [];

  if (!rows.length) {
    return `<div class="info-box muted">The .def has no [Info] section.</div>`;
  }

  return `
    <div class="info-box">
      <div class="info-title">[Info]</div>
      <dl>
        ${rows
          .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value) || "<span class='muted'>—</span>"}</dd>`)
          .join("")}
      </dl>
    </div>`;
}

function clearCanvas() {
  const canvas = $("#spriteCanvas");
  canvas?.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

function frameCanvas(image) {
  if (!image.canvas) {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d").putImageData(new ImageData(image.rgba, image.width, image.height), 0, 0);
    image.canvas = canvas;
  }

  return image.canvas;
}

function playAction(action) {
  stopAnimation();

  const canvas = $("#spriteCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const box = action.box;
  const margin = 24;

  const scale = Math.min(
    (canvas.width - margin * 2) / (box.right - box.left),
    (canvas.height - margin * 2) / (box.bottom - box.top),
    3
  );

  // Ground point (0,0) of the character inside the canvas.
  const originX = canvas.width / 2 - ((box.left + box.right) / 2) * scale;
  const originY = canvas.height - margin - box.bottom * scale;

  let frame = 0;
  let elapsed = 0;
  let last = performance.now();

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // Ground line
    ctx.fillStyle = "rgba(40, 184, 242, .35)";
    ctx.fillRect(0, Math.round(originY), canvas.width, 1);

    const f = action.frames[frame];

    if (f?.image) {
      const img = frameCanvas(f.image);
      ctx.save();
      ctx.translate(originX + f.drawX * scale, originY + f.drawY * scale);
      ctx.scale(f.flipH ? -scale : scale, f.flipV ? -scale : scale);
      ctx.drawImage(img, f.flipH ? -img.width : 0, f.flipV ? -img.height : 0);
      ctx.restore();
    }
  };

  const tick = now => {
    // 60 ticks per second, like the engine.
    elapsed = Math.min(elapsed + (now - last) * 0.06, 600);
    last = now;

    let current = action.frames[frame];
    let redraw = false;

    while (current && current.time >= 0 && elapsed >= Math.max(1, current.time)) {
      elapsed -= Math.max(1, current.time);
      frame = frame + 1 < action.frames.length ? frame + 1 : action.loopStart;
      current = action.frames[frame];
      redraw = true;
    }

    if (redraw) draw();
    animation.raf = requestAnimationFrame(tick);
  };

  draw();
  animation = { raf: requestAnimationFrame(tick) };
}

// ============================================================
// Stages
// ============================================================

function toggleId(list, id, on) {
  const index = list.indexOf(id);

  if (on && index < 0) list.push(id);
  if (!on && index >= 0) list.splice(index, 1);

  changed();
}

function sourceFilterHtml(filter) {
  return `
    <select class="input small" data-filter="source">
      <option value="all" ${filter.source === "all" ? "selected" : ""}>All sources</option>
      <option value="launcher" ${filter.source === "launcher" ? "selected" : ""}>Launcher</option>
      <option value="engine" ${filter.source === "engine" ? "selected" : ""}>Engine</option>
    </select>
    <label class="check"><input type="checkbox" data-filter="onlySelected" ${filter.onlySelected ? "checked" : ""}> Selected only</label>`;
}

function visibleStages() {
  const f = state.filters.stages;
  const selected = new Set(state.profile.stages);

  return state.library.stages.filter(s =>
    (f.source === "all" || s.source === f.source) &&
    (!f.onlySelected || selected.has(s.id)) &&
    matchesCollection(s, f) &&
    matchesText(s, f.text)
  );
}

function renderStages(view) {
  const f = state.filters.stages;

  view.innerHTML = `
    <section class="panel full">
      <div class="toolbar">
        <input class="input grow" data-filter="text" placeholder="Search stage..." value="${escapeHtml(f.text)}">
        ${collectionFilterHtml(f, state.library.stages)}
        ${sourceFilterHtml(f)}
        <button class="btn small" id="checkVisible">Select visible</button>
        <button class="btn small" id="uncheckVisible">Unselect visible</button>
        ${viewToggleHtml("stages")}
      </div>
      <div class="gallery" id="stageGallery"></div>
    </section>`;

  bindFilters(view, "stages", fillStageGallery);
  bindViewToggle(view, "stages", fillStageGallery);

  const setVisible = on => {
    for (const s of visibleStages()) {
      const index = state.profile.stages.indexOf(s.id);
      if (on && index < 0) state.profile.stages.push(s.id);
      if (!on && index >= 0) state.profile.stages.splice(index, 1);
    }

    changed();
    fillStageGallery();
  };

  $("#checkVisible").onclick = () => setVisible(true);
  $("#uncheckVisible").onclick = () => setVisible(false);

  fillStageGallery();
}

function galleryCard(item, { selected, meta, kind, dataId = item.id, placeholder = null }) {
  return `
    <div class="card ${selected ? "selected" : ""}" data-id="${escapeHtml(dataId)}">
      <div class="thumb">
        ${item.preview
          ? `<img data-src="${escapeHtml(item.preview)}" alt="">`
          : `<div class="no-image">${placeholder || (kind === "stages" ? "STAGE" : "LIFEBAR")}<small>No image</small></div>`}
        <span class="check-badge">✓</span>
        <div class="card-actions">
          ${item.preview ? `<button class="btn tiny" data-zoom title="Enlarge (or double-click)">⤢ Enlarge</button>` : ""}
          <button class="btn tiny" data-image title="Set image (1280x720)">Image...</button>
          <button class="btn tiny" data-reveal title="Open file location">📂</button>
        </div>
      </div>
      <div class="card-body">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${meta}</small>
      </div>
    </div>`;
}

function fillStageGallery() {
  const gallery = $("#stageGallery");
  const items = visibleStages();
  const selected = new Set(state.profile.stages);

  if (!state.library.stages.length) {
    gallery.innerHTML = `
      <div class="empty">
        <strong>No stages found.</strong>
        Put stages in <code>${escapeHtml(state.env?.launcher_name)}/Stages</code> or in <code>stages/</code>.
      </div>`;
    return;
  }

  gallery.classList.toggle("as-list", state.views.stages === "list");
  gallery.innerHTML = items.length
    ? groupedHtml("stages", items, s => galleryCard(s, {
        selected: selected.has(s.id),
        kind: "stages",
        meta: `${escapeHtml(s.type)} • ${sourceLabel(s.source)}${s.collection ? ` • ${escapeHtml(s.collection)}` : ""}${s.author ? ` • ${escapeHtml(s.author)}` : ""}`
      }))
    : `<div class="empty">No stage matches the filter.</div>`;

  bindGroupHeads(gallery, "stages", fillStageGallery);

  const toggleStage = stage => {
    const on = !state.profile.stages.includes(stage.id);
    toggleId(state.profile.stages, stage.id, on);
    syncCard(gallery, stage.id, on);
  };

  const zoom = stage => openLightbox({
    items: items.filter(s => s.preview),
    current: stage,
    meta: s => `${s.type} • ${sourceLabel(s.source)}${s.author ? ` • ${s.author}` : ""}`,
    isSelected: s => state.profile.stages.includes(s.id),
    toggle: toggleStage
  });

  gallery.querySelectorAll(".card").forEach(card => {
    const stage = state.library.stages.find(s => s.id === card.dataset.id);

    bindCardButtons(card, "stages", stage, zoom);
    card.onclick = () => toggleStage(stage);
  });

  hydrateImages(gallery);
}

function syncCard(gallery, id, on) {
  const card = [...gallery.querySelectorAll(".card")].find(c => c.dataset.id === id);
  card?.classList.toggle("selected", on);
}

function bindCardButtons(card, kind, item, zoom) {
  $("[data-image]", card).onclick = event => {
    event.stopPropagation();
    pickPreviewImage(kind, item);
  };

  const revealButton = $("[data-reveal]", card);

  if (revealButton) {
    revealButton.onclick = event => {
      event.stopPropagation();
      reveal(item.id);
    };
  }

  const zoomButton = $("[data-zoom]", card);

  if (zoomButton) {
    zoomButton.onclick = event => {
      event.stopPropagation();
      zoom(item);
    };

    $(".thumb", card).ondblclick = event => {
      event.stopPropagation();
      zoom(item);
    };
  }
}

// ============================================================
// Lightbox
// ============================================================

function openLightbox({ items, current, meta, isSelected, toggle, selectLabel = ["Select", "Selected ✓"], extra = null, onShow = null, onClose = null }) {
  if (!items.length) return;

  let index = Math.max(0, items.indexOf(current));

  const box = document.createElement("div");
  box.className = "lightbox";
  box.innerHTML = `
    <button class="lb-close" title="Close (Esc)">✕</button>
    <button class="lb-nav prev" title="Previous (←)">‹</button>
    <figure>
      <img alt="">
      <figcaption>
        <div><strong></strong><small></small></div>
        <span class="lb-count"></span>
        ${extra ? `<button class="btn ghost-danger lb-extra">${escapeHtml(extra.label)}</button>` : ""}
        <button class="btn lb-select"></button>
      </figcaption>
    </figure>
    <button class="lb-nav next" title="Next (→)">›</button>`;

  const img = $("img", box);
  const select = $(".lb-select", box);

  const show = async () => {
    const item = items[index];

    $("strong", box).textContent = item.name;
    $("small", box).textContent = meta(item);
    $(".lb-count", box).textContent = items.length > 1 ? `${index + 1} / ${items.length}` : "";
    box.classList.toggle("single", items.length < 2);

    onShow?.(item);

    const on = isSelected(item);
    select.textContent = on ? selectLabel[1] : selectLabel[0];
    select.classList.toggle("primary", on);

    img.classList.remove("ready");
    const url = await imageUrl(item.preview);

    if (items[index] === item && url) {
      img.src = url;
      img.onload = () => img.classList.add("ready");
    }
  };

  const move = step => {
    index = (index + step + items.length) % items.length;
    show();
  };

  const close = () => {
    document.removeEventListener("keydown", onKey, true);
    box.classList.add("closing");
    setTimeout(() => box.remove(), 150);
    onClose?.();
  };

  if (extra) {
    $(".lb-extra", box).onclick = async () => {
      const item = items[index];

      if (await extra.run(item)) {
        items.splice(index, 1);

        if (!items.length) return close();

        index = Math.min(index, items.length - 1);
        show();
      }
    };
  }

  const onKey = event => {
    if (document.querySelector(".overlay")) return; // a dialog is open

    if (event.key === "Escape") close();
    else if (event.key === "ArrowLeft") move(-1);
    else if (event.key === "ArrowRight") move(1);
    else if (event.key === " " || event.key === "Enter") {
      toggle(items[index]);
      show();
    } else return;

    event.preventDefault();
    event.stopPropagation();
  };

  box.onclick = event => {
    if (event.target === box || event.target.tagName === "FIGURE") close();
  };

  $(".lb-close", box).onclick = close;
  $(".prev", box).onclick = () => move(-1);
  $(".next", box).onclick = () => move(1);
  select.onclick = () => {
    toggle(items[index]);
    show();
  };

  document.addEventListener("keydown", onKey, true);
  document.body.append(box);
  show();
}

// ============================================================
// Screenpacks
// ============================================================

// Carousel: every screenpack package can have several 1280x720 images.
let carouselTimer = null;

function carouselIndex(pack) {
  const count = pack?.previews?.length || 0;
  if (!count) return 0;
  return Math.min(state.carousel[pack.key] || 0, count - 1);
}

function stopCarousel() {
  clearInterval(carouselTimer);
  carouselTimer = null;
}

function packThumb(pack) {
  const images = pack.previews || [];
  const index = carouselIndex(pack);

  if (!images.length) {
    return `<div class="no-image">SCREENPACK<small>No image</small></div>`;
  }

  return `
    <img data-src="${escapeHtml(images[index])}" alt="">
    ${images.length > 1 ? `
      <button class="car-nav prev" data-car="-1" title="Previous image">‹</button>
      <button class="car-nav next" data-car="1" title="Next image">›</button>
      <div class="car-dots">${images.map((_, i) => `<span class="${i === index ? "on" : ""}"></span>`).join("")}</div>` : ""}`;
}

function variantLabel(sp) {
  const name = sp.variant.toLowerCase() === "system" ? "Default (system.def)" : sp.variant;
  return `${name} — ${sp.rows}×${sp.columns}, ${sp.slots} slots`;
}

function packCard(pack, current, engineMotif) {
  const active = pack.variants.find(v => v.id === current) || null;
  const shown = active || pack.variants[0];
  const count = pack.previews.length;

  const meta = [
    pack.variants.length > 1 ? `${pack.variants.length} variants` : `${shown.rows}×${shown.columns} • ${shown.slots} slots`,
    shown.localcoord,
    pack.variants.some(v => v.id === engineMotif) ? "IKEMEN default" : sourceLabel(shown.source),
    shown.author
  ].filter(Boolean).map(escapeHtml).join(" • ");

  return `
    <div class="card pack ${active ? "selected" : ""}" data-pack="${escapeHtml(pack.key)}">
      <div class="thumb">
        <div class="car-frame">${packThumb(pack)}</div>
        <span class="check-badge">✓</span>
        <div class="card-actions">
          ${count ? `<button class="btn tiny" data-zoom title="View images (or double-click)">⤢ Enlarge${count > 1 ? ` (${count})` : ""}</button>` : ""}
          <button class="btn tiny" data-add title="Add 1280x720 images (you can pick several)">+ Image</button>
          <button class="btn tiny" data-reveal title="Open file location">📂</button>
        </div>
      </div>
      <div class="card-body">
        <strong>${escapeHtml(pack.name)}</strong>
        <small>${meta}</small>
        ${pack.variants.length > 1 ? `
          <select class="input small variant" data-variant title="Screenpack variant (.def file)">
            ${pack.variants.map(v => `<option value="${escapeHtml(v.id)}" ${v === shown ? "selected" : ""}>${escapeHtml(variantLabel(v))}</option>`).join("")}
          </select>` : ""}
      </div>
    </div>`;
}

function refreshPackThumb(card, pack) {
  $(".car-frame", card).innerHTML = packThumb(pack);
  hydrateImages(card);

  const zoom = $("[data-zoom]", card);
  if (zoom) zoom.textContent = `⤢ Enlarge${pack.previews.length > 1 ? ` (${pack.previews.length})` : ""}`;
}

function addScreenpackImages(pack, onDone) {
  const input = Object.assign(document.createElement("input"), {
    type: "file",
    multiple: true,
    accept: "image/png,image/jpeg,image/webp,image/bmp"
  });

  input.onchange = async () => {
    const files = [...(input.files || [])];
    if (!files.length) return;

    try {
      for (let i = 0; i < files.length; i++) {
        setMessage(`Saving image ${i + 1} of ${files.length}...`);
        const dataUrl = await imageFileTo720(files[i]);
        const id = await call("add_preview", { kind: "screenpacks", id: pack.key, dataUrl, ext: "jpg" });
        pack.previews.push(id);
      }

      state.carousel[pack.key] = pack.previews.length - 1;
      setMessage(`${files.length} image(s) added to ${pack.name}.`, "ok");
    } catch (error) {
      setMessage(`Could not save the image: ${error}`, "error");
    }

    onDone();
  };

  input.click();
}

function renderScreenpacks(view) {
  const packs = screenpackPackages();
  const currentId = currentScreenpackId();
  const engineMotif = state.env?.motif;

  view.innerHTML = `
    <section class="panel full">
      <div class="toolbar">
        <span class="muted">The screenpack defines the look of the game and the character grid. Screenpacks with several versions (e.g. 120 / 204 slots) are grouped, with a variant selector. <code>config.ini</code> is not changed.</span>
      </div>
      <div class="gallery" id="packGallery">
        ${packs.map(pack => packCard(pack, currentId, engineMotif)).join("")}
      </div>
      ${packs.length ? "" : `
        <div class="empty">
          <strong>No screenpacks found.</strong>
          Put screenpacks in <code>${escapeHtml(state.env?.launcher_name)}/Screenpacks</code> (one folder per screenpack, with its system.def) or in <code>data/</code>.
        </div>`}
    </section>`;

  const gallery = $("#packGallery");

  const choose = sp => {
    gallery.querySelectorAll(".card.selected").forEach(c => c.classList.remove("selected"));
    [...gallery.querySelectorAll(".card")].find(c => c.dataset.pack === packOf(sp).key)?.classList.add("selected");

    // Following config.ini is stored as "no override".
    state.profile.motif = sp.id === engineMotif ? null : sp.id;
    const moved = fitGridToScreenpack();
    changed();

    const label = packOf(sp).variants.length > 1 ? `${packOf(sp).name} — ${sp.variant}` : packOf(sp).name;

    setMessage(
      moved
        ? `${label}: ${sp.slots} cells. ${moved} character(s) did not fit and were moved to the extras.`
        : `Screenpack: ${label} (${sp.slots} cells).`,
      moved ? "warn" : "ok"
    );
  };

  const selectedVariant = (card, pack) => {
    const select = $("[data-variant]", card);
    return pack.variants.find(v => v.id === select?.value) || pack.variants.find(v => v.id === currentScreenpackId()) || pack.variants[0];
  };

  const zoom = (pack, card) => {
    const items = pack.previews.map((image, n) => ({ id: `${pack.key}#${n}`, name: pack.name, preview: image, n }));

    openLightbox({
      items,
      current: items[carouselIndex(pack)],
      meta: item => `Image ${item.n + 1} of ${pack.previews.length}`,
      isSelected: () => pack.variants.some(v => v.id === currentScreenpackId()),
      toggle: () => choose(selectedVariant(card, pack)),
      selectLabel: ["Use this screenpack", "Screenpack selected ✓"],
      onShow: item => {
        state.carousel[pack.key] = pack.previews.indexOf(item.preview);
      },
      extra: {
        label: "Remove image",
        run: async item => {
          const ok = await dialog({ title: "Remove image", text: "Remove this image from the screenpack?", confirm: "Remove", danger: true });
          if (!ok) return false;

          try {
            await call("delete_preview", { image: item.preview });
          } catch (error) {
            setMessage(String(error), "error");
            return false;
          }

          pack.previews.splice(pack.previews.indexOf(item.preview), 1);
          state.carousel[pack.key] = 0;
          return true;
        }
      },
      onClose: () => renderScreenpacks(view)
    });
  };

  gallery.querySelectorAll(".card").forEach(card => {
    const pack = packs.find(p => p.key === card.dataset.pack);
    const variantSelect = $("[data-variant]", card);

    if (variantSelect) {
      variantSelect.onclick = event => event.stopPropagation();
      variantSelect.onchange = () => choose(selectedVariant(card, pack));
    }

    card.onclick = event => {
      const nav = event.target.closest("[data-car]");

      if (nav) {
        event.stopPropagation();
        state.carousel[pack.key] = (carouselIndex(pack) + Number(nav.dataset.car) + pack.previews.length) % pack.previews.length;
        refreshPackThumb(card, pack);
        return;
      }

      if (event.target.closest("[data-zoom]")) return zoom(pack, card);
      if (event.target.closest("[data-add]")) return addScreenpackImages(pack, () => renderScreenpacks(view));
      if (event.target.closest("[data-reveal]")) return reveal(selectedVariant(card, pack).id);
      if (event.target.closest("[data-variant]")) return;

      choose(selectedVariant(card, pack));
    };

    $(".thumb", card).ondblclick = event => {
      if (!pack.previews.length || event.target.closest("button")) return;
      event.stopPropagation();
      zoom(pack, card);
    };
  });

  hydrateImages(gallery);

  // Auto-advance the carousels (paused while the mouse is over a card).
  stopCarousel();
  carouselTimer = setInterval(() => {
    if (!document.body.contains(gallery)) return stopCarousel();

    gallery.querySelectorAll(".card").forEach(card => {
      const pack = packs.find(p => p.key === card.dataset.pack);
      if (!pack || pack.previews.length < 2 || card.matches(":hover")) return;

      state.carousel[pack.key] = (carouselIndex(pack) + 1) % pack.previews.length;
      refreshPackThumb(card, pack);
    });
  }, 4500);
}

// ============================================================
// Order (arcade / survival) and max matches
// ============================================================

const MAXMATCHES_DEFAULTS = {
  arcade: [6, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  team: [4, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  timeattack: [6, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  survival: [-1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

const MAXMATCHES_LABELS = {
  arcade: "Arcade (single)",
  team: "Arcade (team)",
  timeattack: "Time Attack",
  survival: "Survival (-1 = unlimited)"
};

function screenpackMaxmatches(mode) {
  const raw = currentScreenpack()?.maxmatches?.[mode];
  const values = raw ? raw.split(",").map(v => parseInt(v, 10)).filter(v => !Number.isNaN(v)) : null;
  const base = values?.length ? values : MAXMATCHES_DEFAULTS[mode];
  return Array.from({ length: 10 }, (_, i) => base[i] ?? 0);
}

function effectiveMaxmatches(mode) {
  return state.profile.maxmatches?.[mode] || screenpackMaxmatches(mode);
}

function renderOrder(view) {
  const mode = state.orderMode || "arcade";
  const key = mode === "survival" ? "ordersurvival" : "order";
  const ids = [...state.profile.grid, ...state.profile.extras].filter(id => id && id !== RANDOM && charById(id));
  const lanes = Array.from({ length: 10 }, () => []);

  const bonus = state.profile.bonusStage;
  const bonusIds = new Set(bonus.enabled && mode === "arcade" ? bonus.chars : []);

  for (const id of [...new Set(ids)]) {
    if (bonusIds.has(id)) continue;
    const order = Math.min(10, Math.max(1, paramsOf(id)[key] || 1));
    lanes[order - 1].push(id);
  }

  const matches = effectiveMaxmatches(mode === "survival" ? "survival" : "arcade");

  view.innerHTML = `
    <div class="order-view">
      <section class="panel order-panel">
        <div class="toolbar">
          <div class="segmented">
            <button data-mode="arcade" class="${mode === "arcade" ? "on" : ""}">Arcade</button>
            <button data-mode="survival" class="${mode === "survival" ? "on" : ""}">Survival</button>
          </div>
          <span class="muted">Drag characters between orders. For each fight IKEMEN picks random opponents from the order set in "matches per order".</span>
        </div>
        <div class="lanes">
          ${lanes.map((list, i) => `
            <div class="lane" data-drop="order" data-order="${i + 1}">
              <div class="lane-head">
                <strong>Order ${i + 1}</strong>
                <span class="muted">${list.length} • ${matches[i] === -1 ? "unlimited" : `${matches[i]} match(es)`}</span>
              </div>
              <div class="lane-body">
                ${list.map(id => `
                  <span class="order-chip" data-drag="order" data-id="${escapeHtml(id)}" title="${escapeHtml(charById(id).name)}">
                    <img data-portrait="${escapeHtml(id)}" alt="">${escapeHtml(charById(id).name)}
                  </span>`).join("") || `<span class="muted small">—</span>`}
              </div>
            </div>`).join("")}
        </div>
      </section>

      ${mode === "arcade" ? bonusPanelHtml(lanes) : ""}

      <section class="panel matches-panel">
        <div class="toolbar">
          <strong>Matches per order (maxmatches)</strong>
          <button class="btn small right" id="resetMatches" title="Go back to the values of the screenpack select.def">Use screenpack values</button>
        </div>
        <div class="matches">
          <div class="matches-row head"><span></span>${Array.from({ length: 10 }, (_, i) => `<b>${i + 1}</b>`).join("")}</div>
          ${Object.keys(MAXMATCHES_DEFAULTS).map(m => `
            <div class="matches-row">
              <span>${MAXMATCHES_LABELS[m]}</span>
              ${effectiveMaxmatches(m).map((v, i) => `<input class="input small" type="number" min="${m === "survival" ? -1 : 0}" max="99" data-mm="${m}" data-i="${i}" value="${v}">`).join("")}
            </div>`).join("")}
        </div>
        <div class="hint">${state.profile.maxmatches ? "Custom values for this profile." : "Values from the screenpack select.def (not changed in this profile yet)."}</div>
      </section>
    </div>`;

  view.querySelectorAll("[data-mode]").forEach(button => {
    button.onclick = () => {
      state.orderMode = button.dataset.mode;
      renderOrder(view);
    };
  });

  view.querySelectorAll("[data-mm]").forEach(input => {
    input.onchange = () => {
      const m = input.dataset.mm;
      state.profile.maxmatches ||= {};
      const values = [...effectiveMaxmatches(m)];
      values[Number(input.dataset.i)] = parseInt(input.value, 10) || 0;
      state.profile.maxmatches[m] = values;
      changed();
      renderOrder(view);
    };
  });

  if (mode === "arcade") bindBonusPanel(view);

  $("#resetMatches").onclick = () => {
    state.profile.maxmatches = null;
    changed();
    renderOrder(view);
  };

  bindDrag(view);
  hydratePortraits(view);
}

// ============================================================
// Bonus stage in the arcade journey
// ------------------------------------------------------------
// IKEMEN builds the arcade route from [Options] arcade.maxmatches: N
// fights against order 1, then order 2... The bonus stage is a new order
// inserted after order "after" with 1 fight against a bonus character.
// At launch the orders after it shift by one (withBonusStage).
// ============================================================

// Journey: [{ order, count, from, to }] for orders with fights and chars.
function arcadeJourney(lanes) {
  const matches = effectiveMaxmatches("arcade");
  const steps = [];
  let fight = 0;

  for (let i = 0; i < 10; i++) {
    if (!matches[i] || !lanes[i].length) continue;

    const count = matches[i] === -1 ? lanes[i].length : matches[i];
    steps.push({ order: i + 1, count, from: fight + 1, to: fight + count, infinite: matches[i] === -1 });
    fight += count;

    if (matches[i] === -1) break;
  }

  return steps;
}

function fightsLabel(step) {
  return step.from === step.to ? `Match ${step.from}` : `Matches ${step.from}–${step.to}`;
}

function bonusPanelHtml(lanes) {
  const bonus = state.profile.bonusStage;
  const steps = arcadeJourney(lanes);
  const chosen = bonus.chars.filter(id => charById(id));
  const candidates = state.library.characters
    .filter(c => !bonus.chars.includes(c.id))
    .sort((a, b) => Number(isBonusLike(b)) - Number(isBonusLike(a)) || a.name.localeCompare(b.name));

  // Route preview with the bonus stage in place.
  const route = [];

  for (const step of steps) {
    route.push(`<span class="route-step">${fightsLabel(step)} <small>order ${step.order}</small></span>`);
    if (bonus.enabled && chosen.length && step.order === bonus.after) route.push(`<span class="route-step bonus">★ Bonus</span>`);
  }

  const positions = steps.filter(step => !step.infinite);

  return `
    <section class="panel bonus-panel ${bonus.enabled ? "on" : ""}">
      <div class="toolbar wrap">
        <label class="check"><input type="checkbox" id="bonusEnabled" ${bonus.enabled ? "checked" : ""}> <strong>Bonus stage in the arcade route</strong></label>
        <label class="muted">After
          <select class="input small" id="bonusAfter" ${bonus.enabled ? "" : "disabled"}>
            ${positions.length
              ? positions.map(step => `<option value="${step.order}" ${step.order === bonus.after ? "selected" : ""}>${fightsLabel(step).toLowerCase()} (end of order ${step.order})</option>`).join("")
              : `<option value="${bonus.after}">order ${bonus.after}</option>`}
          </select>
        </label>
        <select class="input small" id="bonusAdd" ${bonus.enabled ? "" : "disabled"}>
          <option value="">+ Bonus character...</option>
          ${candidates.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}${isBonusLike(c) ? " ★" : ""}</option>`).join("")}
        </select>
      </div>
      <div class="bonus-body">
        <div class="bonus-chars">
          ${chosen.map(id => `
            <span class="order-chip bonus-chip" title="${escapeHtml(id)}">
              <img data-portrait="${escapeHtml(id)}" alt="">${escapeHtml(charById(id).name)}
              <button class="chip-x" data-bonus-remove="${escapeHtml(id)}" title="Remove">×</button>
            </span>`).join("") || `<span class="muted small">No bonus character selected (if there is more than one, IKEMEN picks one at random).</span>`}
        </div>
        <div class="route">${route.join(`<span class="route-arrow">→</span>`) || `<span class="muted small">Put characters on the grid to see the route.</span>`}</div>
      </div>
      <div class="hint">The bonus character is fought once at the chosen point, stays off the grid (extra) and also appears in Bonus Games mode. The following orders are shifted automatically when you play.</div>
    </section>`;
}

// Bonus characters usually live in a "Bonus" folder or are named so.
function isBonusLike(c) {
  return /bonus|bônus/i.test(`${c.id} ${c.name}`) || !!paramsOf(c.id).bonus;
}

function bindBonusPanel(view) {
  const bonus = state.profile.bonusStage;

  $("#bonusEnabled").onchange = event => {
    bonus.enabled = event.target.checked;
    changed();
    renderOrder(view);
  };

  $("#bonusAfter").onchange = event => {
    bonus.after = Number(event.target.value) || 1;
    changed();
    renderOrder(view);
  };

  $("#bonusAdd").onchange = event => {
    const id = event.target.value;
    if (!id) return;
    bonus.chars.push(id);
    changed();
    renderOrder(view);
  };

  view.querySelectorAll("[data-bonus-remove]").forEach(button => {
    button.onclick = () => {
      bonus.chars = bonus.chars.filter(id => id !== button.dataset.bonusRemove);
      changed();
      renderOrder(view);
    };
  });
}

// Copy of the profile with the bonus stage applied (sent to the engine).
function withBonusStage(profile) {
  const bonus = profile.bonusStage;
  const chars = (bonus?.chars || []).filter(id => charById(id));

  if (!bonus?.enabled || !chars.length) return profile;

  const p = JSON.parse(JSON.stringify(profile));
  const after = bonus.after;
  const inGame = new Set([...p.grid, ...p.extras].filter(id => id && id !== RANDOM));

  p.params ||= {};

  // Orders after the bonus move one step down.
  for (const id of inGame) {
    if (chars.includes(id)) continue;

    const order = p.params[id]?.order || 1;

    if (order > after) {
      if (order + 1 > 10) throw new Error("Bonus stage: no room left — use at most 9 arcade orders.");
      p.params[id] = { ...p.params[id], order: order + 1 };
    }
  }

  // Bonus characters: own order, bonus flag, never in Survival.
  for (const id of chars) {
    p.params[id] = { ...(p.params[id] || {}), order: after + 1, bonus: true, ordersurvival: p.params[id]?.ordersurvival || 10 };
    if (!inGame.has(id)) p.extras.push(id);
  }

  // One fight in the new order (arcade and team); Time Attack skips it.
  p.maxmatches = {};

  for (const mode of Object.keys(MAXMATCHES_DEFAULTS)) {
    const values = [...effectiveMaxmatches(mode)];

    if (mode !== "survival") {
      values.splice(after, 0, mode === "timeattack" ? 0 : 1);
      if (values.slice(10).some(v => v !== 0)) throw new Error("Bonus stage: no room left — use at most 9 arcade orders.");
    }

    p.maxmatches[mode] = values.slice(0, 10);
  }

  return p;
}

// ============================================================
// Lifebars
// ============================================================

function renderLifebars(view) {
  const current = state.profile.lifebar;

  // "Default" = lifebar of the current screenpack. It has an id (its
  // fight.def) so it can also get a preview image.
  const sp = currentScreenpack();

  if (sp && sp.lifebar && !sp.lifebarItem) {
    sp.lifebarItem = { id: sp.lifebar, preview: sp.lifebar_preview, name: "Default", isDefault: true };
  }

  const defaultItem = sp
    ? sp.lifebarItem || null
    : state.library.default_lifebar
      ? Object.assign(state.library.default_lifebar, { name: "Default", isDefault: true })
      : null;

  view.innerHTML = `
    <section class="panel full">
      <div class="toolbar">
        <span class="muted">Choose a lifebar for this profile. "Default" uses the screenpack lifebar.</span>
        ${sp && !sp.lifebar ? `<span class="warn-text">⚠ This screenpack has no lifebar of its own: with "Default", the game uses the IKEMEN default lifebar.</span>` : ""}
      </div>
      <div class="gallery" id="lifebarGallery">
        ${defaultItem
          ? galleryCard(defaultItem, {
              selected: !current,
              kind: "lifebars",
              dataId: "",
              placeholder: "DEFAULT",
              meta: `Screenpack lifebar${sp ? ` ${escapeHtml(sp.name)}` : ""} • ${escapeHtml(defaultItem.id)}`
            })
          : `
            <div class="card ${current ? "" : "selected"}" data-id="">
              <div class="thumb"><div class="no-image">DEFAULT<small>Screenpack lifebar</small></div><span class="check-badge">✓</span></div>
              <div class="card-body"><strong>Default</strong><small>No change</small></div>
            </div>`}
        ${state.library.lifebars
          .map(l => galleryCard(l, {
            selected: l.id === current,
            kind: "lifebars",
            meta: [l.resolution, l.author].filter(Boolean).map(escapeHtml).join(" • ") || "Lifebar"
          }))
          .join("")}
      </div>
      ${state.library.lifebars.length ? "" : `
        <div class="empty">Put lifebars in <code>${escapeHtml(state.env?.launcher_name)}/Lifebars</code> (one folder per lifebar, with its fight.def).</div>`}
    </section>`;

  const gallery = $("#lifebarGallery");

  const choose = lifebar => {
    const id = lifebar && !lifebar.isDefault ? lifebar.id : null;

    gallery.querySelector(".card.selected")?.classList.remove("selected");
    syncCard(gallery, id ?? "", true);
    state.profile.lifebar = id;
    changed();
  };

  const isChosen = l => (l.isDefault ? !state.profile.lifebar : state.profile.lifebar === l.id);

  const zoom = lifebar => openLightbox({
    items: [defaultItem, ...state.library.lifebars].filter(l => l?.preview),
    current: lifebar,
    meta: l => (l.isDefault ? "Screenpack lifebar" : [l.resolution, l.author].filter(Boolean).join(" • ") || "Lifebar"),
    isSelected: isChosen,
    toggle: l => choose(isChosen(l) ? null : l),
    selectLabel: ["Use this lifebar", "Lifebar selected ✓"]
  });

  gallery.querySelectorAll(".card").forEach(card => {
    const lifebar = card.dataset.id
      ? state.library.lifebars.find(l => l.id === card.dataset.id)
      : defaultItem;

    if (lifebar) bindCardButtons(card, "lifebars", lifebar, zoom);
    card.onclick = () => choose(lifebar);
  });

  hydrateImages(gallery);
}

// ============================================================
// Startup
// ============================================================

async function refreshLibrary() {
  state.library = await call("scan_library");
  state.packages = null;
}

async function init() {
  app.innerHTML = `<div class="boot">Loading library...</div>`;

  try {
    state.env = await call("get_environment");
  } catch (error) {
    state.env = { ok: false, error: String(error) };
  }

  if (!state.env.ok) {
    app.innerHTML = `
      <div class="boot error">
        <h1>IKEMEN GO not found</h1>
        <p>${escapeHtml(state.env.error)}</p>
      </div>`;
    return;
  }

  try {
    const [profiles] = await Promise.all([call("list_profiles"), refreshLibrary()]);
    state.profiles = profiles.map(normalizeProfile);
  } catch (error) {
    state.message = String(error);
  }

  if (!state.profiles.length) {
    state.profiles.push(newProfile("My profile"));
    state.savedName = null;
  } else {
    state.savedName = state.profiles[0].name;
  }

  state.profile = state.profiles[0];

  const c = state.library.characters;
  state.message ||= `${c.length} characters, ${state.library.stages.length} stages and ${state.library.lifebars.length} lifebars found.`;

  render();

  // F5 reloads the library (new characters, stages or lifebars).
  window.addEventListener("keydown", event => {
    if (event.key === "F5") {
      event.preventDefault();
      reloadLibrary();
      return;
    }

    // Browser shortcuts (reload page, print, find, view source...) would
    // break the app or show browser UI.
    if ((event.ctrlKey || event.metaKey) && ["r", "p", "f", "g", "u", "s", "j"].includes(event.key.toLowerCase())) {
      event.preventDefault();
    }
  });

  // No browser context menu (Back / Reload / Print...), except in text fields.
  window.addEventListener("contextmenu", event => {
    if (!event.target.closest?.("input, textarea")) event.preventDefault();
  });

  // Save pending changes as soon as the window loses focus.
  window.addEventListener("blur", () => saveTimer && saveNow());
}

async function reloadLibrary() {
  setMessage("Refreshing library...");

  try {
    await refreshLibrary();
    imageCache.forEach(async url => URL.revokeObjectURL(await url));
    imageCache.clear();
    sffCache.id = null;
    sffCache.sff = null;
    spriteCache.clear();
    motifCache.clear();
    stopSelectScreen();
    renderView();
    setMessage(`Library updated: ${state.library.characters.length} characters, ${state.library.stages.length} stages, ${state.library.lifebars.length} lifebars.`, "ok");
  } catch (error) {
    setMessage(String(error), "error");
  }
}

init();
