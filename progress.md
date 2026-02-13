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
