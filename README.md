# Necromancer Island

A dark, minimalist ecosystem simulation on a 20x20 grid where you play a necromancer disrupting local equilibrium. There is no classic win condition; the game is about experimentation, observation, and the emergent collapse or recovery of regions after your interference.

## Highlights
- Dual view: world map (20x20) plus a dynamically generated local view (20x20).
- Sustain resource simulation with production, diffusion, and consumption.
- Stability drives expansion, regression, and visual feedback.
- Villages and cities form named agglomerations with shared identity.
- Necromancer actions: direct killing, raising zombies, and short‑lived Death Sources.
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
9. Region detection (local ecosystems).
10. UI refresh.

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

## Necromancer Actions
- Click on the world map: instantly kills population and drops stability on the selected cell.
- Shift + D: spawn a Death Source that drains nearby stability and kills a portion of population for a few turns.
- Game Mode (local view):
  - Hover an NPC in range to get a sword cursor, then click to kill (creates a grave).
  - Hover a grave in range to get a dark‑magic cursor, then click to raise a zombie.
  - Zombies move slower than the player, avoid obstacles, and attack nearby NPCs.

## Controls
- Click (world map): kill / disturb
- WASD: move in local view
- Shift + D: spawn Death Source
- F: toggle fullscreen
- Space: pause / resume
- Buttons I/II/V/X or keys 1–4: speed presets (1, 2, 5, 10 TPS)
- TPS slider: fine speed control (1–20 TPS)
Note: Pause stops world evolution (cities/forests/etc.), but local actions (player, NPCs, zombies) still run.

## UI Notes
- World map shows terrain types and stability via brightness/saturation.
- Local view renders a detailed vignette based on the current world cell.
- Hovering a village/city displays its name and highlights its whole agglomeration.
- World map panel displays the current area type plus the Local View tile under the player.
- If the current world cell is a village or city, its name is shown under the world map.

## Visual Reference
`visual-reference.html` lists:
- World map colors and emojis per terrain type.
- Local view base HSL colors, lightness variation, and emoji sets.

## Running the Game
Option 1: open `index.html` in a browser.

Option 2: run a local static server (example):
```bash
python -m http.server 8080
```
Then open `http://localhost:8080`.

## Configuration
Key parameters live in `CONFIG` in `script.js`, including:
- grid size, movement speed, TPS
- diffusion, consumption, expansion, regression rates
- stability thresholds

Terrain defaults are defined in `CELL_TYPES` in `script.js`.

## Limitations
- Repression / necromancer “death” is scaffolded but currently disabled (the `checkRepression()` function is empty).
- The local view is visual only and does not affect simulation logic.

## Project Structure
- `index.html` — layout and UI
- `style.css` — styling
- `script.js` — simulation and rendering
- `Mechanika_Gry.md`, `Design/` — design documentation

## License
No license specified yet. Add a LICENSE file if you want to open-source the project.

## Credits
Fonts from Google Fonts: Cinzel, Cinzel Decorative, Cormorant Garamond, Outfit.
