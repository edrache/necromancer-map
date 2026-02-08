# Changelog

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
