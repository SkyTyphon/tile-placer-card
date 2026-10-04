# Contributing to Tile Placer Card

Thanks for your interest! Bug reports, ideas and pull requests are welcome, in English or French.

## Reporting a bug

Open an issue with the **Bug report** template. It helps a lot to include:

- the card version (shown in the browser console as `TILE-PLACER-CARD v…`, and in HACS);
- your Home Assistant version and browser (or the Companion app);
- the card YAML (remove anything private);
- the exact message shown in the red "Erreur du panneau" box, or the first red line of the browser console (F12, tab "Console").

Touch devices and the Companion app are not tested by the maintainer, so reports from them are especially useful.

## Suggesting a feature

Open an issue with the **Feature request** template and describe the problem you want to solve rather than only the solution. The card aims to stay a single file with no build step and no dependency.

## Development

The card is a single plain JavaScript file, `tile-placer-card.js`. There is no build step.

1. Fork and clone the repository.
2. Edit `tile-placer-card.js`.
3. Check the syntax:

   ```bash
   node --check tile-placer-card.js
   ```

4. Try it in Home Assistant: copy the file to `/config/www/`, add `/local/tile-placer-card.js?v=dev1` as a JavaScript module resource, and bump the `?v=` value after each change (Home Assistant caches `/local/` for a long time).

## Pull requests

- Keep each pull request focused on one change.
- Match the style of the surrounding code (no new dependency, no build tooling).
- Update `README.md` and `README_eng.md` when you change an option or a behaviour.
- Do not bump `TPC_VERSION` or create releases: the maintainer does that.
- Describe how you tested the change (browser, Home Assistant version).

## Code of conduct

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
