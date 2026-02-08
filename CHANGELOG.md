# Changelog

## 2026-02-08
### Added
- Game Over screen with restart flow.
- HP system: player (3 HP), NPC (2 HP), zombies (1 HP) with compact health bars that hide when full.
- NPC murder witness behavior: alerts, retaliation logic, and “UWAGA” indicator.
- NPC panic response: accelerate to allies when attacked, then engage the attacker’s faction.
- Zombie pursuit across local areas with travel-time delay and follow radius (5 tiles).

### Changed
- Zombies no longer leave graves.
- Collider obstacles are suppressed on local view borders to prevent edge spawns.

### Fixed
- Zombies are repositioned out of colliders on spawn/transfer and auto‑unstuck if trapped.
