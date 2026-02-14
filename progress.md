Original prompt: @[skills/skills-openai/skills/.curated/develop-web-game/SKILL.md] create web game using this documentation: @[Design/Necromancer_GameDesign.md] and @[Design/GDD/index.html]

## Progress

- [2026-02-08] Initialized project structure.
- [2026-02-08] Created `index.html`, `style.css`, and `script.js` skeleton.

## TODOs

- Implement core simulation loop.
- Implement region detection.
- Implement visuals.

## Updates

- [2026-02-13] Reworked `game mode` interactions in `src/game.js`:
  - movement remains on `WASD`/arrows,
  - mouse now highlights hovered object with a frame,
  - click opens a context menu with object-dependent actions.
- [2026-02-13] Added context action UI:
  - `index.html`: `#action-menu` container,
  - `style.css`: menu styles (`.action-menu`, `.action-menu-btn`, etc.).
- [2026-02-13] Implemented action mapping:
  - NPC / alive animal: `Attack` + `Look at`,
  - grave: `Raise Zombie` + `Look at`,
  - other map objects (terrain emoji, zombie, dead animal): `Look at`.
- [2026-02-13] Added short object descriptions shown in status text after `Look at` with timeout.
- [2026-02-13] Validation:
  - syntax check passed: `node --check src/game.js`,
  - Playwright skill client executed (canvas/state capture path works),
  - additional Playwright checks (headless) confirmed:
    - context menu opens on highlighted map objects,
    - at least one `Attack + Look at` menu appears on eligible targets,
    - `Look at` updates status with short object description.
- [2026-02-13] Interaction polish:
  - action buttons that are out of range are now rendered as visible but disabled in the context menu,
  - added persistent `LOG` panel under world info to store `Look at` observations with observed object emoji.

- [2026-02-14] Added cemetery system for city clusters:
  - `src/config.js`: introduced configurable cemetery parameters:
    - `CEMETERY_GRAVE_GROWTH_DIVISOR`,
    - `CEMETERY_MAX_GRAVES`,
    - `CEMETERY_WORLD_EMOJIS`,
    - `CEMETERY_LOCAL_GRAVE_EMOJIS`.
  - `src/game.js`: implemented city-cluster cemetery lifecycle:
    - each city cluster keeps exactly one adjacent cemetery tile,
    - cemetery is rendered as a dedicated grave emoji on the world map,
    - hovering a cemetery shows the city name and highlights city cluster + cemetery tile,
    - cemetery grave history grows each tick by `floor(clusterSize / divisor)` and is capped at 200.
  - `src/game.js`: integrated cemetery graves into Local View:
    - grave entities are stored as dead NPC-like bodies (`hp = 0`) and can be selected,
    - `Raise Zombie` works on cemetery graves in non-city tiles,
    - raising zombie from cemetery decrements cemetery grave stock.
  - `src/main.js`: `render_game_to_text` now includes cemetery summary (city, position, graves).
- [2026-02-14] Validation:
  - syntax checks passed:
    - `node --check src/config.js`
    - `node --check src/main.js`
    - `node --check src/game.js`
  - Playwright client run completed with screenshot + state capture.
  - Observed limitation: automatic run captured Local View canvas only; world-map cemetery emoji/highlight remains validated by code-path integration and text-state outputs.
- [2026-02-14] Cemetery growth fix for small clusters:
  - `src/game.js`: cemetery growth now accumulates fractional progress (`graveProgress += clusterSize / divisor`) and converts it to graves when it reaches full units.
  - Effect: clusters of size `1` and `2` now also create graves over time (instead of never producing any with per-tick `floor(size / divisor)`).
