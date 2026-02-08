# Game Mechanics: Necromancer Island

## 1. Goal
In *Necromancer Island* you play a necromancer whose purpose is to disturb the natural balance. The game has no classic win condition. Failure happens when you lose systemic influence over the world—when your actions no longer cause meaningful changes in regions.

## 2. The World
The world is represented by a 2D grid (20x20). Each tile has a type and properties.

### 2.1 Terrain Types
- **Plain (Plain) ⬜**: Neutral terrain that other types can spread into.
- **Forest (Forest) 🌲**: Produces sustain.
- **Water (Water) 🌊**: Produces sustain.
- **Village (Village) 🏡**: Consumes sustain and has population.
- **City (City) 🏙️**: Consumes more sustain and has larger population.
- **Mountain (Mountain) ⛰️**: Impassable barrier, blocks sustain flow and region connectivity.

## 3. Ecosystem System (Local Equilibrium)

### 3.1 Sustain
Sustain represents food and water required to keep populations alive.
- **Production**: Forests and water generate sustain each turn.
- **Diffusion**: Sustain flows between adjacent cells (except mountains), tending toward balance.
- **Consumption**: Settlements (villages/cities) consume sustain based on population.

### 3.2 Stability and Population
- **Stability**: Represents the health of a cell. High stability supports growth; low stability causes decay. Visually, stability is shown by saturation/opacity.
- **Population**: Only villages and cities have population. When sustain is lacking, population dies off, increasing Death Severity.

### 3.3 Regions
The world is split into regions—groups of connected cells (water and mountains form boundaries). Each region aims for equilibrium:
- If sustain production ≥ demand, the region stabilizes.
- If production < demand, the region regresses (population and stability decline).

## 4. Player Actions (Necromancer)

As a necromancer you introduce local disturbances that break equilibrium:

1. **Kill (mouse click)**: Directly wipes population on a chosen cell and sharply drops stability. If the cell was a settlement, it becomes a plain.
2. **Death Source (Shift + D)**: Creates a temporary object (skull) that drains stability from neighboring cells for several turns and causes passive deaths.

## 5. Consequences and Necromancer Death

### 5.1 Death Severity
Each death (caused by the player or by famine) increases global Death Severity—your overall impact on the world.

### 5.2 Repression and Rebirth
If Death Severity crosses a critical threshold, the world “responds”—the necromancer is temporarily eliminated.
- **Time Skip**: While you are gone, the simulation accelerates. Regions rebalance without your interference. Some recover; others collapse further.
- **Return**: After several turns you return to a changed world and must re‑establish dominance.

## 6. Growth and Regression
- **Expansion**: If a cell has high stability and surplus sustain, it can expand into a neighboring plain:
  - **Forests**: Only expand within 3 tiles of water.
  - **Cities**: Only expand within 3 tiles of forests or water.
  - **Water**: Never expands.
- **Regression**:
  - Lack of sustain or low stability causes settlements to die out.
  - **Forests and Cities** with very low stability (<30%) can regress into plains.

## 7. Visual Information
The game does not show explicit numbers. All information is conveyed by observation:
- **Brightness/Clarity**: High stability.
- **Desaturation/Fading**: Collapse and low stability.
- **Density of elements**: Population size and activity.
