# Changelog

## 2026-02-14
### Added
- City-cluster cemeteries: each named village/city cluster now gets one adjacent cemetery tile.
- Cemetery rendering on world map with dedicated grave emoji.
- Cemetery integration with city hover/highlight and city name preview.
- Configurable cemetery parameters in `src/config.js`:
  - `CEMETERY_GRAVE_GROWTH_DIVISOR`
  - `CEMETERY_MAX_GRAVES`
  - `CEMETERY_WORLD_EMOJIS`
  - `CEMETERY_LOCAL_GRAVE_EMOJIS`
- Cemetery summaries in `render_game_to_text` output (`cityName`, world position, grave count).
- New local context action: `Zombie Attack` for NPC and living animal targets.
- First configurable necromancy spell module: `src/spells.js` (`NECROMANCY_SPELLS`).
- First spell: `Ossuary Ascension 💀7` with hover preview overlays:
  - dashed magic-harvest radius,
  - solid zombie-raise radius,
  - highlighted raise targets.

### Changed
- Cemetery grave generation now accumulates fractional yearly progress, so very small clusters (size 1–2) also produce graves over time.
- Cemetery graves can be raised into zombies in Local View, including cemetery tiles outside city cells.
- README updated to document the cemetery system and the new configuration knobs.
- `Zombie Attack` is always shown in the NPC/animal context menu and becomes disabled when no living zombies are present in the same world area.
- `Zombie Attack` does not require target proximity to the player and orders all zombies from the area to focus the selected target.
- Spell action menu is now available directly on the necromancer (click player in Local View).
- Necromancy spell costs are computed from nearby dead NPC/graves, dead animals, and zombies.
- Spell source consumption now preserves raise-radius corpses when possible (uses other eligible sources first), preventing false "inactive" cases in cemetery scenarios.
- Spell naming and labels are now in English (`Ossuary Ascension`).

### Fixed
- Fixed edge case where small city clusters could fail to generate any graves even after many years.

## 2026-02-09
### Changed
- Refactored the core script into ES module files for easier maintenance and extension.
- `script.js` is now a lightweight entrypoint that boots the module graph.
- The game must be served over HTTP (e.g., `python -m http.server`) because of module loading rules.

## 2026-02-08
### Added
- Sleep screen with wake timer after player death.
- HP system: player (3 HP), NPC (2 HP), zombies (1 HP) with compact health bars that hide when full.
- NPC murder witness behavior: alerts, retaliation logic, and “ALERT” indicator.
- NPC panic response: accelerate to allies when attacked, then engage the attacker’s faction.
- Zombie pursuit across local areas with travel-time delay and follow radius (5 tiles).
- Year counter displayed at the bottom of the screen (starts at year 1).
- Kill counter (player + zombies) displayed next to the year.
- Player wakes after a number of years equal to total kills.
- World map fog of war with discovery state and patterned unrevealed tiles.

### Changed
- Zombies no longer leave graves.
- Collider obstacles are suppressed on local view borders to prevent edge spawns.
- Each simulation turn now advances the year; TPS indicates years per second.
- Player death now triggers a sleep period instead of game over; zombies are destroyed on sleep.
- Wake location is the nearest non-city tile (initial search radius 3, then expanding).
- UI warning label is now in English.
- Game mode is now the default view mode on start.
- Plains on the world map now render with the seedling emoji.

### Fixed
- Zombies are repositioned out of colliders on spawn/transfer and auto‑unstuck if trapped.
