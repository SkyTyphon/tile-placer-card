# Tile Placer Card

> [!WARNING]
> # ⚠️ BETA VERSION
> **This card is in beta (`0.9.x`).** It changes quickly and may contain bugs. Its configuration format may still change between releases.
>
> - **Back up your dashboard** before installing it, and before every update.
> - It is only tested on the author's instance, in a desktop browser. Touch devices and the Companion app are not tested.
> - Please report any problem in the [Issues](https://github.com/SkyTyphon/tile-placer-card/issues).

[![beta](https://img.shields.io/badge/status-BETA-red.svg)](#)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/skytyphoni)

[Français](https://github.com/SkyTyphon/tile-placer-card/blob/main/README.md) · **English**

[![Open your Home Assistant instance and add this repository inside HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=SkyTyphon&repository=tile-placer-card&category=plugin)

A Lovelace card (plain JavaScript, single file, no build, no dependency) that places **bubbles** (MDI icon, name, optional entity state) on a **background image**, for example your house floor plan. Bubbles are positioned in percent, dragged **directly on the map** with a mouse or a finger, and configured one by one (name, icon, entity, size, colour, tap / double tap / hold actions) from a panel that opens on the map. Changes are saved back into the dashboard.

Inspired by the HA Views add-on, but delivered as a card.

![Screenshot of Tile Placer Card in edit mode](docs/screenshot.webp)

*Real screenshot, in edit mode: devices placed on a floor plan, with the toolbar at the bottom ("Nouvel appareil" = new device, "Image de fond…" = background image, "Enregistrer" = save, "Annuler" = cancel).*

> **Status:** `0.x`. Used on the author's own Home Assistant instance, in a desktop browser: dragging, selection panel, full-screen panel view, click actions and "New device" all work. Touch devices and the Companion app are **not tested**. See [Known limitations](#known-limitations).

## Contents

1. [Installation](#installation)
2. [Quick start](#quick-start)
3. [Everyday use](#everyday-use)
4. [Editing the map](#editing-the-map)
5. [YAML configuration](#yaml-configuration)
6. [Actions](#actions)
7. [Tips](#tips)
8. [Known limitations](#known-limitations)
9. [Troubleshooting](#troubleshooting)
10. [Development](#development)

## Installation

### HACS (custom repository)

[**Tile Placer Card** in HACS](https://my.home-assistant.io/redirect/hacs_repository/?owner=SkyTyphon&repository=tile-placer-card&category=plugin) · [Source code on GitHub](https://github.com/SkyTyphon/tile-placer-card)

**Quick way:** click the button; it opens your Home Assistant on this repository's page in HACS. Confirm adding the repository, then click **Download**.

[![Open your Home Assistant instance and add this repository inside HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=SkyTyphon&repository=tile-placer-card&category=plugin)

The button goes through My Home Assistant: the first time, enter the address of your instance. HACS must already be installed.

**Manual way:**

1. In HACS, open the ⋮ menu, then **Custom repositories**.
2. Repository: `https://github.com/SkyTyphon/tile-placer-card`, type **Dashboard** (Lovelace).
3. Install **Tile Placer Card**, then reload the browser with Ctrl+F5.

HACS registers the resource automatically, and updates also go through HACS.

### Manual

1. Copy `tile-placer-card.js` to `/config/www/`.
2. Go to Settings, Dashboards, ⋮ menu, **Resources**, and add `/local/tile-placer-card.js?v=0.9.56` as a **JavaScript module**.
3. Change the `?v=` value after each update: Home Assistant caches `/local/` for a very long time.

## Quick start

1. **Add the card without writing YAML.** Edit your dashboard, click **Add card**, search for **Tile Placer Card**. For a card filling the whole screen, put it in a **Panel (single card)** view.
2. **Add your background image.** On a card with no image, click the card: a dialog offers to **upload your plan** (PNG, JPG…) from your computer. The image is stored in Home Assistant, saved in the card, and the proportions are read from the image: nothing to calculate. You can also enter the address of an image already there, for example `/local/plan.png` for a file in `/config/www/`.
3. **Click "Créer la page « Plan » en un clic" (create the Plan page).** This button shows on a brand-new card, for administrators. It creates a **Plan** dashboard in the sidebar, with the card full screen, and takes you there: the address is `/plan-editable`. After that, one click on "Plan" in the sidebar is enough.
   (If you prefer to place the card yourself, save the dashboard and leave Home Assistant's own edit mode.)
4. **Click the pencil** at the top right of the card, then **+ New device**. Pick the entity in the panel, drag the bubble into place and click **Save**. The **Image de fond…** (background image) button in the toolbar lets you change the image at any time.

The pencil is only shown to administrator accounts. The same setup in YAML:

```yaml
type: custom:tile-placer-card
background: /local/plan.png
fit_screen: true
tiles: []
```

## Everyday use

Outside edit mode the card behaves like a normal dashboard card:

- **Tap**: runs the tap action. With no setting, a bubble linked to an entity opens the "more info" dialog.
- **Double tap**: runs the double tap action, when defined. In that case the single tap is delayed by 250 ms so the two can be told apart.
- **Hold**: runs the hold action (500 ms), when defined.
- **Hover**: the bubble name is shown (depending on the "Name display" setting).
- A bubble whose entity is active (on, open, running…) takes the accent colour or the chosen colour. A bubble whose entity is unavailable or missing is dimmed with a dashed outline.

## Editing the map

### Entering edit mode

Click the **pencil**. A dashed frame and a grid appear, and a toolbar shows under the map: **+ New device**, **Image de fond…** (upload or change the background image), **Save**, **Cancel** and a status message.

### Moving a bubble

Drag the bubble with the mouse or a finger. With a bubble focused or selected, arrow keys move it by 1 %, Shift + arrows by 5 %.

### Creating a device

Click **+ New device**. A 36 px bubble appears near the centre, on a free spot so it does not stack on another one, and its panel opens. First pick the **device** in the "Appareil" (device) drop-down: its first useful entity is selected for you and its name is reused. You can then change the entity. With no device, pick an entity directly. The entity icon is used until you choose one yourself. Then drag the bubble into place.

### Configuring a bubble

Click a bubble (without dragging it) to select it: a floating panel opens on the map and every change is shown **live** on the card.

| Setting | Effect |
|---|---|
| Name | Displayed text. With no name, the entity name is used. |
| Icon | MDI icon. With no icon, the entity icon is used. |
| Device | Drop-down of Home Assistant devices. Selects the device's main entity and reuses its name when the bubble has none. |
| Entity | Linked entity (state, more info, toggle…). |
| Name display | On hover and selection, always, or never. |
| Shape | Round, rounded square, square or rectangle. |
| Size (height) | Bubble size, 20 to 300 px. |
| Width | Rectangle shape only, 20 to 400 px. |
| Icon colour | CSS colour, theme variable, or colour picker. |
| Show state under the bubble | Adds the entity state under the bubble. |
| On / off colour | Only shown when the entity is a `switch`, a `light`, an `input_boolean` or a `fan`. A list of colours (yellow, orange, red, green, blue, purple, white, grey, black) or a custom colour. Default: yellow when on, grey when off. |
| Transparent background | Icon only, no background disc. |
| Actions | Tap, double tap, hold (see [Actions](#actions)). |
| Delete bubble | Removes the bubble after confirmation. |

**Resizing by hand:** a selected bubble shows a square handle at its bottom right. Drag it to grow or shrink the bubble (for a rectangle, width and height follow separately). The panel sliders do the same, more precisely.

Clicking an empty area of the map deselects the bubble.

### Saving or cancelling

- **Save** writes the bubbles into the dashboard and leaves edit mode. The button is only enabled when there are changes.
- **Cancel** discards unsaved changes, after confirmation.

Saving re-reads the dashboard configuration, finds this card by exact comparison with the configuration it was loaded with, replaces its `tiles` list and saves. If the card changed elsewhere in the meantime, or if the dashboard is in YAML mode, an error is shown and **nothing is written**. Back up your dashboard before the first save.

## YAML configuration

General settings (image, title, proportions, name display) are set in the card's visual editor or in YAML; the on-map edit mode manages the bubbles.

```yaml
type: custom:tile-placer-card
title: Ground floor
background: /local/plan.png
aspect_ratio: "1200:896"
fit_screen: true
label_mode: hover
tiles:
  - id: living
    x_pct: 30
    y_pct: 45
    icon: mdi:ceiling-light
    entity: light.living_room
    name: Living room
    size: 40
    color: "#ffa500"
    tap_action:
      action: toggle
    double_tap_action:
      action: more-info
```

More examples in [`examples/basic.yaml`](examples/basic.yaml).

### Card options

| Option | Description |
|---|---|
| `background` | Image URL (e.g. `/local/plan.png`). Optional. It must be reachable without an authorization header, so put it in `/config/www/`. |
| `aspect_ratio` | Optional. When omitted, the proportions are read from the background image. Otherwise `16:9`, `4/3`, `1.5` or `56.25%`; then use the real ratio of your image. With no image and no value: `16:9`. |
| `fit_screen` | `true`: the card is as large as possible without exceeding the screen height, aspect ratio kept. Best in a panel view. |
| `screen_offset` | Height in px removed from the screen height when `fit_screen` is on (default `150`). |
| `label_mode` | Default name display: `hover` (default), `always`, `never`. |
| `title` | Card title. Optional. |
| `editable` | `false` hides the pencil (default `true`). Editing also requires an administrator account. |
| `switch_path` | Address of another plan (e.g. `/my-dashboard/0`). Adds a button at the top left to switch to it. Optional. |
| `switch_label` | Text of the switch button. Optional. |
| `tiles` | List of bubbles. |

### Bubble options

| Option | Description |
|---|---|
| `id` | Unique id (generated when missing). |
| `x_pct`, `y_pct` | Centre of the bubble, 0 to 100 % of the card. |
| `icon` | MDI icon. When empty, the entity icon is used. |
| `entity` | Linked entity. Optional. |
| `name` | Displayed name. Falls back to the entity friendly name. |
| `shape` | `circle` (default), `rounded`, `square` or `rectangle`. |
| `size` | Bubble size (height) in px (default 48, 20 to 300). |
| `width` | Width in px, used only with `shape: rectangle` (default: 1.6 times `size`). |
| `color` | Any CSS colour or variable, applied to the icon (except for a `switch`, `light`, `input_boolean` or `fan`, see `color_on` and `color_off`). |
| `color_on`, `color_off` | For a `switch.*`, `light.*`, `input_boolean.*` or `fan.*` entity: icon colour when on and when off (default `#ffc107` yellow and `#9e9e9e` grey). |
| `label_mode` | `hover`, `always` or `never` for this bubble. |
| `show_state` | `true` shows the entity state under the bubble (default `false`). |
| `transparent` | `true`: icon only, no background. |
| `tap_action`, `double_tap_action`, `hold_action` | See [Actions](#actions). |

Coordinates are computed as `x_pct = (x + width/2) / image_width × 100`, and the same for `y_pct` with the height.

## Actions

Each bubble accepts three actions: `tap_action`, `double_tap_action` and `hold_action`.

| Action | Purpose | Fields |
|---|---|---|
| `none` | Does nothing. | |
| `more-info` | Opens the entity "more info" dialog. | `entity` (optional, defaults to the bubble's) |
| `toggle` | Toggles the entity. | `entity` (optional) |
| `call-service` | Calls a service (`perform_action` is accepted as a synonym of `service`). | `service` (`domain.service`), `data`, `target` |
| `navigate` | Goes to a dashboard page. | `navigation_path`, `navigation_replace` |
| `url` | Opens an address in a new tab. | `url_path` (`javascript:`, `data:` and `vbscript:` are refused) |

Rules:

- With no `tap_action`, a bubble linked to an entity opens "more info". In the panel this is called "Default". Choosing "None" forces no action instead.
- With no `double_tap_action` or `hold_action`, those gestures do nothing.
- In the edit panel, actions apply **live** as soon as they are complete. An incomplete action (service without `domain.service`, invalid JSON, missing path or URL) shows "Not applied yet" and is not written.

Example of a service call on hold:

```yaml
hold_action:
  action: call-service
  service: light.turn_on
  data:
    entity_id: light.living_room
    brightness_pct: 100
```

## Switching between an old plan and this card

If you already have a `picture-elements` plan and want to move between the two, link them with a button in each direction. Only the **last part of the address** depends on your dashboard (`/my-dashboard/0`, `/energy/plan`…): take your page's address from the browser bar.

- **From this card to the other plan**: set `switch_path` (the "Lien vers un autre plan" field of the visual editor):

  ```yaml
  type: custom:tile-placer-card
  switch_path: /my-dashboard/0
  switch_label: Old plan
  ```

- **From the `picture-elements` to this card**: add this element to the `picture-elements` card, with the address of the Tile Placer Card page:

  ```yaml
  - type: icon
    icon: mdi:pencil-ruler
    title: Editable plan
    style:
      top: 4%
      left: 3%
    tap_action:
      action: navigate
      navigation_path: /my-dashboard/plan-editable
  ```

## Tips

- **Big map.** Put the card alone in a **Panel** view with `fit_screen: true`. Adjust `screen_offset` if the card overflows or leaves too much margin.
- **Background image.** A file in `/config/www/` is served as `/local/`. Do not use `/media/`: those files need an authorization that an image tag does not send.
- **Image ratio.** Leave `aspect_ratio` empty: it is read from the image. If you set it by hand, divide the file width by its height; a wrong value shifts every bubble.
- **Name rather than state.** For a dense view, keep `show_state: false` and `label_mode: hover`, and enable the state only on useful sensors.
- **Several identical cards.** Add a distinguishing field such as `title` so saving knows which one to change.

## Known limitations

- Saving works **only** for dashboards in storage mode (edited from the UI), not YAML dashboards.
- The dashboard is deduced from the first URL segment (`/lovelace/...` = default dashboard). A card shown in another context (card editor preview, dialog) may not be able to save.
- Saving is refused when two cards of the dashboard are exactly identical.
- Actions are implemented inside the card (no native `handleAction`): no `confirmation`, `haptic` or `repeat`.
- The visual editor only covers general settings; bubbles are managed on the map.
- If `ha-icon-picker` or `ha-entity-picker` are not loaded yet (lazy Home Assistant components), the panel falls back to text fields.
- In edit mode, mouse and touch events from bubbles are stopped from reaching swipe-navigation modules such as `hass-swipe-navigation`, otherwise a drag could change the view instead of moving the bubble.
- Uploading the image uses Home Assistant's "Image" integration (enabled by default). It is limited to 10 MB; otherwise enter the address of a file in `/config/www/`.
- Touch devices and the Companion app: not tested.

## Troubleshooting

- **"Custom element doesn't exist" or empty card.** The resource is not loaded. Check Settings, Dashboards, Resources, then press Ctrl+F5.
- **Bubbles are not in the right place.** `aspect_ratio` does not match the real ratio of the image.
- **No pencil.** The account is not an administrator, or `editable: false` is set.
- **"Écart détecté" (drift) when saving.** The card changed in the dashboard since the page loaded. Reload the page and redo your changes.
- **Cannot drag a bubble.** A swipe module may be capturing the gesture. Check that you are in edit mode (dashed frame).
- **Background image does not show.** The file is not in `/config/www/` or the address is wrong. Try `/local/plan.png` in the browser.
- **An action does not respond.** Reopen the bubble panel: a "Not applied yet" message points to the field to fix. Remember to save afterwards.

Note: the card's interface and messages are currently in French.

## Development

No build step. Check the syntax with:

```bash
node --check tile-placer-card.js
```

To publish a version: bump `TPC_VERSION`, create a GitHub release containing `tile-placer-card.js`, then update in HACS.

## License

MIT
