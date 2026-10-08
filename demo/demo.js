/*
 * Démo de Tile Placer Card : charge la vraie carte (../tile-placer-card.js) sur un faux Home Assistant.
 * Rien n'est envoyé nulle part : les états, les appareils et l'enregistrement sont simulés dans la page.
 * Les modifications faites dans la démo restent dans ce navigateur (stockage local).
 */
const STORE_KEY = "tpc-demo-config-v1";
const MDI_BASE = "https://cdn.jsdelivr.net/npm/@mdi/svg@7.4.47/svg/";
const DEFAULT_BG = "plan-demo.svg";

/* ---------- icônes MDI (ha-icon simulé) ---------- */

const iconCache = new Map();
function loadIconPath(name) {
  if (!iconCache.has(name)) {
    iconCache.set(name, fetch(`${MDI_BASE}${encodeURIComponent(name)}.svg`)
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => (t.match(/\sd="([^"]+)"/) || [])[1] || "")
      .catch(() => ""));
  }
  return iconCache.get(name);
}

class DemoIcon extends HTMLElement {
  static get observedAttributes() { return ["icon"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML =
      '<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}' +
      'svg{width:100%;height:100%;fill:currentColor}</style>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d=""></path></svg>';
  }
  attributeChangedCallback() { this._render(); }
  connectedCallback() { this._render(); }
  _render() {
    const full = this.getAttribute("icon") || "";
    const name = full.includes(":") ? full.split(":")[1] : full;
    const path = this.shadowRoot && this.shadowRoot.querySelector("path");
    if (!path || !full.startsWith("mdi:")) return;
    loadIconPath(name).then((d) => { if (this.getAttribute("icon") === full) path.setAttribute("d", d); });
  }
}
customElements.define("ha-icon", DemoIcon);

/* ---------- ha-card, sélecteurs d'icône et d'entité (versions minimales) ---------- */

class DemoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML =
      '<style>:host{display:block;background:var(--card-background-color);border-radius:12px;' +
      'box-shadow:0 1px 6px rgba(0,0,0,.25);color:var(--primary-text-color)}</style><slot></slot>';
  }
}
customElements.define("ha-card", DemoCard);

const COMMON_ICONS = ["lightbulb", "ceiling-light", "lamp", "power-socket-eu", "fan", "television", "thermometer",
  "door", "door-open", "window-closed", "window-open", "motion-sensor", "window-shutter", "window-shutter-open",
  "garage", "coffee-maker", "moon-waning-crescent", "fridge", "washing-machine", "speaker", "router-network",
  "cellphone", "laptop", "printer", "water-boiler", "solar-panel", "heat-pump", "robot-vacuum"].map((n) => "mdi:" + n);

class DemoPicker extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._value = "";
    this.includeEntities = null;
    this.allowCustomEntity = true;
    this.attachShadow({ mode: "open" }).innerHTML =
      '<style>input{font:inherit;padding:8px;border-radius:8px;border:1px solid var(--divider-color);box-sizing:border-box;' +
      'width:100%;background:var(--secondary-background-color);color:var(--primary-text-color)}</style>' +
      '<input type="text" list="l"><datalist id="l"></datalist>';
    this._input = this.shadowRoot.querySelector("input");
    this._list = this.shadowRoot.querySelector("datalist");
    this._input.addEventListener("change", () => {
      this._value = this._input.value.trim();
      this.dispatchEvent(new CustomEvent("value-changed", { detail: { value: this._value }, bubbles: true, composed: true }));
    });
  }
  set hass(h) { this._hass = h; this._fill(); }
  get hass() { return this._hass; }
  set value(v) { this._value = v || ""; this._input.value = this._value; }
  get value() { return this._value; }
  _fill() {
    const ids = this.localName === "ha-icon-picker"
      ? COMMON_ICONS
      : (this.includeEntities || Object.keys((this._hass && this._hass.states) || {})).slice().sort();
    this._list.replaceChildren(...ids.map((id) => Object.assign(document.createElement("option"), { value: id })));
    this._input.placeholder = this.localName === "ha-icon-picker" ? "mdi:lightbulb" : "light.salon";
  }
  connectedCallback() { this._fill(); }
}
customElements.define("ha-icon-picker", class extends DemoPicker {});
customElements.define("ha-entity-picker", class extends DemoPicker {});

/* ---------- faux Home Assistant ---------- */

const S = (state, attributes) => ({ state, attributes: { ...attributes } });
const FR_STATE = { on: "Activé", off: "Désactivé", open: "Ouvert", closed: "Fermé", opening: "Ouverture…", closing: "Fermeture…", playing: "Lecture" };

function initialStates() {
  const st = {
    "light.salon": S("on", { friendly_name: "Plafonnier salon" }),
    "light.cuisine": S("off", { friendly_name: "Lumière cuisine" }),
    "light.chambre": S("on", { friendly_name: "Lumière chambre" }),
    "light.sdb": S("off", { friendly_name: "Lumière salle de bain" }),
    "switch.cafetiere": S("off", { friendly_name: "Cafetière" }),
    "switch.prise_garage": S("on", { friendly_name: "Prise du garage" }),
    "input_boolean.mode_nuit": S("off", { friendly_name: "Mode nuit" }),
    "fan.ventilateur": S("on", { friendly_name: "Ventilateur" }),
    "media_player.tv_salon": S("playing", { friendly_name: "Télévision" }),
    "sensor.temperature_salon": S("21.5", { friendly_name: "Température salon", unit_of_measurement: "°C", device_class: "temperature" }),
    "binary_sensor.porte_entree": S("on", { friendly_name: "Porte d'entrée", device_class: "door" }),
    "binary_sensor.fenetre_chambre": S("off", { friendly_name: "Fenêtre chambre", device_class: "window" }),
    "binary_sensor.mouvement_entree": S("off", { friendly_name: "Mouvement entrée", device_class: "motion" }),
    "cover.volet_salon": S("closed", { friendly_name: "Volet salon", device_class: "shutter", current_position: 0 }),
    "cover.volet_cuisine": S("open", { friendly_name: "Volet cuisine", device_class: "shutter", current_position: 34 }),
    "cover.volet_chambre": S("open", { friendly_name: "Volet chambre", device_class: "shutter", current_position: 100 }),
    "cover.porte_garage": S("closed", { friendly_name: "Porte du garage", device_class: "garage", current_position: 0 }),
  };
  for (const [id, s] of Object.entries(st)) s.entity_id = id;
  return st;
}

const AREAS = { salon: "Salon", cuisine: "Cuisine", chambre: "Chambre", entree: "Entrée", garage: "Garage", sdb: "Salle de bain" };
const DEVICES = {
  d_salon_lampe: ["Plafonnier salon", "salon", ["light.salon"]],
  d_tv: ["Télévision", "salon", ["media_player.tv_salon"]],
  d_sonde_salon: ["Sonde salon", "salon", ["sensor.temperature_salon"]],
  d_volet_salon: ["Volet salon", "salon", ["cover.volet_salon"]],
  d_cuisine_lampe: ["Lumière cuisine", "cuisine", ["light.cuisine"]],
  d_cafetiere: ["Cafetière", "cuisine", ["switch.cafetiere"]],
  d_volet_cuisine: ["Volet cuisine", "cuisine", ["cover.volet_cuisine"]],
  d_chambre_lampe: ["Lumière chambre", "chambre", ["light.chambre"]],
  d_ventilateur: ["Ventilateur", "chambre", ["fan.ventilateur"]],
  d_fenetre: ["Fenêtre chambre", "chambre", ["binary_sensor.fenetre_chambre"]],
  d_volet_chambre: ["Volet chambre", "chambre", ["cover.volet_chambre"]],
  d_porte: ["Porte d'entrée", "entree", ["binary_sensor.porte_entree"]],
  d_mouvement: ["Détecteur de mouvement", "entree", ["binary_sensor.mouvement_entree"]],
  d_garage: ["Porte du garage", "garage", ["cover.porte_garage"]],
  d_prise: ["Prise du garage", "garage", ["switch.prise_garage"]],
  d_sdb: ["Lumière salle de bain", "sdb", ["light.sdb"]],
};

function defaultCard() {
  const size = window.innerWidth < 700 ? 30 : 40; // petit écran : bulles plus petites sur le plan
  const t = (id, x, y, icon, entity, name, extra) => ({ id, x_pct: x, y_pct: y, icon, entity, name, size, ...extra });
  const toggle = { tap_action: { action: "toggle" } };
  return {
    type: "custom:tile-placer-card",
    background: DEFAULT_BG,
    label_mode: "hover",
    tiles: [
      t("p1", 29.2, 22.5, "mdi:ceiling-light", "light.salon", "Plafonnier salon", toggle),
      t("p2", 14.2, 41.3, "mdi:television", "media_player.tv_salon", "Télévision"),
      t("p3", 43.3, 41.3, "mdi:thermometer", "sensor.temperature_salon", "Température salon", { show_state: true }),
      t("p4", 18.3, 10.3, "mdi:window-shutter", "cover.volet_salon", "Volet salon", toggle),
      t("p5", 71.7, 23.8, "mdi:ceiling-light", "light.cuisine", "Lumière cuisine", toggle),
      t("p6", 84.2, 16.3, "mdi:coffee-maker", "switch.cafetiere", "Cafetière", toggle),
      t("p7", 78.3, 10.3, "mdi:window-shutter", "cover.volet_cuisine", "Volet cuisine", toggle),
      t("p8", 19.2, 70, "mdi:lamp", "light.chambre", "Lumière chambre", toggle),
      t("p9", 19.2, 90.6, "mdi:window-shutter", "cover.volet_chambre", "Volet chambre", toggle),
      t("p10", 6.7, 75, "mdi:window-closed", "binary_sensor.fenetre_chambre", "Fenêtre chambre"),
      t("p11", 27.5, 60, "mdi:fan", "fan.ventilateur", "Ventilateur", toggle),
      t("p12", 27.5, 81.3, "mdi:moon-waning-crescent", "input_boolean.mode_nuit", "Mode nuit", toggle),
      t("p13", 63.3, 91, "mdi:door", "binary_sensor.porte_entree", "Porte d'entrée"),
      t("p14", 63.3, 65, "mdi:motion-sensor", "binary_sensor.mouvement_entree", "Mouvement entrée"),
      t("p15", 84.2, 91, "mdi:garage", "cover.porte_garage", "Porte du garage", toggle),
      t("p16", 84.2, 65, "mdi:power-socket-eu", "switch.prise_garage", "Prise du garage", toggle),
      t("p17", 43.3, 72.5, "mdi:ceiling-light", "light.sdb", "Lumière salle de bain", toggle),
    ],
  };
}

function loadCard() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (c && c.type === "custom:tile-placer-card" && Array.isArray(c.tiles)) return c;
    }
  } catch (_) { /* stockage indisponible : on repart de la démo */ }
  return defaultCard();
}

function saveCard(card) {
  try {
    const c = JSON.parse(JSON.stringify(card));
    if (String(c.background || "").startsWith("blob:")) c.background = DEFAULT_BG; // image envoyée : non conservée
    localStorage.setItem(STORE_KEY, JSON.stringify(c));
  } catch (_) { /* quota ou stockage bloqué : la démo continue sans mémoire */ }
}

/* ---------- mise en route ---------- */

const el = document.getElementById("tpc");
const toastBox = document.getElementById("toast");
let hass = null;
let storedConfig = { views: [{ path: "demo", cards: [loadCard()] }] };
const card = document.createElement("tile-placer-card");

function toast(msg) {
  const d = Object.assign(document.createElement("div"), { className: "toast", textContent: msg });
  toastBox.append(d);
  setTimeout(() => d.remove(), 3500);
}

function push() {
  hass = { ...hass, states: { ...hass.states } };
  card.hass = hass;
}

function setState(id, state, extra) {
  const cur = hass.states[id];
  hass.states[id] = { ...cur, state, attributes: { ...cur.attributes, ...extra } };
}

function toggleEntity(id) {
  const domain = id.split(".")[0];
  const cur = hass.states[id];
  if (!cur) return;
  if (domain === "cover") {
    const opening = !(cur.state === "open" || cur.state === "opening");
    setState(id, opening ? "opening" : "closing");
    push();
    setTimeout(() => {
      setState(id, opening ? "open" : "closed", { current_position: opening ? 100 : 0 });
      push();
    }, 1800);
  } else if (["light", "switch", "input_boolean", "fan"].includes(domain)) {
    setState(id, cur.state === "on" ? "off" : "on");
    push();
  }
}

function buildHass() {
  const states = initialStates();
  const entities = {};
  const devices = {};
  for (const [did, [name, area, ents]] of Object.entries(DEVICES)) {
    devices[did] = { id: did, name, name_by_user: null, area_id: area };
    for (const e of ents) entities[e] = { entity_id: e, device_id: did, entity_category: null, hidden: false };
  }
  const areas = Object.fromEntries(Object.entries(AREAS).map(([id, name]) => [id, { area_id: id, name }]));
  return {
    user: { is_admin: true, name: "Démo" },
    states, devices, entities, areas, panels: {},
    formatEntityState: (s) => {
      const u = s.attributes && s.attributes.unit_of_measurement;
      return u ? `${s.state} ${u}` : (FR_STATE[s.state] || s.state);
    },
    callService: async (domain, service, data, target) => {
      const raw = (data && data.entity_id) || (target && target.entity_id) || [];
      const ids = Array.isArray(raw) ? raw : [raw];
      toast(`Service ${domain}.${service}${ids.length ? " sur " + ids.join(", ") : ""} (simulé)`);
      for (const id of ids) {
        const d = id.split(".")[0];
        if (service === "toggle") toggleEntity(id);
        else if (service === "turn_on" || service === "turn_off") {
          if (hass.states[id] && ["light", "switch", "input_boolean", "fan"].includes(d)) { setState(id, service === "turn_on" ? "on" : "off"); push(); }
        } else if (service === "open_cover" || service === "close_cover") {
          const open = service === "open_cover";
          if (hass.states[id]) { setState(id, open ? "open" : "closed", { current_position: open ? 100 : 0 }); push(); }
        }
      }
    },
    callWS: async (msg) => {
      if (msg.type === "lovelace/config") return JSON.parse(JSON.stringify(storedConfig));
      if (msg.type === "lovelace/config/save") { storedConfig = JSON.parse(JSON.stringify(msg.config)); saveCard(storedConfig.views[0].cards[0]); return {}; }
      return {};
    },
  };
}

hass = buildHass();

// Parent simulant le tableau de bord : la carte enregistre via son objet « lovelace », comme dans Home Assistant.
el.lovelace = {
  urlPath: null,
  saveConfig: async (cfg) => {
    storedConfig = JSON.parse(JSON.stringify(cfg));
    saveCard(storedConfig.views[0].cards[0]);
    toast("Modifications enregistrées dans ce navigateur (démo)");
  },
};

// Adaptations propres à la démo
card._dashboardUrlPath = () => null;
card._createPage = () => toast("Création de page : indisponible dans la démo");
card._uploadImage = async (file) => {
  if (!/^image\//.test(file.type)) throw new Error("Choisis un fichier image.");
  return URL.createObjectURL(file);
};

card.setConfig(JSON.parse(JSON.stringify(storedConfig.views[0].cards[0])));
el.append(card);
card.hass = hass;

// Fenêtre « plus d'infos » simulée
document.addEventListener("hass-more-info", (ev) => {
  const id = ev.detail && ev.detail.entityId;
  const s = id && hass.states[id];
  if (!s) return;
  const dlg = document.getElementById("moreinfo");
  const attrs = Object.entries(s.attributes).filter(([k]) => k !== "friendly_name").map(([k, v]) => `${k} : ${v}`).join(" · ");
  dlg.querySelector("h3").textContent = s.attributes.friendly_name || id;
  dlg.querySelector(".state").textContent = (FR_STATE[s.state] || s.state) + (s.attributes.unit_of_measurement ? " " + s.attributes.unit_of_measurement : "");
  dlg.querySelector(".id").textContent = id + (attrs ? " — " + attrs : "");
  const btn = dlg.querySelector("button.toggle");
  const canToggle = ["light", "switch", "input_boolean", "fan", "cover"].includes(id.split(".")[0]);
  btn.style.display = canToggle ? "" : "none";
  btn.onclick = () => { toggleEntity(id); dlg.close(); };
  dlg.showModal();
});

document.getElementById("reset").addEventListener("click", () => {
  try { localStorage.removeItem(STORE_KEY); } catch (_) { /* ignore */ }
  location.reload();
});
