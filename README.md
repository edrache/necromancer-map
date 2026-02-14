# Necromancer Island

A dark, minimalist ecosystem simulation on a 20x20 grid where you play a necromancer disrupting local equilibrium. There is no classic win condition; the game is about experimentation, observation, and the emergent collapse or recovery of regions after your interference.

## Highlights
- Dual view: world map (20x20) plus a dynamically generated local view (20x20).
- Sustain resource simulation with production, diffusion, and consumption.
- Stability drives expansion, regression, and visual feedback.
- Villages and cities form named agglomerations with shared identity.
- Each city agglomeration maintains an adjacent cemetery that stores grave history.
- Necromancer actions: direct killing, raising zombies, and short‑lived Death Sources.
- Reactive NPCs with HP, panic behavior, and combat response.
- Time controls: pause, speed presets, and TPS slider.

## Story and Goal
You are a necromancer who breaks the natural balance. There is no victory screen. The goal is to explore how systems fail, stabilize, or overcorrect when you intervene.

## World
The world is a 20x20 grid. Each cell has a type, stability, sustain, and (for settlements) population.

Terrain types:
- Plain (PLAIN)
- Forest (FOREST)
- Water (WATER)
- Village (VILLAGE)
- City (CITY)
- Mountain (MOUNTAIN)

## Simulation (Turn Order)
Each turn runs in this order:
1. Update Death Sources.
2. Produce sustain (forests, water).
3. Diffuse sustain.
4. Update city group sizes.
5. Consume sustain.
6. Regression and expansion.
7. Forest regrowth.
8. City name updates after splits.
9. Cemetery sync with city clusters.
10. Cemetery grave growth update.
11. Region detection (local ecosystems).
12. UI refresh.

## Sustain, Population, Stability
- Forests and water generate sustain.
- Villages and cities consume sustain based on population and agglomeration size.
- Shortages reduce stability and kill population.
- High stability encourages expansion; low stability triggers regression (e.g., forests or cities can revert to plains).

## Cities, Names, and Erosion
- Neighboring villages and cities form named groups.
- Group size increases demand.
- Cities can burn nearby forests to survive, at a stability cost.
- Persistent shortages cause erosion (city → village → plain).

## Cemeteries and Graves
- Each named city/village cluster has exactly one cemetery tile adjacent to the cluster.
- Cemetery has its own grave emoji on the world map, but still belongs to the same city group for hover/highlight and city-name preview.
- Every year, cemetery grave history grows by:
  - `floor(cluster_size / CEMETERY_GRAVE_GROWTH_DIVISOR)` in aggregate (fractional progress is accumulated between years).
- Maximum cemetery capacity is `CEMETERY_MAX_GRAVES` (default: 200). After hitting the cap, no new graves are created.
- In Local View, cemetery graves are represented as dead NPC-like bodies (`hp = 0`) and can be raised into zombies with the same `Raise Zombie` action.

## Necromancer Actions
- Click on the world map: instantly kills population and drops stability on the selected cell.
- Shift + D: spawn a Death Source that drains nearby stability and kills a portion of population for a few turns.
- Game Mode (local view):
  - Hover an NPC in range to get a sword cursor, then click to kill (creates a grave).
  - Hover a grave in range to get a dark‑magic cursor, then click to raise a zombie.
  - Cemetery graves outside city tiles can also be raised to zombies.
  - Zombies move slower than the player, avoid obstacles, and attack nearby NPCs.
  - NPCs can witness murders and retaliate; “ALERT” appears above alerted NPCs.

## Controls
- Click (world map): kill / disturb
- WASD: move in local view
- Shift + D: spawn Death Source
- F: toggle fullscreen
- Space: pause / resume
- Buttons I/II/V/X or keys 1–4: speed presets (1, 2, 5, 10 TPS)
- TPS slider: fine speed control (1–20 TPS)
Note: 1 TPS = 1 year per second, and each simulation turn advances the world by one year. Pause stops world evolution (cities/forests/etc.), but local actions (player, NPCs, zombies) still run.

## UI Notes
- World map shows terrain types with fog of war; undiscovered tiles are hidden and use a subtle pattern.
- When the player dies, previously discovered tiles fade to 50% alpha until revisited.
- Local view renders a detailed vignette based on the current world cell.
- Hovering a village/city displays its name and highlights its whole agglomeration.
- Hovering a cemetery also displays and highlights its linked city agglomeration.
- World map panel displays the current area type plus the Local View tile under the player.
- If the current world cell is a village/city or a cemetery, its linked city name is shown under the world map.
- HP bars appear above player/NPCs when damaged and hide at full health.
- Player death triggers a sleep screen with a wake timer; time continues to pass.
- The current year and total kills (player + zombies) are displayed at the bottom of the screen (starts at year 1).
- On wake, the player appears on the nearest non-city tile to the death location; all zombies are destroyed.

## Visual Reference
`visual-reference.html` lists:
- World map colors and emojis per terrain type.
- Local view base HSL colors, lightness variation, and emoji sets.

## Running the Game
This project now uses ES modules, so it must be served over HTTP.

Run a local static server (example):
```bash
python -m http.server 8080
```
Then open `http://localhost:8080`.

## Configuration
Key parameters live in `CONFIG` in `src/config.js`, including:
- grid size, movement speed, TPS
- diffusion, consumption, expansion, regression rates
- stability thresholds
- cemetery growth and cap:
  - `CEMETERY_GRAVE_GROWTH_DIVISOR`
  - `CEMETERY_MAX_GRAVES`

Terrain defaults are defined in `CELL_TYPES` in `src/config.js`.

## Limitations
- Repression / necromancer “death” is scaffolded but currently disabled (the `checkRepression()` function is empty).
- The local view is visual only and does not affect simulation logic.

## Project Structure
- `index.html` — layout and UI
- `style.css` — styling
- `script.js` — module entry (bootstraps the game)
- `src/config.js` — configuration + static data tables
- `src/utils.js` — randomization + name helpers
- `src/entities.js` — `Cell`, `Region`, `DeathSource`
- `src/game.js` — simulation + rendering
- `src/main.js` — game initialization + test hooks
- `Mechanika_Gry.md`, `Design/` — design documentation
- `CHANGELOG.md` — release notes

## License
No license specified yet. Add a LICENSE file if you want to open-source the project.

## Credits
Fonts from Google Fonts: Cinzel, Cinzel Decorative, Cormorant Garamond, Outfit.
