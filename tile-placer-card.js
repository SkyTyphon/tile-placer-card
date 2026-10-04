/*
 * tile-placer-card — carte Lovelace personnalisée (JS natif, sans build, sans dépendance).
 * Pose des tuiles (icône MDI + libellé + état d'entité) sur une image de fond,
 * déplaçables en pourcentages, éditables, sauvegardées dans la config Lovelace (mode stockage).
 * Documentation, options et limites connues : README.md. Licence MIT.
 */
const TPC_VERSION = "0.5.0";
const HOLD_MS = 500;
const DOUBLE_MS = 250;
const DRAG_THRESHOLD = 4;
const ACTIVE_STATES = [
  "on", "open", "opening", "playing", "home", "unlocked", "heat", "cool",
  "heating", "cooling", "active", "detected", "running", "cleaning",
];
const ACTION_TYPES = [
  ["none", "Aucune"],
  ["more-info", "Plus d'infos"],
  ["toggle", "Basculer"],
  ["call-service", "Appeler un service"],
  ["navigate", "Naviguer"],
  ["url", "Ouvrir une URL"],
];
const ACTION_KEYS = ["tap_action", "double_tap_action", "hold_action"];
const ACTION_LABELS = {
  tap_action: "Action au clic",
  double_tap_action: "Action au double clic",
  hold_action: "Action à l'appui long",
};

/* ---------- utilitaires ---------- */

function h(tag, attrs, children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : String(v));
    }
  }
  for (const c of [].concat(children || [])) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

const clone = (o) => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round2 = (v) => Math.round(v * 100) / 100;

function stableStringify(v) {
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}

function newId() {
  return "t" + Math.random().toString(36).slice(2, 8);
}

function actionDefined(a) {
  return !!a && typeof a === "object" && a.action && a.action !== "none";
}

function parseAspect(v) {
  if (v === undefined || v === null || v === "") return "16 / 9";
  const s = String(v).trim();
  let m = s.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
  if (m) return `${m[1]} / ${m[2]}`;
  m = s.match(/^(\d+(?:\.\d+)?)\s*%$/); // padding-bottom style : 56.25% => h/w
  if (m && Number(m[1]) > 0) return `100 / ${m[1]}`;
  m = s.match(/^(\d+(?:\.\d+)?)$/);
  if (m && Number(m[1]) > 0) return `${m[1]} / 1`;
  return "16 / 9";
}

/* Nettoie une tuile avant écriture : retire les champs vides et les actions none. */
function cleanTile(t) {
  const out = clone(t);
  for (const k of Object.keys(out)) {
    if (out[k] === "" || out[k] === undefined || out[k] === null) delete out[k];
  }
  for (const k of ACTION_KEYS) {
    if (out[k] && !actionDefined(out[k])) delete out[k];
  }
  out.x_pct = round2(clamp(Number(out.x_pct) || 0, 0, 100));
  out.y_pct = round2(clamp(Number(out.y_pct) || 0, 0, 100));
  return out;
}

/* ---------- styles ---------- */

const CARD_CSS = `
:host { display: block; }
ha-card { overflow: hidden; position: relative; }
.stage { position: relative; width: 100%; background: var(--secondary-background-color); overflow: hidden; }
.stage img.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; user-select: none; -webkit-user-drag: none; }
.stage.editing { outline: 2px dashed var(--primary-color); outline-offset: -2px; }
.stage.editing.grid { background-image:
  linear-gradient(to right, color-mix(in srgb, var(--primary-text-color) 10%, transparent) 1px, transparent 1px),
  linear-gradient(to bottom, color-mix(in srgb, var(--primary-text-color) 10%, transparent) 1px, transparent 1px);
  background-size: 10% 10%; }
.tile { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column;
  align-items: center; gap: 2px; min-width: 40px; max-width: 140px; cursor: pointer; user-select: none;
  -webkit-user-select: none; -webkit-touch-callout: none; border-radius: 12px; padding: 2px; outline: none; }
.tile:focus-visible { box-shadow: 0 0 0 2px var(--primary-color); }
.stage.editing .tile { cursor: grab; touch-action: none; }
.tile.dragging { cursor: grabbing; z-index: 5; opacity: .85; }
.tile .bubble { display: flex; align-items: center; justify-content: center; border-radius: 50%;
  background: color-mix(in srgb, var(--card-background-color, #fff) 82%, transparent);
  border: 1px solid var(--divider-color); box-shadow: 0 1px 4px rgba(0,0,0,.25); color: var(--secondary-text-color); }
.tile.active .bubble { color: var(--tile-color, var(--state-icon-active-color, var(--primary-color))); }
.tile.has-color .bubble { color: var(--tile-color); }
.tile.unavailable .bubble { opacity: .55; border-style: dashed; }
.tile .label, .tile .state { max-width: 100%; text-align: center; line-height: 1.15; padding: 0 4px; border-radius: 6px;
  background: color-mix(in srgb, var(--card-background-color, #fff) 75%, transparent);
  color: var(--primary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tile .label { font-size: 12px; font-weight: 500; }
.tile.lm-hover .label, .tile.lm-never .label { display: none; }
.tile.lm-hover:hover, .tile.selected { z-index: 6; }
.tile.lm-hover:hover .label, .stage.editing .tile.selected .label { display: block; }
.tile.transparent .bubble { background: transparent; border-color: transparent; box-shadow: none; }
.tile.selected .bubble { outline: 2px solid var(--primary-color); outline-offset: 2px; }
.panel { position: absolute; right: 8px; bottom: 8px; z-index: 20; width: min(340px, calc(100% - 16px)); max-height: 70%;
  overflow: auto; box-sizing: border-box; padding: 8px 14px 14px; border: 1px solid var(--divider-color); border-radius: 12px;
  background: color-mix(in srgb, var(--card-background-color, #fff) 94%, transparent); box-shadow: 0 4px 20px rgba(0,0,0,.4); display: none; }
.panel .cols { grid-template-columns: 1fr !important; }
.panel h3 { margin: 4px 0 8px; font-size: 14px; font-weight: 500; }
.panel .row { display: flex; flex-direction: column; gap: 4px; margin: 8px 0; }
.panel .row > label { font-size: 12px; color: var(--secondary-text-color); }
.panel .inline { display: flex; gap: 8px; align-items: center; }
.panel .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0 16px; }
.panel input, .panel select, .panel textarea { font: inherit; padding: 8px; border-radius: 8px; border: 1px solid var(--divider-color);
  background: var(--secondary-background-color, #f5f5f5); color: var(--primary-text-color); box-sizing: border-box; width: 100%; }
.panel input[type=color] { width: 48px; padding: 2px; height: 36px; }
.panel input[type=range] { padding: 0; }
.panel input[type=checkbox] { width: auto; }
.panel textarea { min-height: 60px; font-family: monospace; font-size: 12px; }
.panel details { margin-top: 8px; }
.panel summary { cursor: pointer; font-size: 13px; padding: 4px 0; }
.panel .err { color: var(--error-color); font-size: 13px; min-height: 18px; }
.panel .btns { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.panel button { font: inherit; cursor: pointer; padding: 6px 14px; border-radius: 8px; border: 1px solid var(--divider-color);
  background: var(--card-background-color); color: var(--primary-text-color); }
.panel button.danger { color: var(--error-color); border-color: var(--error-color); }
.panel ha-icon-picker, .panel ha-entity-picker { display: block; width: 100%; }
.tile .state { font-size: 11px; color: var(--secondary-text-color); }
.tile .bubble ha-icon, .tile .bubble ha-state-icon { --mdc-icon-size: var(--tile-icon-size, 24px); display: flex; }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 12px; }
.toolbar .msg { flex: 1 1 160px; font-size: 13px; }
.toolbar .msg.err { color: var(--error-color); }
.toolbar .msg.ok { color: var(--success-color); }
button.btn { font: inherit; cursor: pointer; padding: 6px 14px; border-radius: 8px; border: 1px solid var(--divider-color);
  background: var(--card-background-color); color: var(--primary-text-color); }
button.btn.primary { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: var(--primary-color); }
button.btn:disabled { opacity: .5; cursor: default; }
button.btn:focus-visible, button.pencil:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
button.pencil { position: absolute; top: 6px; right: 6px; z-index: 10; width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--divider-color); background: color-mix(in srgb, var(--card-background-color, #fff) 85%, transparent);
  color: var(--primary-text-color); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
.empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: var(--secondary-text-color); font-size: 13px; text-align: center; padding: 16px; pointer-events: none; }
`;

/* ---------- carte ---------- */

class TilePlacerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._baseline = null; // JSON stable de la config telle que reçue / dernièrement enregistrée
    this._tiles = [];
    this._editing = false;
    this._dirty = false;
    this._saving = false;
    this._hass = null;
    this._els = new Map(); // id -> {root, bubble, iconHost, label, state, iconKey}
    this._timers = new Map();
    this._msg = null;
    this._built = false;
  }

  /* --- API Lovelace --- */

  static getStubConfig() {
    return { type: "custom:tile-placer-card", tiles: [] };
  }

  static getConfigElement() {
    return document.createElement("tile-placer-card-editor");
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Configuration invalide");
    if (config.tiles !== undefined && !Array.isArray(config.tiles)) {
      throw new Error("`tiles` doit être une liste");
    }
    const key = stableStringify(config);
    if (this._editing && this._dirty && key === this._baseline) return; // ne pas écraser l'édition en cours
    this._config = clone(config);
    this._baseline = key;
    this._tiles = (this._config.tiles || []).map((t) => ({ ...t, id: t.id || newId() }));
    this._editing = false;
    this._dirty = false;
    this._msg = null;
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._built) {
      this._updatePencil();
      this._updateTiles();
    }
  }

  getCardSize() {
    const r = this._stage ? this._stage.offsetHeight : 0;
    return r ? Math.max(2, Math.ceil(r / 50)) : 6;
  }

  getGridOptions() {
    return { columns: 12, rows: "auto", min_columns: 3 };
  }

  /* --- rendu --- */

  _isAdmin() {
    return !!(this._hass && this._hass.user && this._hass.user.is_admin);
  }

  _canEdit() {
    return this._config && this._config.editable !== false && this._isAdmin();
  }

  _build() {
    const root = this.shadowRoot;
    root.replaceChildren();
    root.append(h("style", { text: CARD_CSS }));

    const card = h("ha-card");
    if (this._config.title) card.setAttribute("header", String(this._config.title));
    this._card = card;

    const stage = h("div", { class: "stage" });
    this._stage = stage;
    const hasRatio = this._config.aspect_ratio !== undefined && this._config.aspect_ratio !== null && this._config.aspect_ratio !== "";
    this._sizeStage(parseAspect(this._config.aspect_ratio));
    if (typeof this._config.background === "string" && this._config.background) {
      const img = h("img", { class: "bg", alt: "", draggable: "false" });
      if (!hasRatio) {
        // Sans aspect_ratio : proportions lues sur l'image elle-même.
        img.addEventListener("load", () => {
          if (img.naturalWidth > 0 && img.naturalHeight > 0) this._sizeStage(`${img.naturalWidth} / ${img.naturalHeight}`);
        });
      }
      img.src = this._config.background; // propriété DOM : pas d'injection HTML/CSS
      stage.append(img);
    }
    this._els.clear();
    for (const t of this._tiles) this._createTile(t);
    this._emptyHint = h("div", {
      class: "empty",
      text: this._config.background
        ? "Aucune bulle. Utilise le crayon puis « Nouvel appareil »."
        : "Choisis une image de fond dans les réglages de la carte, puis utilise le crayon pour ajouter des appareils.",
    });
    stage.append(this._emptyHint);

    this._pencil = h("button", {
      class: "pencil", type: "button", title: "Modifier le plan", "aria-label": "Modifier le plan",
      onclick: () => this._toggleEdit(true),
    });
    this._pencil.append(this._mkIcon("mdi:pencil"));
    this._pencil.style.display = "none";

    this._toolbar = h("div", { class: "toolbar", style: "display:none", role: "toolbar" });
    this._panel = h("div", { class: "panel" });
    stage.addEventListener("pointerdown", (ev) => {
      if (this._editing && ev.target === stage) this._select(null);
    });
    stage.append(this._panel);
    card.append(stage, this._pencil, this._toolbar);
    root.append(card);
    this._built = true;
    this._applyEditState();
    this._updatePencil();
    this._updateTiles();
  }

  _sizeStage(aspect) {
    let style = `aspect-ratio: ${aspect}`;
    if (this._config.fit_screen) {
      // Carte aussi grande que possible sans dépasser la hauteur de l'écran (proportions conservées).
      const [aw, ah] = aspect.split("/").map((n) => Number(n));
      const off = Number.isFinite(Number(this._config.screen_offset)) ? Number(this._config.screen_offset) : 150;
      if (aw > 0 && ah > 0) style += `; width: min(100%, calc((100vh - ${off}px) * ${aw} / ${ah})); margin: 0 auto`;
    }
    this._stage.style.cssText = style;
  }

  _mkIcon(icon) {
    const el = document.createElement("ha-icon");
    el.setAttribute("icon", icon);
    return el;
  }

  _createTile(t) {
    const el = h("div", { class: "tile", role: "button", tabindex: "0" });
    const bubble = h("div", { class: "bubble" });
    const iconHost = h("div", { style: "display:flex" });
    bubble.append(iconHost);
    const label = h("div", { class: "label" });
    const state = h("div", { class: "state" });
    el.append(bubble, label, state);
    this._stage.insertBefore(el, this._emptyHint || null);
    this._els.set(t.id, { root: el, bubble, iconHost, label, state, iconKey: null });
    this._bindTile(el, t);
    this._applyTileGeometry(t);
  }

  _applyTileGeometry(t) {
    const e = this._els.get(t.id);
    if (!e) return;
    const size = clamp(Number(t.size) || 48, 24, 160);
    e.root.style.left = `${clamp(Number(t.x_pct) || 0, 0, 100)}%`;
    e.root.style.top = `${clamp(Number(t.y_pct) || 0, 0, 100)}%`;
    e.bubble.style.width = e.bubble.style.height = `${size}px`;
    e.root.style.setProperty("--tile-icon-size", `${Math.round(size * 0.55)}px`);
    if (t.color) {
      e.root.style.setProperty("--tile-color", String(t.color));
      e.root.classList.add("has-color");
    } else {
      e.root.style.removeProperty("--tile-color");
      e.root.classList.remove("has-color");
    }
  }

  _stateObj(t) {
    return t.entity && this._hass ? this._hass.states[t.entity] : undefined;
  }

  _stateText(t, s) {
    if (!t.entity) return "";
    if (!s) return "indisponible";
    const hass = this._hass;
    if (hass && typeof hass.formatEntityState === "function") {
      try { return hass.formatEntityState(s); } catch (_) { /* repli */ }
    }
    const u = s.attributes && s.attributes.unit_of_measurement;
    return u ? `${s.state} ${u}` : s.state;
  }

  _updateTiles() {
    if (!this._hass) return;
    for (const t of this._tiles) {
      const e = this._els.get(t.id);
      if (!e) continue;
      const s = this._stateObj(t);
      const missing = !!t.entity && !s;
      const unavailable = missing || (s && (s.state === "unavailable" || s.state === "unknown"));
      e.root.classList.toggle("unavailable", !!unavailable);
      e.root.classList.toggle("active", !!s && ACTIVE_STATES.includes(s.state));

      const name = t.name || (s && s.attributes && s.attributes.friendly_name) || (t.entity || "");
      e.label.textContent = name || "";
      const mode = t.show_name === false ? "never" : (t.label_mode || (this._config && this._config.label_mode) || "hover");
      for (const m of ["always", "hover", "never"]) e.root.classList.toggle("lm-" + m, m === mode);
      e.root.classList.toggle("transparent", !!t.transparent);
      e.root.classList.toggle("selected", this._editing && this._selectedId === t.id);
      const showState = t.show_state === true && t.entity;
      const txt = showState ? this._stateText(t, s) : "";
      e.state.textContent = txt;
      e.state.style.display = txt ? "" : "none";

      const aria = [name, txt].filter(Boolean).join(", ");
      e.root.setAttribute("aria-label", aria || "tuile");

      // icône
      const useStateIcon = !t.icon && s && customElements.get("ha-state-icon");
      const key = useStateIcon ? "state:" + (s.attributes.icon || s.state) : "icon:" + (t.icon || "");
      if (useStateIcon) {
        let si = e.iconHost.firstChild;
        if (!si || si.tagName !== "HA-STATE-ICON") {
          si = document.createElement("ha-state-icon");
          e.iconHost.replaceChildren(si);
        }
        si.hass = this._hass;
        si.stateObj = s;
        e.iconKey = key;
      } else if (e.iconKey !== key || !e.iconHost.firstChild) {
        e.iconHost.replaceChildren(this._mkIcon(t.icon || (missing ? "mdi:help-circle-outline" : "mdi:shape-outline")));
        e.iconKey = key;
      }
    }
    if (this._emptyHint) this._emptyHint.style.display = this._tiles.length ? "none" : "";
  }

  _updatePencil() {
    if (!this._pencil) return;
    this._pencil.style.display = this._canEdit() && !this._editing ? "" : "none";
  }

  /* --- édition --- */

  _toggleEdit(on) {
    if (on && !this._canEdit()) return;
    this._editing = on;
    if (!on) this._dirty = false;
    this._applyEditState();
    this._updatePencil();
  }

  _applyEditState() {
    this._stage.classList.toggle("editing", this._editing);
    this._stage.classList.toggle("grid", this._editing);
    if (!this._editing) { this._selectedId = null; this._renderPanel(); }
    for (const e of this._els.values()) {
      e.root.setAttribute("aria-roledescription", this._editing ? "tuile déplaçable" : "");
    }
    this._renderToolbar();
  }

  _renderToolbar() {
    const tb = this._toolbar;
    tb.replaceChildren();
    if (!this._editing) { tb.style.display = "none"; return; }
    tb.style.display = "";
    const add = h("button", { class: "btn", type: "button", text: "+ Nouvel appareil", onclick: () => this._addTile() });
    const save = h("button", {
      class: "btn primary", type: "button", text: this._saving ? "Enregistrement…" : "Enregistrer",
      onclick: () => this._save(),
    });
    save.disabled = this._saving || !this._dirty;
    const cancel = h("button", { class: "btn", type: "button", text: "Annuler", onclick: () => this._cancelEdit() });
    cancel.disabled = this._saving;
    const msg = h("div", { class: "msg" + (this._msg ? " " + this._msg.kind : ""), role: "status", "aria-live": "polite" });
    msg.textContent = this._msg ? this._msg.text : (this._dirty ? "Modifications non enregistrées." : "Glisse les tuiles ; clique pour configurer.");
    tb.append(add, save, cancel, msg);
  }

  _setMsg(kind, text) {
    this._msg = text ? { kind, text } : null;
    if (this._editing) this._renderToolbar();
  }

  _markDirty() {
    this._dirty = true;
    this._msg = null;
    this._renderToolbar();
  }

  _cancelEdit() {
    if (this._dirty && !confirm("Abandonner les modifications non enregistrées ?")) return;
    this._tiles = (this._config.tiles || []).map((t) => ({ ...clone(t), id: t.id || newId() }));
    this._editing = false;
    this._dirty = false;
    this._msg = null;
    this._rebuildTiles();
    this._applyEditState();
    this._updatePencil();
  }

  _rebuildTiles() {
    for (const e of this._els.values()) e.root.remove();
    this._els.clear();
    for (const t of this._tiles) this._createTile(t);
    this._updateTiles();
  }

  _addTile() {
    // Position libre la plus proche du centre : évite d'empiler la nouvelle bulle sur une existante.
    let x = 50;
    let y = 50;
    const taken = (px, py) => this._tiles.some((o) => Math.hypot(o.x_pct - px, o.y_pct - py) < 4);
    for (let i = 0; i < 40 && taken(x, y); i++) {
      x = clamp(50 + (i % 8) * 5 - 17, 3, 97);
      y = clamp(50 + Math.floor(i / 8) * 5 - 5, 3, 97);
    }
    const t = { id: newId(), x_pct: x, y_pct: y, size: 36 };
    this._tiles.push(t);
    this._createTile(t);
    this._markDirty();
    this._select(t.id);
  }

  _deleteTile(id) {
    this._tiles = this._tiles.filter((t) => t.id !== id);
    const e = this._els.get(id);
    if (e) e.root.remove();
    this._els.delete(id);
    if (this._selectedId === id) this._selectedId = null;
    this._renderPanel();
    this._updateTiles();
    this._markDirty();
  }

  /* --- sélection et panneau d'édition en direct --- */

  _select(id) {
    if (!this._editing) id = null;
    this._selectedId = id;
    this._renderPanel();
    this._updateTiles();
  }

  _live(tile, fn) {
    fn();
    this._applyTileGeometry(tile);
    const e = this._els.get(tile.id);
    if (e) e.iconKey = null;
    this._updateTiles();
    this._markDirty();
  }

  async _renderPanel() {
    const panel = this._panel;
    if (!panel) return;
    const tile = this._tiles.find((t) => t.id === this._selectedId);
    panel.replaceChildren();
    if (!tile || !this._editing) { panel.style.display = "none"; return; }
    await this._ensurePickers();
    if (this._selectedId !== tile.id) return;
    panel.style.display = "block";
    const hass = this._hass;
    const lbl = (txt, ctl) => h("div", { class: "row" }, [h("label", { text: txt }), ctl]);
    const text = (val, on, attrs) => {
      const i = h("input", { type: "text", ...(attrs || {}) });
      i.value = val || "";
      i.addEventListener("input", () => on(i.value));
      return i;
    };
    const check = (val, on, txt) => {
      const c = h("input", { type: "checkbox" });
      c.checked = !!val;
      c.addEventListener("change", () => on(c.checked));
      return h("label", { class: "inline" }, [c, txt]);
    };

    let iconCtl;
    if (customElements.get("ha-icon-picker")) {
      iconCtl = document.createElement("ha-icon-picker");
      iconCtl.hass = hass;
      iconCtl.value = tile.icon || "";
      iconCtl.addEventListener("value-changed", (ev) => {
        const v = ev.detail.value || "";
        if (v !== (tile.icon || "")) this._live(tile, () => { tile.icon = v; });
      });
    } else {
      iconCtl = text(tile.icon, (v) => this._live(tile, () => { tile.icon = v.trim(); }), { placeholder: "mdi:lightbulb" });
    }
    let entCtl;
    if (customElements.get("ha-entity-picker")) {
      entCtl = document.createElement("ha-entity-picker");
      entCtl.hass = hass;
      entCtl.value = tile.entity || "";
      entCtl.allowCustomEntity = true;
      entCtl.addEventListener("value-changed", (ev) => {
        const v = ev.detail.value || "";
        if (v !== (tile.entity || "")) this._live(tile, () => { tile.entity = v; });
      });
    } else {
      const dl = h("datalist", { id: "tpc-entities" });
      Object.keys((hass && hass.states) || {}).sort().slice(0, 3000).forEach((id) => dl.append(h("option", { value: id })));
      entCtl = h("div", null, [text(tile.entity, (v) => this._live(tile, () => { tile.entity = v.trim(); }), { list: "tpc-entities", placeholder: "light.salon" }), dl]);
    }

    const size = h("input", { type: "range", min: "20", max: "120", step: "2" });
    size.value = tile.size || 36;
    const sizeVal = h("span", { text: `${size.value} px` });
    size.addEventListener("input", () => {
      sizeVal.textContent = `${size.value} px`;
      this._live(tile, () => { tile.size = Number(size.value); });
    });

    const mode = h("select", { "aria-label": "Affichage du libellé" });
    for (const [v, l] of [["hover", "Au survol / sélection"], ["always", "Toujours"], ["never", "Jamais"]]) {
      const o = h("option", { value: v, text: l });
      if ((tile.show_name === false ? "never" : (tile.label_mode || this._config.label_mode || "hover")) === v) o.selected = true;
      mode.append(o);
    }
    mode.addEventListener("change", () => this._live(tile, () => { delete tile.show_name; tile.label_mode = mode.value; }));

    const colorText = text(tile.color, (v) => this._live(tile, () => { tile.color = v.trim(); }), { placeholder: "#ffa500 ou var(--primary-color)" });
    const colorPick = h("input", { type: "color", "aria-label": "Choisir une couleur" });
    colorPick.value = /^#[0-9a-f]{6}$/i.test(tile.color || "") ? tile.color : "#ffa500";
    colorPick.addEventListener("input", () => { colorText.value = colorPick.value; this._live(tile, () => { tile.color = colorPick.value; }); });

    // actions : validées par un bouton (JSON, service)
    const draft = { tap_action: tile.tap_action, double_tap_action: tile.double_tap_action, hold_action: tile.hold_action };
    for (const k of ACTION_KEYS) draft[k] = draft[k] ? clone(draft[k]) : { action: "default" };
    const errBox = h("div", { class: "err", role: "alert" });
    const rowFn = (label, control) => h("div", { class: "row" }, [h("label", { text: label }), control]);
    // Les actions s'appliquent en direct dès qu'elles sont valides ; une action incomplète n'est pas écrite.
    const commit = () => {
      const out = {};
      try {
        for (const key of ACTION_KEYS) {
          const a = clone(draft[key]);
          const txt = (a._dataText || "").trim();
          delete a._dataText;
          if (a.action === "call-service") {
            if (txt) {
              const obj = JSON.parse(txt);
              if (obj === null || typeof obj !== "object" || Array.isArray(obj)) throw new Error("Les données doivent être un objet JSON");
              a.data = obj;
            } else delete a.data;
            if (!(a.service && /^[a-z0-9_]+\.[a-z0-9_]+$/i.test(a.service))) {
              throw new Error(`${ACTION_LABELS[key]} : service au format domaine.service requis`);
            }
          }
          if (a.action === "navigate" && !a.navigation_path) throw new Error(`${ACTION_LABELS[key]} : chemin requis`);
          if (a.action === "url" && !a.url_path) throw new Error(`${ACTION_LABELS[key]} : URL requise`);
          out[key] = a;
        }
      } catch (err) {
        errBox.textContent = "Pas encore appliqué : " + (err.message || err);
        return;
      }
      errBox.textContent = "";
      this._live(tile, () => {
        for (const key of ACTION_KEYS) {
          if (out[key].action === "default") delete tile[key];
          else tile[key] = out[key];
        }
      });
    };
    const actionBoxes = ACTION_KEYS.map((k) => this._actionEditor(k, draft, text, rowFn, commit));

    const del = h("button", { type: "button", class: "danger", text: "Supprimer la bulle" });
    del.addEventListener("click", () => { if (confirm("Supprimer cette bulle ?")) this._deleteTile(tile.id); });
    const done = h("button", { type: "button", text: "Fermer" });
    done.addEventListener("click", () => this._select(null));

    panel.append(
      h("h3", { text: "Bulle sélectionnée" }),
      h("div", { class: "cols" }, [
        lbl("Nom", text(tile.name, (v) => this._live(tile, () => { tile.name = v; }), { placeholder: "Nom (sinon nom de l'entité)" })),
        lbl("Icône", iconCtl),
        lbl("Entité", entCtl),
        lbl("Affichage du nom", mode),
        lbl("Taille", h("div", { class: "inline" }, [size, sizeVal])),
        lbl("Couleur de l'icône", h("div", { class: "inline" }, [colorText, colorPick])),
      ]),
      check(tile.show_state === true, (v) => this._live(tile, () => { tile.show_state = v; }), "Afficher l'état sous la bulle"),
      check(tile.transparent, (v) => this._live(tile, () => { tile.transparent = v; }), "Fond transparent (icône seule)"),
      h("details", null, [h("summary", { text: "Actions (clic, double clic, appui long)" }), ...actionBoxes, errBox]),
      h("div", { class: "btns" }, [del, done]),
    );
  }

  /* --- interactions tuile --- */

  _bindTile(el, tile) {
    let st = null;
    const stage = () => this._stage.getBoundingClientRect();

    // En édition, le glissement appartient à la carte : empêcher qu'un module de navigation par balayage
    // (ex. hass-swipe-navigation avec enable_mouse_swipe) ne l'interprète comme un changement de vue.
    for (const type of ["mousedown", "mousemove", "mouseup", "touchstart", "touchmove", "touchend"]) {
      el.addEventListener(type, (ev) => { if (this._editing) ev.stopPropagation(); });
    }

    el.addEventListener("contextmenu", (ev) => {
      if (this._editing || actionDefined(tile.hold_action)) ev.preventDefault();
    });

    el.addEventListener("pointerdown", (ev) => {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      st = { x: ev.clientX, y: ev.clientY, moved: false, held: false, cancelled: false, id: ev.pointerId, ox: 0, oy: 0 };
      if (this._editing) {
        const r = stage();
        st.ox = tile.x_pct - ((ev.clientX - r.left) / r.width) * 100;
        st.oy = tile.y_pct - ((ev.clientY - r.top) / r.height) * 100;
        try { el.setPointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
      } else if (actionDefined(tile.hold_action)) {
        st.timer = setTimeout(() => {
          if (!st) return;
          st.held = true;
          this._runAction(tile, "hold");
        }, HOLD_MS);
      }
    });

    el.addEventListener("pointermove", (ev) => {
      if (!st || ev.pointerId !== st.id) return;
      const d = Math.hypot(ev.clientX - st.x, ev.clientY - st.y);
      if (this._editing) {
        if (!st.moved && d < DRAG_THRESHOLD) return;
        st.moved = true;
        el.classList.add("dragging");
        const r = stage();
        if (!r.width || !r.height) return;
        tile.x_pct = round2(clamp(((ev.clientX - r.left) / r.width) * 100 + st.ox, 0, 100));
        tile.y_pct = round2(clamp(((ev.clientY - r.top) / r.height) * 100 + st.oy, 0, 100));
        this._applyTileGeometry(tile);
        ev.preventDefault();
      } else if (d > 10) {
        st.cancelled = true;
        clearTimeout(st.timer);
      }
    });

    const end = (ev, cancelled) => {
      if (!st || ev.pointerId !== st.id) return;
      const s = st;
      st = null;
      clearTimeout(s.timer);
      el.classList.remove("dragging");
      try { el.releasePointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
      if (cancelled) return;
      if (this._editing) {
        if (s.moved) this._markDirty();
        this._select(tile.id);
      } else if (!s.held && !s.cancelled) {
        this._handleTap(tile);
      }
    };
    el.addEventListener("pointerup", (ev) => end(ev, false));
    el.addEventListener("pointercancel", (ev) => end(ev, true));

    el.addEventListener("keydown", (ev) => {
      if (this._editing) {
        const step = ev.shiftKey ? 5 : 1;
        const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[ev.key];
        if (mv) {
          tile.x_pct = round2(clamp(tile.x_pct + mv[0], 0, 100));
          tile.y_pct = round2(clamp(tile.y_pct + mv[1], 0, 100));
          this._applyTileGeometry(tile);
          this._markDirty();
          ev.preventDefault();
        } else if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          this._select(tile.id);
        }
      } else if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this._runAction(tile, "tap");
      }
    });
  }

  _handleTap(tile) {
    if (!actionDefined(tile.double_tap_action)) {
      this._runAction(tile, "tap");
      return;
    }
    const pending = this._timers.get(tile.id);
    if (pending) {
      clearTimeout(pending);
      this._timers.delete(tile.id);
      this._runAction(tile, "double_tap");
    } else {
      this._timers.set(tile.id, setTimeout(() => {
        this._timers.delete(tile.id);
        this._runAction(tile, "tap");
      }, DOUBLE_MS));
    }
  }

  /* Implémentation maison (handleAction natif non exposé de façon stable aux cartes custom). */
  _runAction(tile, which) {
    const hass = this._hass;
    if (!hass) return;
    const key = which + "_action";
    let a = tile[key];
    if (!a && which === "tap") a = { action: tile.entity ? "more-info" : "none" };
    if (!actionDefined(a)) return;
    const entity = a.entity || a.entity_id || tile.entity;
    try {
      switch (a.action) {
        case "more-info":
          if (entity) {
            this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: entity } }));
          }
          break;
        case "toggle":
          if (entity) hass.callService("homeassistant", "toggle", { entity_id: entity });
          break;
        case "call-service":
        case "perform-action": {
          const svc = a.service || a.perform_action;
          if (!svc || !String(svc).includes(".")) throw new Error("service invalide");
          const [domain, name] = String(svc).split(".");
          hass.callService(domain, name, a.data || a.service_data || {}, a.target);
          break;
        }
        case "navigate":
          if (a.navigation_path) {
            if (a.navigation_replace) history.replaceState(null, "", a.navigation_path);
            else history.pushState(null, "", a.navigation_path);
            window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: !!a.navigation_replace } }));
          }
          break;
        case "url":
          if (a.url_path && !/^\s*(javascript|data|vbscript):/i.test(a.url_path)) {
            window.open(a.url_path, "_blank", "noopener");
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.error("tile-placer-card: action échouée", err);
    }
  }

  /* --- popup de configuration --- */

  async _ensurePickers() {
    if (customElements.get("ha-icon-picker") && customElements.get("ha-entity-picker")) return;
    try {
      if (window.loadCardHelpers) {
        const helpers = await window.loadCardHelpers();
        const c = await helpers.createCardElement({ type: "entities", entities: [] });
        if (c && c.constructor && c.constructor.getConfigElement) await c.constructor.getConfigElement();
      }
    } catch (_) { /* repli champs texte */ }
    await Promise.race([
      Promise.all([customElements.whenDefined("ha-icon-picker"), customElements.whenDefined("ha-entity-picker")]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  }

  _actionEditor(key, draft, textInput, row, commit) {
    const a = draft[key];
    const box = h("div");
    const sel = h("select", { "aria-label": ACTION_LABELS[key] });
    const isTap = key === "tap_action";
    if (!isTap && a.action === "none") a.action = "default";
    const choices = [
      ["default", isTap ? "Par défaut (plus d'infos si entité)" : "Aucune"],
      ...ACTION_TYPES.filter(([t]) => isTap || t !== "none"),
    ];
    for (const [v, l] of choices) {
      const o = h("option", { value: v, text: l });
      if (a.action === v) o.selected = true;
      sel.append(o);
    }
    const sub = h("div");
    const renderSub = () => {
      sub.replaceChildren();
      if (a.action === "call-service") {
        sub.append(row("Service (domaine.service)", textInput(a.service, (v) => { a.service = v.trim(); commit(); },{ placeholder: "light.turn_on" })));
        const ta = h("textarea", { "aria-label": "Données JSON", placeholder: '{"entity_id": "light.salon"}' });
        if (a._dataText === undefined) a._dataText = a.data ? JSON.stringify(a.data, null, 2) : "";
        ta.value = a._dataText;
        ta.addEventListener("input", () => { a._dataText = ta.value; commit(); });
        sub.append(row("Données (JSON, optionnel)", ta));
      } else if (a.action === "navigate") {
        sub.append(row("Chemin", textInput(a.navigation_path, (v) => { a.navigation_path = v.trim(); commit(); },{ placeholder: "/lovelace/0" })));
      } else if (a.action === "url") {
        sub.append(row("URL", textInput(a.url_path, (v) => { a.url_path = v.trim(); commit(); },{ placeholder: "https://…" })));
      }
    };
    sel.addEventListener("change", () => { a.action = sel.value; renderSub(); commit(); });
    renderSub();
    box.append(h("h3", { text: ACTION_LABELS[key] }), sel, sub);
    return box;
  }

  /* --- persistance Lovelace --- */

  _dashboardUrlPath() {
    const seg = location.pathname.split("/").filter(Boolean)[0];
    if (!seg) throw new Error("Dashboard non identifiable depuis l'URL.");
    const panel = this._hass && this._hass.panels && this._hass.panels[seg];
    if (!panel || panel.component_name !== "lovelace") {
      throw new Error(`L'URL « /${seg} » n'est pas un dashboard Lovelace.`);
    }
    return seg === "lovelace" ? null : seg;
  }

  _findCards(node, key, out, seen) {
    if (!node || typeof node !== "object" || seen.has(node)) return out;
    seen.add(node);
    if (!Array.isArray(node) && node.type === "custom:tile-placer-card" && stableStringify(node) === key) out.push(node);
    for (const v of Object.values(node)) this._findCards(v, key, out, seen);
    return out;
  }

  async _save() {
    if (this._saving || !this._dirty) return;
    this._saving = true;
    this._setMsg("", "Enregistrement…");
    try {
      if (!this._canEdit()) throw new Error("Droits administrateur requis.");
      const urlPath = this._dashboardUrlPath();
      const req = { type: "lovelace/config", force: true };
      if (urlPath) req.url_path = urlPath;
      let cfg;
      try {
        cfg = await this._hass.callWS(req);
      } catch (e) {
        if (e && e.code === "config_not_found") {
          throw new Error("Ce dashboard n'a pas de configuration stockée (mode YAML ou configuration auto-générée) : enregistrement impossible.");
        }
        throw new Error("Lecture de la configuration impossible : " + (e && e.message ? e.message : JSON.stringify(e)));
      }
      // contrôle d'écart : la carte doit exister telle que chargée
      const found = this._findCards(cfg, this._baseline, [], new WeakSet());
      if (found.length === 0) {
        throw new Error("Écart détecté : la carte a changé dans le dashboard depuis son chargement (ou a été déplacée). Recharge la page puis refais tes modifications. Rien n'a été écrit.");
      }
      if (found.length > 1) {
        throw new Error("Plusieurs cartes identiques dans ce dashboard : impossible de savoir laquelle modifier. Rien n'a été écrit.");
      }
      const target = found[0];
      const next = clone(this._config);
      next.tiles = this._tiles.map(cleanTile);
      for (const k of Object.keys(target)) delete target[k];
      Object.assign(target, next);
      const saveReq = { type: "lovelace/config/save", config: cfg };
      if (urlPath) saveReq.url_path = urlPath;
      try {
        await this._hass.callWS(saveReq);
      } catch (e) {
        throw new Error("Écriture refusée : " + (e && e.message ? e.message : JSON.stringify(e)));
      }
      this._config = clone(next);
      this._baseline = stableStringify(next);
      this._tiles = next.tiles.map((t) => ({ ...t }));
      this._dirty = false;
      this._editing = false;
      this._saving = false;
      this._rebuildTiles();
      this._applyEditState();
      this._updatePencil();
      return;
    } catch (err) {
      this._saving = false;
      this._msg = { kind: "err", text: err.message || String(err) };
      this._renderToolbar();
    }
  }
}

/* ---------- éditeur visuel de la carte (réglages généraux ; les bulles se gèrent sur le plan) ---------- */

const EDITOR_LABELS = {
  title: "Titre (facultatif)",
  background: "Image de fond (ex. /local/plan.png)",
  aspect_ratio: "Proportions (facultatif)",
  fit_screen: "Agrandir à la hauteur de l'écran",
  label_mode: "Affichage des noms",
  editable: "Autoriser la modification sur le plan",
};
const EDITOR_HELPERS = {
  background: "Place l'image dans /config/www/ : le fichier plan.png s'écrit /local/plan.png.",
  aspect_ratio: "Laisse vide : les proportions sont lues sur l'image. Sinon, ex. 1200:896.",
  fit_screen: "Conseillé dans une vue de type « Panneau ».",
};
const EDITOR_SCHEMA = [
  { name: "title", selector: { text: {} } },
  { name: "background", selector: { text: {} } },
  { name: "aspect_ratio", selector: { text: {} } },
  { name: "fit_screen", selector: { boolean: {} } },
  {
    name: "label_mode",
    selector: {
      select: {
        mode: "dropdown",
        options: [
          { value: "hover", label: "Au survol" },
          { value: "always", label: "Toujours" },
          { value: "never", label: "Jamais" },
        ],
      },
    },
  },
  { name: "editable", selector: { boolean: {} } },
];

class TilePlacerCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _render() {
    if (!this._form) {
      const form = document.createElement("ha-form");
      form.computeLabel = (s) => EDITOR_LABELS[s.name] || s.name;
      form.computeHelper = (s) => EDITOR_HELPERS[s.name] || "";
      form.addEventListener("value-changed", (ev) => {
        const cfg = { ...this._config, ...ev.detail.value };
        for (const k of Object.keys(cfg)) if (cfg[k] === "" || cfg[k] === undefined) delete cfg[k];
        this._config = cfg;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this._form = form;
      this.append(form);
      this.append(h("p", {
        style: "font-size:13px;color:var(--secondary-text-color)",
        text: "Les bulles se placent directement sur le plan : clique sur le crayon de la carte, puis « + Nouvel appareil ».",
      }));
    }
    this._form.hass = this._hass;
    this._form.schema = EDITOR_SCHEMA;
    this._form.data = { editable: true, label_mode: "hover", fit_screen: false, ...this._config };
  }
}

if (!customElements.get("tile-placer-card-editor")) {
  customElements.define("tile-placer-card-editor", TilePlacerCardEditor);
}

if (!customElements.get("tile-placer-card")) {
  customElements.define("tile-placer-card", TilePlacerCard);
}
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "tile-placer-card")) {
  window.customCards.push({
    type: "tile-placer-card",
    name: "Tile Placer Card",
    description: "Tuiles (icône, libellé, état) positionnables en glisser-déposer sur une image de fond.",
    preview: false,
  });
}
console.info(`%c TILE-PLACER-CARD %c v${TPC_VERSION} `, "background:#03a9f4;color:#fff", "background:#333;color:#fff");
