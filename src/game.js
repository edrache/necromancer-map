import {
    ANIMAL_CATALOG,
    ANIMALS_BY_AREA,
    CEMETERY_LOCAL_GRAVE_EMOJIS,
    CEMETERY_WORLD_EMOJIS,
    CELL_TYPES,
    CONFIG,
    LOCAL_BASE_WEIGHTS,
    LOCAL_PEOPLE_EMOJIS,
    LOCAL_VIEW_COLORS,
    LOCAL_VIEW_EMOJI_DENSITY,
    LOCAL_VIEW_EMOJIS,
    WORLD_TYPE_LABELS
} from './config.js';
import {
    generateDerivedName,
    generateVillageName,
    hash01,
    pickFromWeights
} from './utils.js';
import { Cell, DeathSource, Region } from './entities.js';
import { NECROMANCY_SPELLS } from './spells.js';

export class Game {
    constructor() {
        this.worldCanvas = document.getElementById('world-canvas');
        this.viewCanvas = document.getElementById('view-canvas');
        this.worldCtx = this.worldCanvas.getContext('2d');
        this.viewCtx = this.viewCanvas.getContext('2d');
        this.grid = [];
        this.regions = [];
        this.deathSources = [];
        this.localGrids = new Map();
        this.localPeople = new Map();
        this.localAnimals = new Map();
        this.cemeteries = new Map();
        this.pendingZombieTransfers = [];
        this.pendingAnimalTransfers = [];
        this.isPaused = true;
        this.isSleeping = false;
        this.deathSeverity = 0;
        this.deathTurnsRemaining = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.hoveredGroup = null; // Array of {x, y} in currently hovered city/cemetery group
        this.hoveredObject = null;
        this.menuTargetObject = null;
        this.activeActionPreview = null;
        this.transientStatusText = '';
        this.transientStatusUntil = 0;
        this.tooltip = document.getElementById('city-tooltip');
        this.actionMenu = document.getElementById('action-menu');
        this.actionMenuTitle = document.getElementById('action-menu-title');
        this.actionMenuActions = document.getElementById('action-menu-actions');
        this.lookLogList = document.getElementById('look-log-list');
        this.lookLogEntries = [];
        this.gameOverScreen = document.getElementById('game-over-screen');

        this.tps = 1;
        this.year = 1;
        this.killCount = 0;
        this.sleepYearsRemaining = 0;
        this.deathWorldX = null;
        this.deathWorldY = null;
        this.started = false;
        this.worldCellSize = CONFIG.CELL_SIZE;
        this.viewCellSize = CONFIG.VIEW_CELL_SIZE;
        this.input = { up: false, down: false, left: false, right: false };
        this.viewMode = 'game';
        this.playerColliderRadius = 0.375; // in local cell units (75% diameter)
        this.player = {
            worldX: 0,
            worldY: 0,
            localX: 0,
            localY: 0,
            hp: 3,
            maxHp: 3
        };
        this.viewTransition = null;
        this.lastFrameTime = performance.now();
        this.animationClock = 0;

        this.initGrid();
        this.initSliders();
        this.initTimeControls();
        this.initUiToggle();
        this.initViewModeToggle();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        document.getElementById('start-btn').addEventListener('click', () => {
            this.initGrid(); // Re-initialize with current slider values
            this.spawnPlayer();
            this.player.hp = this.player.maxHp;
            this.year = 1;
            this.updateYearDisplay();
            this.started = true;
            this.start();
            document.getElementById('start-screen').classList.add('hidden');
        });

        // Interactions
        this.worldCanvas.addEventListener('mousedown', (e) => this.handleClick(e));
        this.worldCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.viewCanvas.addEventListener('mousemove', (e) => this.handleViewMouseMove(e));
        this.viewCanvas.addEventListener('mouseleave', () => this.clearViewHover());
        this.viewCanvas.addEventListener('mousedown', (e) => this.handleViewClick(e));
        document.addEventListener('mousedown', (e) => this.handleDocumentMouseDown(e));
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        this.render();
        this.startAnimationLoop();
        this.updateYearDisplay();
        this.renderLookLog();
    }

    initTimeControls() {
        const pauseBtn = document.getElementById('pause-btn');
        const tpsSlider = document.getElementById('tps-slider');
        const tpsDisplay = document.getElementById('tps-display');
        const speedBtns = document.querySelectorAll('.speed-btn');

        pauseBtn.addEventListener('click', () => this.togglePause());

        tpsSlider.addEventListener('input', () => {
            this.setSpeed(parseInt(tpsSlider.value));
        });

        speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setSpeed(parseInt(btn.dataset.speed));
            });
        });
    }

    initUiToggle() {
        const uiOverlay = document.getElementById('ui-overlay');
        const toggleBtn = document.getElementById('ui-toggle');

        if (!uiOverlay || !toggleBtn) return;

        toggleBtn.addEventListener('click', () => {
            const isCollapsed = uiOverlay.classList.toggle('collapsed');
            toggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
            toggleBtn.textContent = isCollapsed ? '▾' : '▴';
            this.resize();
        });
    }

    initViewModeToggle() {
        const buttons = Array.from(document.querySelectorAll('.mode-btn[data-view-mode]'));
        if (!buttons.length) return;
        buttons.forEach(btn => {
            btn.addEventListener('click', () => this.setViewMode(btn.dataset.viewMode));
        });
        this.syncViewModeUi();
    }

    setViewMode(mode) {
        if (mode !== 'god' && mode !== 'game') return;
        if (this.viewMode === mode) return;
        this.viewMode = mode;
        this.syncViewModeUi();
        this.clearViewHover();
        this.closeActionMenu();
        if (this.viewMode === 'game') {
            this.ensurePlayerPassable();
        }
    }

    syncViewModeUi() {
        const buttons = Array.from(document.querySelectorAll('.mode-btn[data-view-mode]'));
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.viewMode === this.viewMode);
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pause-btn');
        pauseBtn.innerText = this.isPaused ? '▶️' : '⏸';
        if (!this.isPaused) {
            this.gameLoop();
        }
    }

    setSpeed(tps) {
        this.tps = tps;
        document.getElementById('tps-slider').value = tps;
        document.getElementById('tps-display').innerText = `${tps} TPS`;

        // Update active class on buttons
        document.querySelectorAll('.speed-btn').forEach(btn => {
            if (parseInt(btn.dataset.speed) === tps) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    initSliders() {
        const sliders = {
            'slider-plain': 'PLAIN',
            'slider-forest': 'FOREST',
            'slider-water': 'WATER',
            'slider-city': 'CITY',
            'slider-mountain': 'MOUNTAIN'
        };

        Object.keys(sliders).forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener('input', () => {
                el.nextElementSibling.innerText = el.value;
            });
        });
    }

    initGrid() {
        this.localGrids.clear();
        this.localAnimals.clear();
        this.cemeteries.clear();
        const weights = {
            PLAIN: parseInt(document.getElementById('slider-plain').value),
            FOREST: parseInt(document.getElementById('slider-forest').value),
            WATER: parseInt(document.getElementById('slider-water').value),
            CITY: parseInt(document.getElementById('slider-city').value),
            MOUNTAIN: parseInt(document.getElementById('slider-mountain').value)
        };

        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

        // Normalize weights
        const normalizedWeights = {};
        let cumulative = 0;
        for (const type in weights) {
            cumulative += weights[type] / totalWeight;
            normalizedWeights[type] = cumulative;
        }

        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            this.grid[y] = [];
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                let type = 'PLAIN';
                const rand = Math.random();

                for (const t in normalizedWeights) {
                    if (rand <= normalizedWeights[t]) {
                        let selectedType = (t === 'CITY') ? 'VILLAGE' : t;

                        if (selectedType === 'VILLAGE') {
                            // Check neighbors to avoid placing cities too close
                            let tooClose = false;
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    const nx = x + dx;
                                    const ny = y + dy;
                                    // Check grid boundary and existing cells
                                    if (this.grid[ny] && this.grid[ny][nx]) {
                                        const n = this.grid[ny][nx];
                                        if (n.type === 'VILLAGE' || n.type === 'CITY') tooClose = true;
                                    }
                                }
                            }
                            type = tooClose ? 'PLAIN' : 'VILLAGE';
                        } else {
                            type = selectedType;
                        }
                        break;
                    }
                }

                const cell = new Cell(x, y, type);
                this.grid[y][x] = cell;
            }
        }

        // Group cities and assign names
        const visitedCity = new Set();
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (visitedCity.has(cell) || (cell.type !== 'VILLAGE' && cell.type !== 'CITY')) continue;

                const group = [];
                const queue = [cell];
                visitedCity.add(cell);
                const cityName = generateVillageName();

                while (queue.length > 0) {
                    const current = queue.shift();
                    current.cityName = cityName;
                    group.push(current);

                    const allNeighbors = this.getAllNeighbors(current.x, current.y);
                    allNeighbors.forEach(n => {
                        if (!visitedCity.has(n) && (n.type === 'VILLAGE' || n.type === 'CITY')) {
                            visitedCity.add(n);
                            queue.push(n);
                        }
                    });
                }
            }
        }
        this.detectRegions();
        this.syncCemeteriesWithCities();
    }

    discoverWorldCell(worldX, worldY) {
        const cell = this.grid[worldY]?.[worldX];
        if (!cell) return;
        cell.discovered = true;
        cell.discoveryAlpha = 1;
    }

    markDiscoveredStale() {
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (cell.discovered) {
                    cell.discoveryAlpha = 0.5;
                }
            }
        }
    }

    placePlayer(worldX, worldY, localX, localY) {
        this.player.worldX = worldX;
        this.player.worldY = worldY;
        this.player.localX = localX;
        this.player.localY = localY;
        this.discoverWorldCell(worldX, worldY);
    }

    resize() {
        const isStacked = window.innerWidth <= 1200;
        const maxPanelWidth = Math.min(window.innerWidth * (isStacked ? 0.92 : 0.42), 600);
        const maxPanelHeight = window.innerHeight * (isStacked ? 0.55 : 0.8);
        const viewCellSize = Math.floor(Math.min(
            maxPanelWidth / CONFIG.LOCAL_GRID_SIZE,
            maxPanelHeight / CONFIG.LOCAL_GRID_SIZE,
            CONFIG.VIEW_CELL_SIZE
        ));
        const worldMaxWidth = maxPanelWidth * 0.5;
        const worldMaxHeight = maxPanelHeight * 0.5;
        const worldCellSize = Math.floor(Math.min(
            worldMaxWidth / CONFIG.GRID_SIZE,
            worldMaxHeight / CONFIG.GRID_SIZE,
            CONFIG.CELL_SIZE * 0.5
        ));

        this.worldCellSize = Math.max(6, worldCellSize);
        this.viewCellSize = Math.max(10, viewCellSize);

        this.worldCanvas.width = CONFIG.GRID_SIZE * this.worldCellSize;
        this.worldCanvas.height = CONFIG.GRID_SIZE * this.worldCellSize;
        this.viewCanvas.width = CONFIG.LOCAL_GRID_SIZE * this.viewCellSize;
        this.viewCanvas.height = CONFIG.LOCAL_GRID_SIZE * this.viewCellSize;
    }

    start() {
        this.isPaused = false;
        this.gameLoop();
    }

    gameLoop() {
        if (this.isPaused) return;
        this.step();

        const delay = 1000 / this.tps;
        setTimeout(() => this.gameLoop(), delay);
    }

    step() {
        if (this.viewMode === 'game' && !this.isSleeping) {
            return;
        }
        this.cityErosionThisTurn = new Set();
        this.updateDeathSources();
        this.produceSustain();
        this.diffuseSustain();
        this.updateCityGroupSizes();
        this.consumeSustain();
        this.regressionExpansion();
        this.forestRegrowth();
        this.updateCityNamesOnSplit();
        this.syncCemeteriesWithCities();
        this.updateCemeteryGravesPerTick();
        this.detectRegions();
        this.checkRepression();
        this.year += 1;
        if (this.isSleeping) {
            this.sleepYearsRemaining = Math.max(0, this.sleepYearsRemaining - 1);
            if (this.sleepYearsRemaining === 0) {
                this.wakePlayer();
            }
        }
        this.updateYearDisplay();
    }

    updateYearDisplay() {
        const yearDisplay = document.getElementById('year-display');
        if (yearDisplay) {
            yearDisplay.textContent = `Year ${this.year} • Kills ${this.killCount}`;
        }
        this.updateSleepOverlay();
    }

    updateDeathSources() {
        for (let i = this.deathSources.length - 1; i >= 0; i--) {
            const ds = this.deathSources[i];
            ds.turnsLeft--;

            // Reduce stability and kill population nearby
            this.getNeighbors(ds.x, ds.y).forEach(n => {
                n.stability = Math.max(0, n.stability - 0.2);
                if (n.population > 0) {
                    const killCount = Math.ceil(n.population * 0.2);
                    n.population -= killCount;
                    this.deathSeverity += killCount;
                }
            });

            if (ds.turnsLeft <= 0) {
                this.deathSources.splice(i, 1);
            }
        }
    }

    produceSustain() {
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                cell.sustain += CELL_TYPES[cell.type].sustainProduce;
            }
        }
    }

    diffuseSustain() {
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (cell.type !== 'FOREST' && cell.type !== 'WATER') continue;

                let sum = cell.sustain;
                let count = 1;
                this.getNeighbors(x, y).forEach(n => {
                    if (n.type === 'FOREST' || n.type === 'WATER') {
                        sum += n.sustain;
                        count++;
                    }
                });
                cell.targetSustain = sum / count;
            }
        }
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (cell.type === 'FOREST' || cell.type === 'WATER') {
                    cell.sustain = cell.sustain * (1 - CONFIG.DIFFUSION_RATE) + cell.targetSustain * CONFIG.DIFFUSION_RATE;
                }
            }
        }
    }

    consumeSustain() {
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                const citySize = cell.citySize || 1;
                const sizeMultiplier = 1 + Math.max(0, citySize - 1) * CONFIG.CITY_SIZE_DEMAND_SCALE;
                const demand = cell.population * CONFIG.CONSUMPTION_RATE * sizeMultiplier;

                let remaining = demand;

                // Cities and villages draw sustain only from nearby forest/water (max distance 2).
                if (cell.type === 'VILLAGE' || cell.type === 'CITY') {
                    cell.sustain = 0;
                    remaining = this.pullSustainFromSources(cell, remaining);
                    if (remaining > 0 && cell.type === 'CITY') {
                        remaining = this.burnForestsForSurvival(cell, remaining);
                    }
                } else if (cell.sustain >= remaining) {
                    cell.sustain -= remaining;
                    remaining = 0;
                } else {
                    remaining -= cell.sustain;
                    cell.sustain = 0;
                }

                if (remaining <= 0) {
                    cell.stability = Math.min(1.0, cell.stability + CONFIG.STABILITY_REGEN);
                } else {
                    const deficit = remaining;
                    if (cell.population > 0) {
                        const deaths = Math.ceil(deficit * 0.5);
                        cell.population -= deaths;
                        this.deathSeverity += (deaths * 0.1);
                    }
                    cell.stability = Math.max(0, cell.stability - CONFIG.STABILITY_DECAY);
                    if (cell.type === 'CITY') {
                        this.erodeCityGroup(cell);
                    }
                }

                if (cell.population <= 0 && (cell.type === 'VILLAGE' || cell.type === 'CITY')) {
                    cell.type = 'PLAIN';
                    cell.population = 0;
                    cell.symbol = Math.random() < 0.5 ? ',' : '.';
                    cell.cityName = null;
                }
            }
        }
    }

    regressionExpansion() {
        // 1. Regression: forests or cities with low stability turn back into plains
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if ((cell.type === 'FOREST' || cell.type === 'CITY') && cell.stability < CONFIG.REGRESSION_THRESHOLD) {
                    if (Math.random() < 0.1) { // 10% chance per turn to regress
                        cell.type = 'PLAIN';
                        cell.population = 0;
                        cell.symbol = Math.random() < 0.5 ? ',' : '.';
                        cell.cityName = null;
                    }
                }
            }
        }

        // 2. Expansion
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];

                // Water never expands. Plains and Mountains don't expand.
                if (cell.type === 'WATER' || cell.type === 'PLAIN' || cell.type === 'MOUNTAIN') continue;

                if ((cell.type === 'VILLAGE' || cell.type === 'CITY') && (cell.citySize || 1) >= CONFIG.MAX_CITY_SIZE) {
                    continue;
                }

                if (cell.stability > CONFIG.EXPANSION_THRESHOLD) {
                    const neighbors = this.getNeighbors(x, y).filter(n => n.type === 'PLAIN');
                    if (neighbors.length > 0) {
                        const expansionChance = (cell.type === 'FOREST')
                            ? CONFIG.FOREST_EXPANSION_CHANCE
                            : CONFIG.CITY_EXPANSION_CHANCE;
                        if (Math.random() >= expansionChance) continue;
                        const target = neighbors[Math.floor(Math.random() * neighbors.length)];

                        // Check if any neighbor (including diagonals) has a DIFFERENT city name
                        let blockedByName = false;
                        const allNeighbors = this.getAllNeighbors(target.x, target.y);
                        for (const n of allNeighbors) {
                            if ((n.type === 'VILLAGE' || n.type === 'CITY') && n.cityName !== cell.cityName) {
                                blockedByName = true;
                                break;
                            }
                        }

                        if (blockedByName) continue;

                        let canExpand = true;
                        // Distance constraints
                        if (cell.type === 'FOREST') {
                            const sourceWaterDist = this.getMinDistanceToTypes(x, y, ['WATER']);
                            const targetWaterDist = this.getMinDistanceToTypes(target.x, target.y, ['WATER']);
                            if (sourceWaterDist > 3 || targetWaterDist > 3) {
                                canExpand = false;
                            }
                        } else if (cell.type === 'CITY' || cell.type === 'VILLAGE') {
                            if (!this.hasNearbyResourcePair(target.x, target.y, 2)) {
                                canExpand = false;
                            }
                        }

                        if (canExpand) {
                            target.type = cell.type;
                            target.population = (cell.type === 'VILLAGE' || cell.type === 'CITY') ? 5 : 0;
                            target.stability = 0.5;
                            target.cityName = cell.cityName;

                            if (cell.type === 'CITY') {
                                this.convertNearbyForestToPlain(target.x, target.y, 2);
                            }
                        }
                    }
                }
            }
        }
    }

    pullSustainFromSources(cell, amountNeeded) {
        if (amountNeeded <= 0) return 0;
        const sources = this.getCellsWithinDistance(cell.x, cell.y, 2, (c) =>
            c.type === 'FOREST' || c.type === 'WATER'
        );
        for (const source of sources) {
            if (amountNeeded <= 0) break;
            const take = Math.min(source.sustain, amountNeeded);
            if (source.type === 'FOREST') {
                source.sustain -= take;
            }
            amountNeeded -= take;
        }
        return amountNeeded;
    }

    burnForestsForSurvival(cell, amountNeeded) {
        if (amountNeeded <= 0) return 0;
        const forests = this.getCellsWithinDistance(cell.x, cell.y, 2, (c) => c.type === 'FOREST');
        while (amountNeeded > 0 && forests.length > 0) {
            const idx = Math.floor(Math.random() * forests.length);
            const target = forests.splice(idx, 1)[0];
            const yieldAmount = target.sustain + CONFIG.CITY_FOREST_BURN_SUSTAIN;
            amountNeeded = Math.max(0, amountNeeded - yieldAmount);
            target.type = 'PLAIN';
            target.population = 0;
            target.symbol = Math.random() < 0.5 ? ',' : '.';
            target.cityName = null;
            target.sustain = 0;
            cell.stability = Math.max(0, cell.stability - CONFIG.CITY_FOREST_BURN_STABILITY_COST);
        }
        return amountNeeded;
    }

    convertNearbyForestToPlain(x, y, maxDist) {
        const forests = this.getCellsWithinDistance(x, y, maxDist, (c) => c.type === 'FOREST');
        if (forests.length === 0) return;
        const target = forests[Math.floor(Math.random() * forests.length)];
        target.type = 'PLAIN';
        target.population = 0;
        target.symbol = Math.random() < 0.5 ? ',' : '.';
    }

    getCellsWithinDistance(x, y, maxDist, predicate) {
        const cells = [];
        for (let cy = 0; cy < CONFIG.GRID_SIZE; cy++) {
            for (let cx = 0; cx < CONFIG.GRID_SIZE; cx++) {
                const dist = Math.abs(cx - x) + Math.abs(cy - y);
                if (dist <= maxDist) {
                    const cell = this.grid[cy][cx];
                    if (!predicate || predicate(cell)) {
                        cells.push(cell);
                    }
                }
            }
        }
        return cells;
    }

    forestRegrowth() {
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (cell.type !== 'PLAIN') continue;
                if (!this.hasNearbyResourcePair(x, y, 2)) continue;
                if (Math.random() < CONFIG.FOREST_REGROWTH_CHANCE) {
                    cell.type = 'FOREST';
                    cell.population = 0;
                    cell.stability = 0.5;
                }
            }
        }
    }

    hasNearbyResourcePair(x, y, maxDist) {
        const nearby = this.getCellsWithinDistance(x, y, maxDist);
        let hasWater = false;
        let hasForest = false;
        for (const cell of nearby) {
            if (cell.type === 'WATER') hasWater = true;
            if (cell.type === 'FOREST') hasForest = true;
            if (hasWater && hasForest) return true;
        }
        return false;
    }

    erodeCityGroup(cell) {
        if (!cell.cityName) return;
        if (this.cityErosionThisTurn.has(cell.cityName)) return;
        const group = this.getCityGroup(cell);
        if (group.length <= 1) return;

        const groupSet = new Set(group);
        const edgeCells = group.filter(c => {
            const neighbors = this.getNeighbors(c.x, c.y);
            return neighbors.some(n => !groupSet.has(n));
        });

        if (edgeCells.length === 0) return;
        const target = edgeCells[Math.floor(Math.random() * edgeCells.length)];
        if (target.type === 'CITY') {
            target.type = 'VILLAGE';
            target.population = Math.min(target.population, 5);
            target.stability = Math.max(0, target.stability - CONFIG.CITY_EROSION_STABILITY_COST);
        } else if (target.type === 'VILLAGE') {
            target.type = 'PLAIN';
            target.population = 0;
            target.symbol = Math.random() < 0.5 ? ',' : '.';
            target.cityName = null;
        }
        this.cityErosionThisTurn.add(cell.cityName);
    }

    updateCityGroupSizes() {
        const visited = new Set();
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (cell.type === 'VILLAGE' || cell.type === 'CITY') {
                    cell.citySize = 1;
                } else {
                    cell.citySize = 0;
                }
            }
        }

        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (visited.has(cell) || (cell.type !== 'VILLAGE' && cell.type !== 'CITY') || !cell.cityName) continue;

                const queue = [cell];
                const group = [];
                visited.add(cell);

                while (queue.length > 0) {
                    const current = queue.shift();
                    group.push(current);
                    const neighbors = this.getAllNeighbors(current.x, current.y);
                    neighbors.forEach(n => {
                        if (!visited.has(n) && (n.type === 'VILLAGE' || n.type === 'CITY') && n.cityName === cell.cityName) {
                            visited.add(n);
                            queue.push(n);
                        }
                    });
                }

                const size = group.length;
                group.forEach(n => {
                    n.citySize = size;
                });
            }
        }
    }

    updateCityNamesOnSplit() {
        const visited = new Set();
        const componentsByName = new Map();
        const existingNames = new Set();

        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (!(cell.type === 'VILLAGE' || cell.type === 'CITY') || !cell.cityName) continue;
                existingNames.add(cell.cityName);
                if (visited.has(cell)) continue;

                const name = cell.cityName;
                const component = [];
                const queue = [cell];
                visited.add(cell);

                while (queue.length > 0) {
                    const current = queue.shift();
                    component.push(current);
                    const neighbors = this.getAllNeighbors(current.x, current.y);
                    neighbors.forEach(n => {
                        if (!visited.has(n) && (n.type === 'VILLAGE' || n.type === 'CITY') && n.cityName === name) {
                            visited.add(n);
                            queue.push(n);
                        }
                    });
                }

                if (!componentsByName.has(name)) componentsByName.set(name, []);
                componentsByName.get(name).push(component);
            }
        }

        componentsByName.forEach((components, name) => {
            if (components.length <= 1) return;

            const minSize = Math.min(...components.map(c => c.length));
            const candidates = components.filter(c => c.length === minSize);
            const target = candidates[Math.floor(Math.random() * candidates.length)];

            const newName = generateDerivedName(name, existingNames);
            existingNames.add(newName);
            target.forEach(cell => {
                cell.cityName = newName;
            });
        });
    }

    getMinDistanceToTypes(startX, startY, targetTypes) {
        let minDist = Infinity;
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                if (targetTypes.includes(this.grid[y][x].type)) {
                    const dist = Math.abs(x - startX) + Math.abs(y - startY);
                    if (dist < minDist) minDist = dist;
                }
            }
        }
        return minDist;
    }

    checkRepression() {
        return;
    }

    getCityClusters() {
        const visited = new Set();
        const clusters = [];
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const start = this.grid[y]?.[x];
                if (!start) continue;
                if (visited.has(start)) continue;
                if ((start.type !== 'VILLAGE' && start.type !== 'CITY') || !start.cityName) continue;

                const queue = [start];
                const cells = [];
                visited.add(start);
                while (queue.length > 0) {
                    const current = queue.shift();
                    cells.push(current);
                    const neighbors = this.getAllNeighbors(current.x, current.y);
                    neighbors.forEach((n) => {
                        if (visited.has(n)) return;
                        if ((n.type !== 'VILLAGE' && n.type !== 'CITY') || n.cityName !== start.cityName) return;
                        visited.add(n);
                        queue.push(n);
                    });
                }
                clusters.push({ cityName: start.cityName, cells });
            }
        }
        return clusters;
    }

    syncCemeteriesWithCities() {
        const clusters = this.getCityClusters();
        const next = new Map();

        for (const cluster of clusters) {
            let cemetery = this.cemeteries.get(cluster.cityName);
            if (!cemetery) {
                cemetery = {
                    cityName: cluster.cityName,
                    x: -1,
                    y: -1,
                    worldEmoji: CEMETERY_WORLD_EMOJIS[Math.floor(Math.random() * CEMETERY_WORLD_EMOJIS.length)] || '🪦',
                    graveEmoji: CEMETERY_LOCAL_GRAVE_EMOJIS[Math.floor(Math.random() * CEMETERY_LOCAL_GRAVE_EMOJIS.length)] || '🪦',
                    graveCount: 0,
                    graveProgress: 0,
                    clusterSize: cluster.cells.length
                };
            } else {
                cemetery.cityName = cluster.cityName;
                cemetery.clusterSize = cluster.cells.length;
                if (!Number.isFinite(cemetery.graveProgress)) {
                    cemetery.graveProgress = 0;
                }
            }

            if (!this.isCemeteryPlacementValid(cemetery, cluster)) {
                const spot = this.findCemeteryPlacement(cluster);
                if (spot) {
                    cemetery.x = spot.x;
                    cemetery.y = spot.y;
                }
            }
            next.set(cluster.cityName, cemetery);
        }

        this.cemeteries = next;
        this.cleanupOrphanedCemeteryGraves();
        for (const cemetery of this.cemeteries.values()) {
            this.syncCemeteryLocalGraves(cemetery);
        }
    }

    updateCemeteryGravesPerTick() {
        if (!this.cemeteries.size) return;
        for (const cemetery of this.cemeteries.values()) {
            const size = Math.max(0, cemetery.clusterSize || 0);
            const divisor = Math.max(1, CONFIG.CEMETERY_GRAVE_GROWTH_DIVISOR);
            const maxGraves = Math.max(0, CONFIG.CEMETERY_MAX_GRAVES);
            if ((cemetery.graveCount || 0) >= maxGraves) {
                cemetery.graveProgress = 0;
                continue;
            }
            cemetery.graveProgress = (cemetery.graveProgress || 0) + (size / divisor);
            const growth = Math.floor(cemetery.graveProgress);
            if (growth <= 0) continue;
            cemetery.graveCount = Math.min(maxGraves, (cemetery.graveCount || 0) + growth);
            cemetery.graveProgress -= growth;
            this.syncCemeteryLocalGraves(cemetery);
        }
    }

    getCemeteryAt(x, y) {
        for (const cemetery of this.cemeteries.values()) {
            if (cemetery.x === x && cemetery.y === y) {
                return cemetery;
            }
        }
        return null;
    }

    isCemeteryPlacementValid(cemetery, cluster) {
        if (!cemetery || cemetery.x < 0 || cemetery.y < 0) return false;
        const cell = this.grid[cemetery.y]?.[cemetery.x];
        if (!cell) return false;
        if (cell.type === 'VILLAGE' || cell.type === 'CITY') return false;
        return this.isCellAdjacentToCluster(cemetery.x, cemetery.y, cluster);
    }

    isCellAdjacentToCluster(x, y, cluster) {
        for (const cityCell of cluster.cells) {
            const dist = Math.abs(cityCell.x - x) + Math.abs(cityCell.y - y);
            if (dist === 1) return true;
        }
        return false;
    }

    findCemeteryPlacement(cluster) {
        const preferred = [];
        const fallback = [];
        const seen = new Set();
        for (const cityCell of cluster.cells) {
            for (const neighbor of this.getNeighbors(cityCell.x, cityCell.y)) {
                const key = `${neighbor.x},${neighbor.y}`;
                if (seen.has(key)) continue;
                seen.add(key);
                if (neighbor.type === 'VILLAGE' || neighbor.type === 'CITY') continue;
                if (neighbor.type === 'WATER' || neighbor.type === 'MOUNTAIN') {
                    fallback.push({ x: neighbor.x, y: neighbor.y });
                } else {
                    preferred.push({ x: neighbor.x, y: neighbor.y });
                }
            }
        }
        const choices = preferred.length ? preferred : fallback;
        if (!choices.length) return null;
        return choices[Math.floor(Math.random() * choices.length)];
    }

    getCityClusterByName(cityName) {
        if (!cityName) return null;
        const clusters = this.getCityClusters();
        for (const cluster of clusters) {
            if (cluster.cityName === cityName) return cluster;
        }
        return null;
    }

    getHoveredGroupForCity(cityName) {
        if (!cityName) return null;
        const cluster = this.getCityClusterByName(cityName);
        if (!cluster) return null;
        const coords = cluster.cells.map((cell) => ({ x: cell.x, y: cell.y }));
        const cemetery = this.cemeteries.get(cityName);
        if (cemetery) {
            coords.push({ x: cemetery.x, y: cemetery.y });
        }
        return coords;
    }

    syncCemeteryLocalGraves(cemetery) {
        if (!cemetery) return;
        const cell = this.grid[cemetery.y]?.[cemetery.x];
        if (!cell) return;
        const people = this.ensureLocalPeopleEntry(cemetery.x, cemetery.y, cell.type);
        const desired = Math.max(0, Math.min(CONFIG.CEMETERY_MAX_GRAVES, cemetery.graveCount || 0));

        const existing = people.filter((person) =>
            person.originCemetery === true && person.isDead && !person.isZombie && !person.hideGrave
        );

        if (existing.length > desired) {
            let toRemove = existing.length - desired;
            for (let i = people.length - 1; i >= 0 && toRemove > 0; i--) {
                const person = people[i];
                if (person.originCemetery !== true) continue;
                if (!person.isDead || person.isZombie || person.hideGrave) continue;
                people.splice(i, 1);
                toRemove -= 1;
            }
        } else if (existing.length < desired) {
            const toAdd = desired - existing.length;
            for (let i = 0; i < toAdd; i++) {
                people.push(this.createCemeteryGrave(cemetery, people.length + i));
            }
        }
    }

    cleanupOrphanedCemeteryGraves() {
        for (const [key, entry] of this.localPeople.entries()) {
            if (!entry || !Array.isArray(entry.people) || !entry.people.length) continue;
            const nextPeople = entry.people.filter((person) => {
                if (!person || person.originCemetery !== true) return true;
                if (!person.isDead || person.isZombie || person.hideGrave) return true;
                const cemetery = this.cemeteries.get(person.cemeteryCityName);
                if (!cemetery) return false;
                return key === `${cemetery.x},${cemetery.y}`;
            });
            entry.people = nextPeople;
            if (!entry.people.length && entry.count === 0) {
                this.localPeople.set(key, entry);
            }
        }
    }

    createCemeteryGrave(cemetery, seedOffset) {
        const seedBase = Math.floor(hash01(cemetery.x, cemetery.y, this.year, seedOffset, 9023) * 1000000) || 1;
        const rng = this.buildSeededRng(seedBase);
        let spawn = this.findRandomWalkableLocalCellWithRng(cemetery.x, cemetery.y, this.getLocalGrid(cemetery.x, cemetery.y), rng)
            || { x: (CONFIG.LOCAL_GRID_SIZE - 1) / 2, y: (CONFIG.LOCAL_GRID_SIZE - 1) / 2 };
        const nearest = this.findNearestValidLocalCell(cemetery.x, cemetery.y, spawn.x, spawn.y);
        if (nearest) {
            spawn = { x: nearest.localX, y: nearest.localY };
        }
        return {
            x: spawn.x,
            y: spawn.y,
            tx: spawn.x,
            ty: spawn.y,
            hasTarget: false,
            idle: 999,
            speed: 0,
            seed: seedBase,
            id: seedBase + seedOffset + Math.floor(Math.random() * 1000),
            bobPhase: 0,
            random: rng,
            type: 'CEMETERY',
            emoji: '🧟',
            isDead: true,
            graveEmoji: cemetery.graveEmoji || '🪦',
            isZombie: false,
            alertTimer: 0,
            angryTimer: 0,
            targetId: null,
            aggroTargetId: null,
            aggressionMode: null,
            hp: 0,
            maxHp: 1,
            attackCooldown: 0,
            baseSpeed: 0,
            fleeToAllies: false,
            lastAttackerType: null,
            hideGrave: false,
            commandTargetType: null,
            commandTargetId: null,
            originCemetery: true,
            cemeteryCityName: cemetery.cityName
        };
    }

    getNeighbors(x, y) {
        const neighbors = [];
        const offsets = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        offsets.forEach(([ox, oy]) => {
            const nx = x + ox;
            const ny = y + oy;
            if (nx >= 0 && nx < CONFIG.GRID_SIZE && ny >= 0 && ny < CONFIG.GRID_SIZE) {
                neighbors.push(this.grid[ny][nx]);
            }
        });
        return neighbors;
    }

    getAllNeighbors(x, y) {
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < CONFIG.GRID_SIZE && ny >= 0 && ny < CONFIG.GRID_SIZE) {
                    neighbors.push(this.grid[ny][nx]);
                }
            }
        }
        return neighbors;
    }

    detectRegions() {
        const visited = new Set();
        this.regions = [];
        let regionIdCounter = 0;

        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (visited.has(cell) || cell.type === 'MOUNTAIN' || cell.type === 'WATER') continue;

                const region = new Region();
                region.id = regionIdCounter++;
                const queue = [cell];
                visited.add(cell);

                while (queue.length > 0) {
                    const current = queue.shift();
                    region.cells.push(current);

                    this.getNeighbors(current.x, current.y).forEach(n => {
                        if (!visited.has(n) && n.type !== 'MOUNTAIN' && n.type !== 'WATER') {
                            visited.add(n);
                            queue.push(n);
                        }
                    });
                }
                region.calculateMetrics();
                let stabilitySum = 0;
                region.cells.forEach((regionCell) => {
                    regionCell.regionId = region.id;
                    stabilitySum += regionCell.stability;
                });
                region.stability = region.cells.length > 0 ? (stabilitySum / region.cells.length) : 1.0;
                this.regions.push(region);
            }
        }
    }

    updateUI() {
        const status = document.getElementById('game-status');
        const now = performance.now();
        if (this.transientStatusText && now <= this.transientStatusUntil) {
            status.innerText = this.transientStatusText;
            return;
        }
        if (this.transientStatusText && now > this.transientStatusUntil) {
            this.transientStatusText = '';
            this.transientStatusUntil = 0;
        }
        if (this.isSleeping) {
            const remaining = this.sleepYearsRemaining;
            status.innerText = `You were slain. Dreaming... Wake in ${remaining} year${remaining === 1 ? '' : 's'}.`;
            return;
        }
        if (this.regions.length > 0) {
            let totalCells = 0;
            let globalStabilitySum = 0;
            this.regions.forEach((region) => {
                totalCells += region.cells.length;
                globalStabilitySum += region.stability * region.cells.length;
            });
            const globalStability = totalCells > 0 ? (globalStabilitySum / totalCells) : 1.0;

            const playerCell = this.grid[this.player.worldY]?.[this.player.worldX] || null;
            let localStability = null;
            if (playerCell && typeof playerCell.regionId === 'number' && playerCell.regionId >= 0) {
                const region = this.regions[playerCell.regionId];
                if (region) localStability = region.stability;
            }

            const localText = (localStability === null)
                ? 'Local Stability: -'
                : `Local Stability: ${Math.round(localStability * 100)}%`;

            status.innerText = `Global Stability: ${Math.round(globalStability * 100)}% | ${localText} | Regions: ${this.regions.length} | Severity: ${Math.floor(this.deathSeverity)}`;
        }
    }

    updateWorldInfo() {
        const typeEl = document.getElementById('world-info-type');
        const localEl = document.getElementById('world-info-local');
        const cityEl = document.getElementById('world-info-city');
        if (!typeEl || !localEl || !cityEl) return;
        const cell = this.grid[this.player.worldY] && this.grid[this.player.worldY][this.player.worldX]
            ? this.grid[this.player.worldY][this.player.worldX]
            : null;

        if (!cell) {
            typeEl.textContent = "Area: -";
            localEl.textContent = "Local Tile: -";
            cityEl.textContent = "Name: -";
            cityEl.classList.add('is-hidden');
            return;
        }

        const label = WORLD_TYPE_LABELS[cell.type] || cell.type;
        typeEl.textContent = `Area: ${label}`;

        const localGrid = this.getLocalGrid(this.player.worldX, this.player.worldY);
        const localX = Math.max(0, Math.min(CONFIG.LOCAL_GRID_SIZE - 1, Math.floor(this.player.localX)));
        const localY = Math.max(0, Math.min(CONFIG.LOCAL_GRID_SIZE - 1, Math.floor(this.player.localY)));
        const localType = localGrid?.[localY]?.[localX] || "PLAIN";
        const localLabel = WORLD_TYPE_LABELS[localType] || localType;
        localEl.textContent = `Local Tile: ${localLabel}`;

        const cemetery = this.getCemeteryAt(this.player.worldX, this.player.worldY);
        if (cell.type === 'CITY' || cell.type === 'VILLAGE' || cemetery) {
            const name = cemetery?.cityName || cell.cityName || "Unknown";
            cityEl.textContent = `Name: ${name}`;
            cityEl.classList.remove('is-hidden');
        } else {
            cityEl.textContent = "Name: -";
            cityEl.classList.add('is-hidden');
        }
    }

    render() {
        this.renderWorld();
        this.renderView();
        this.updateWorldInfo();
        this.updateUI();
    }

    renderWorld() {
        this.worldCtx.clearRect(0, 0, this.worldCanvas.width, this.worldCanvas.height);
        const revealAll = this.viewMode === 'god';

        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                const px = x * this.worldCellSize;
                const py = y * this.worldCellSize;

                if (!cell.discovered && !revealAll) {
                    this.worldCtx.save();
                    this.worldCtx.globalAlpha = 1.0;
                    this.worldCtx.fillStyle = '#050505';
                    this.worldCtx.fillRect(px, py, this.worldCellSize, this.worldCellSize);
                    this.worldCtx.globalAlpha = 0.25;
                    this.worldCtx.strokeStyle = '#1b1b1b';
                    this.worldCtx.lineWidth = Math.max(1, this.worldCellSize * 0.08);
                    this.worldCtx.beginPath();
                    for (let i = -1; i <= 3; i++) {
                        const offset = i * (this.worldCellSize * 0.45);
                        this.worldCtx.moveTo(px + offset, py);
                        this.worldCtx.lineTo(px + offset + this.worldCellSize, py + this.worldCellSize);
                    }
                    this.worldCtx.stroke();
                    this.worldCtx.restore();
                    continue;
                }

                const typeData = CELL_TYPES[cell.type];
                this.worldCtx.globalAlpha = revealAll ? 1 : Math.max(0.1, cell.discoveryAlpha || 1);
                this.worldCtx.fillStyle = typeData.color;
                this.worldCtx.fillRect(px, py, this.worldCellSize, this.worldCellSize);

                this.worldCtx.font = `${this.worldCellSize * 0.7}px "Cormorant Garamond"`;
                this.worldCtx.textAlign = 'center';
                this.worldCtx.textBaseline = 'middle';
                this.worldCtx.fillStyle = '#ffffff';
                this.worldCtx.fillText(typeData.emoji, px + this.worldCellSize * 0.5, py + this.worldCellSize * 0.5);
            }
        }

        this.worldCtx.globalAlpha = 1.0;

        for (const cemetery of this.cemeteries.values()) {
            const cell = this.grid[cemetery.y]?.[cemetery.x];
            if (!cell) continue;
            const revealAll = this.viewMode === 'god';
            if (!revealAll && !cell.discovered) continue;
            this.worldCtx.font = `${this.worldCellSize * 0.62}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Cormorant Garamond"`;
            this.worldCtx.textAlign = 'center';
            this.worldCtx.textBaseline = 'middle';
            this.worldCtx.fillStyle = '#ffffff';
            this.worldCtx.fillText(
                cemetery.worldEmoji || '🪦',
                (cemetery.x + 0.5) * this.worldCellSize,
                (cemetery.y + 0.5) * this.worldCellSize
            );
        }

        // Render Death Sources
        this.deathSources.forEach(ds => {
            this.worldCtx.font = `${this.worldCellSize * 0.5}px Arial`;
            this.worldCtx.globalAlpha = 1.0;
            this.worldCtx.fillText('💀', (ds.x + 0.5) * this.worldCellSize, (ds.y + 0.5) * this.worldCellSize);
        });

        // Render hovered city group highlight
        if (this.hoveredGroup && this.hoveredGroup.length > 0) {
            this.worldCtx.strokeStyle = '#2efcaf';
            this.worldCtx.lineWidth = 2;
            this.worldCtx.setLineDash([4, 4]); // Magical dashed line
            this.worldCtx.beginPath();

            const keyFor = (x, y) => `${x},${y}`;
            const groupSet = new Set(this.hoveredGroup.map((cell) => keyFor(cell.x, cell.y)));
            this.hoveredGroup.forEach(cell => {
                const neighbors = [
                    { dx: 0, dy: -1, edge: 'top' },
                    { dx: 0, dy: 1, edge: 'bottom' },
                    { dx: -1, dy: 0, edge: 'left' },
                    { dx: 1, dy: 0, edge: 'right' }
                ];

                neighbors.forEach(n => {
                    const nx = cell.x + n.dx;
                    const ny = cell.y + n.dy;
                    let isEdge = false;
                    if (nx < 0 || nx >= CONFIG.GRID_SIZE || ny < 0 || ny >= CONFIG.GRID_SIZE) {
                        isEdge = true;
                    } else if (!groupSet.has(keyFor(nx, ny))) {
                        isEdge = true;
                    }

                    if (isEdge) {
                        const x = cell.x * this.worldCellSize;
                        const y = cell.y * this.worldCellSize;
                        const s = this.worldCellSize;

                        if (n.edge === 'top') { this.worldCtx.moveTo(x, y); this.worldCtx.lineTo(x + s, y); }
                        else if (n.edge === 'bottom') { this.worldCtx.moveTo(x, y + s); this.worldCtx.lineTo(x + s, y + s); }
                        else if (n.edge === 'left') { this.worldCtx.moveTo(x, y); this.worldCtx.lineTo(x, y + s); }
                        else if (n.edge === 'right') { this.worldCtx.moveTo(x + s, y); this.worldCtx.lineTo(x + s, y + s); }
                    }
                });
            });
            this.worldCtx.stroke();
            this.worldCtx.setLineDash([]); // Reset
        }

        if (this.started) {
            const cellX = this.player.worldX * this.worldCellSize;
            const cellY = this.player.worldY * this.worldCellSize;
            const inset = Math.max(2, this.worldCellSize * 0.08);

            this.worldCtx.globalAlpha = 1.0;
            this.worldCtx.strokeStyle = '#22c55e';
            this.worldCtx.lineWidth = Math.max(2, this.worldCellSize * 0.08);
            this.worldCtx.strokeRect(
                cellX + inset,
                cellY + inset,
                this.worldCellSize - inset * 2,
                this.worldCellSize - inset * 2
            );
        }

        this.worldCtx.globalAlpha = 1.0;
    }

    renderView() {
        this.viewCtx.clearRect(0, 0, this.viewCanvas.width, this.viewCanvas.height);
        this.viewCtx.fillStyle = '#060608';
        this.viewCtx.fillRect(0, 0, this.viewCanvas.width, this.viewCanvas.height);
        if (!this.started) return;

        const sizePx = CONFIG.LOCAL_GRID_SIZE * this.viewCellSize;
        let offsetX = 0;
        let offsetY = 0;

        if (this.viewTransition && this.viewTransition.active) {
            const progress = this.viewTransition.progress;
            const dx = this.viewTransition.dx;
            const dy = this.viewTransition.dy;
            const shift = progress * sizePx;

            offsetX = dx * (sizePx - shift);
            offsetY = dy * (sizePx - shift);

            this.drawLocalGrid(this.viewTransition.fromX, this.viewTransition.fromY, -dx * shift, -dy * shift);
            this.drawLocalAnimals(this.viewTransition.fromX, this.viewTransition.fromY, -dx * shift, -dy * shift);
            this.drawLocalPeople(this.viewTransition.fromX, this.viewTransition.fromY, -dx * shift, -dy * shift);
            this.drawLocalGrid(this.viewTransition.toX, this.viewTransition.toY, offsetX, offsetY);
            this.drawLocalAnimals(this.viewTransition.toX, this.viewTransition.toY, offsetX, offsetY);
            this.drawLocalPeople(this.viewTransition.toX, this.viewTransition.toY, offsetX, offsetY);
        } else {
            this.drawLocalGrid(this.player.worldX, this.player.worldY, 0, 0);
            this.drawLocalAnimals(this.player.worldX, this.player.worldY, 0, 0);
            this.drawLocalPeople(this.player.worldX, this.player.worldY, 0, 0);
        }

        if (this.viewMode === 'game') {
            this.drawActionPreviewOverlay(offsetX, offsetY);
            this.drawObjectSelectionFrame(offsetX, offsetY);
        }

        const playerPx = (this.player.localX + 0.5) * this.viewCellSize + offsetX;
        const playerPy = (this.player.localY + 0.5) * this.viewCellSize + offsetY;
        const radius = Math.max(6, this.viewCellSize * 0.28);

        if (this.viewMode === 'game') {
            const fontSize = Math.max(14, this.viewCellSize * 0.75);
            this.viewCtx.save();
            this.viewCtx.globalAlpha = 1.0;
            this.viewCtx.textAlign = 'center';
            this.viewCtx.textBaseline = 'middle';
            this.viewCtx.font = `${fontSize}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Cormorant Garamond"`;
            this.viewCtx.lineWidth = Math.max(2, fontSize * 0.12);
            this.viewCtx.strokeStyle = 'rgba(8, 10, 20, 0.95)';
            this.viewCtx.strokeText('🧙‍♂️', playerPx, playerPy);
            this.viewCtx.shadowColor = 'rgba(34, 197, 94, 0.7)';
            this.viewCtx.shadowBlur = Math.max(3, fontSize * 0.25);
            this.viewCtx.fillText('🧙‍♂️', playerPx, playerPy);
            const underlineWidth = Math.max(12, fontSize * 0.9);
            const underlineY = playerPy + fontSize * 0.55;
            this.viewCtx.shadowBlur = 0;
            this.viewCtx.lineWidth = Math.max(2, fontSize * 0.1);
            this.viewCtx.strokeStyle = 'rgba(226, 212, 183, 0.9)';
            this.viewCtx.beginPath();
            this.viewCtx.moveTo(playerPx - underlineWidth / 2, underlineY);
            this.viewCtx.lineTo(playerPx + underlineWidth / 2, underlineY);
            this.viewCtx.stroke();
            this.viewCtx.restore();
        } else {
            this.viewCtx.fillStyle = '#f8fafc';
            this.viewCtx.beginPath();
            this.viewCtx.arc(playerPx, playerPy, radius, 0, Math.PI * 2);
            this.viewCtx.fill();
            this.viewCtx.strokeStyle = '#22c55e';
            this.viewCtx.lineWidth = 2;
            this.viewCtx.stroke();
        }

        const hpBarWidth = this.viewCellSize * 0.7;
        const hpBarHeight = Math.max(2, this.viewCellSize * 0.1);
        const hpOffset = this.viewMode === 'game' ? this.viewCellSize * 0.55 : this.viewCellSize * 0.5;
        this.drawHpBar(playerPx, playerPy - hpOffset, hpBarWidth, hpBarHeight, this.player.hp, this.player.maxHp, '#22c55e', true);
    }

    drawLocalGrid(worldX, worldY, offsetX, offsetY) {
        const grid = this.getLocalGrid(worldX, worldY);
        const showObstacles = this.viewMode === 'game';
        for (let y = 0; y < CONFIG.LOCAL_GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.LOCAL_GRID_SIZE; x++) {
                const type = grid[y][x];
                const px = x * this.viewCellSize + offsetX;
                const py = y * this.viewCellSize + offsetY;
                const colorBase = LOCAL_VIEW_COLORS[type] || LOCAL_VIEW_COLORS.PLAIN;
                const colorSeed = hash01(worldX, worldY, x, y, 17);
                const lightness = Math.max(
                    10,
                    Math.min(22, colorBase.l + (colorSeed - 0.5) * colorBase.v)
                );
                const color = `hsl(${colorBase.h}, ${colorBase.s}%, ${lightness}%)`;
                const emojiInfo = this.getLocalCellEmojiInfo(worldX, worldY, x, y, type);
                const showEmoji = emojiInfo.showEmoji;
                const symbol = emojiInfo.symbol;

                this.viewCtx.globalAlpha = 0.96;
                this.viewCtx.fillStyle = color;
                this.viewCtx.fillRect(px, py, this.viewCellSize, this.viewCellSize);

                const textureSeed = hash01(worldX, worldY, x, y, 91);
                if (textureSeed < 0.28) {
                    this.viewCtx.globalAlpha = 0.12;
                    this.viewCtx.strokeStyle = 'rgba(255,255,255,0.35)';
                    this.viewCtx.lineWidth = 1;
                    this.viewCtx.beginPath();
                    this.viewCtx.moveTo(px + 1, py + this.viewCellSize - 2);
                    this.viewCtx.lineTo(px + this.viewCellSize - 2, py + 1);
                    this.viewCtx.stroke();
                }

                if (symbol) {
                    this.viewCtx.globalAlpha = 0.75;
                    this.viewCtx.textAlign = 'center';
                    this.viewCtx.textBaseline = 'middle';
                    this.viewCtx.fillStyle = '#f8fafc';
                    this.viewCtx.font = `${this.viewCellSize * 0.58}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Cormorant Garamond"`;
                    this.viewCtx.fillText(symbol, px + this.viewCellSize * 0.5, py + this.viewCellSize * 0.5);
                } else {
                    const dotSeed = hash01(worldX, worldY, x, y, 137);
                    const dotX = px + this.viewCellSize * (0.3 + dotSeed * 0.4);
                    const dotY = py + this.viewCellSize * (0.3 + hash01(worldX, worldY, x, y, 149) * 0.4);
                    this.viewCtx.globalAlpha = 0.25;
                    this.viewCtx.fillStyle = 'rgba(255,255,255,0.6)';
                    this.viewCtx.beginPath();
                    this.viewCtx.arc(dotX, dotY, Math.max(0.6, this.viewCellSize * 0.04), 0, Math.PI * 2);
                    this.viewCtx.fill();
                }

                if (showObstacles && this.isBlockedCell(worldX, worldY, x, y, type)) {
                    this.viewCtx.globalAlpha = 0.35;
                    this.viewCtx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
                    this.viewCtx.lineWidth = 1;
                    this.viewCtx.strokeRect(px + 1, py + 1, this.viewCellSize - 2, this.viewCellSize - 2);
                }
                this.viewCtx.globalAlpha = 1.0;
            }
        }
    }

    drawLocalPeople(worldX, worldY, offsetX, offsetY) {
        const cell = this.grid[worldY]?.[worldX];
        if (!cell) return;

        let people = null;
        if (cell.type === 'VILLAGE' || cell.type === 'CITY') {
            const count = this.getLocalPeopleCount(cell);
            if (count <= 0) return;
            people = this.getLocalPeople(worldX, worldY, count);
        } else {
            const entry = this.localPeople.get(`${worldX},${worldY}`);
            if (!entry || entry.people.length === 0) return;
            people = entry.people;
        }
        const fontSize = Math.max(12, this.viewCellSize * 0.7);
        const hpBarWidth = this.viewCellSize * 0.6;
        const hpBarHeight = Math.max(2, this.viewCellSize * 0.08);

        for (let i = 0; i < people.length; i++) {
            const person = people[i];
            const bob = (person.isDead || person.isZombie)
                ? 0
                : Math.sin((this.animationClock * 3) + person.bobPhase) * this.viewCellSize * 0.03;
            const px = (person.x + 0.5) * this.viewCellSize + offsetX;
            const py = (person.y + 0.5) * this.viewCellSize + offsetY + bob;

            if (person.isDead && person.hideGrave) {
                continue;
            }

            this.viewCtx.globalAlpha = 1.0;
            this.viewCtx.fillStyle = 'rgba(15, 23, 42, 0.45)';
            this.viewCtx.beginPath();
            this.viewCtx.ellipse(px, py + fontSize * 0.22, fontSize * 0.22, fontSize * 0.11, 0, 0, Math.PI * 2);
            this.viewCtx.fill();

            this.viewCtx.globalAlpha = 1.0;
            this.viewCtx.textAlign = 'center';
            this.viewCtx.textBaseline = 'middle';
            this.viewCtx.font = `${fontSize}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Cormorant Garamond"`;
            const glyph = person.isDead
                ? (person.graveEmoji || '🪦')
                : (person.isZombie ? '🧟' : person.emoji);
            this.viewCtx.save();
            this.viewCtx.lineWidth = Math.max(2, fontSize * 0.12);
            this.viewCtx.strokeStyle = 'rgba(8, 10, 20, 0.9)';
            this.viewCtx.strokeText(glyph, px, py);
            this.viewCtx.shadowColor = 'rgba(248, 250, 252, 0.35)';
            this.viewCtx.shadowBlur = Math.max(2, fontSize * 0.18);
            this.viewCtx.fillText(glyph, px, py);
            this.viewCtx.restore();

            if (person.isZombie && person.alertTimer > 0) {
                this.viewCtx.globalAlpha = 1.0;
                this.viewCtx.fillStyle = '#ef4444';
                this.viewCtx.font = `${fontSize * 0.7}px "Cormorant Garamond","Outfit","Segoe UI Emoji","Apple Color Emoji"`;
                this.viewCtx.fillText('💢', px, py - fontSize * 0.55);
            }

            if (!person.isZombie && person.alertTimer > 0) {
                this.viewCtx.globalAlpha = 1.0;
                this.viewCtx.fillStyle = '#f97316';
                this.viewCtx.font = `${fontSize * 0.4}px "Cinzel","Cormorant Garamond","Outfit","Segoe UI"`;
                this.viewCtx.fillText('ALERT', px, py - fontSize * 0.65);
            }

            if (person.angryTimer > 0) {
                this.viewCtx.globalAlpha = 1.0;
                this.viewCtx.fillStyle = '#ef4444';
                this.viewCtx.font = `${fontSize * 0.6}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"`;
                this.viewCtx.fillText('💢', px, py - fontSize * 0.85);
            }

            if (!person.isDead && person.hp < person.maxHp) {
                this.drawHpBar(px, py - fontSize * 0.65, hpBarWidth, hpBarHeight, person.hp, person.maxHp, '#f97316');
            }
        }

        this.viewCtx.globalAlpha = 1.0;
    }

    drawLocalAnimals(worldX, worldY, offsetX, offsetY) {
        const cell = this.grid[worldY]?.[worldX];
        if (!cell) return;
        if (cell.type === 'VILLAGE' || cell.type === 'CITY') return;

        const animals = this.getLocalAnimals(worldX, worldY);
        if (!animals.length) return;
        const fontSize = Math.max(12, this.viewCellSize * 0.68);
        const hpBarWidth = this.viewCellSize * 0.55;
        const hpBarHeight = Math.max(2, this.viewCellSize * 0.08);

        for (const animal of animals) {
            if (animal.isConsumed) continue;
            const bob = animal.isDead ? 0 : Math.sin((this.animationClock * 2.6) + animal.bobPhase) * this.viewCellSize * 0.02;
            const px = (animal.x + 0.5) * this.viewCellSize + offsetX;
            const py = (animal.y + 0.5) * this.viewCellSize + offsetY + bob;

            this.viewCtx.globalAlpha = 0.95;
            this.viewCtx.fillStyle = 'rgba(15, 23, 42, 0.4)';
            this.viewCtx.beginPath();
            this.viewCtx.ellipse(px, py + fontSize * 0.22, fontSize * 0.2, fontSize * 0.1, 0, 0, Math.PI * 2);
            this.viewCtx.fill();

            this.viewCtx.globalAlpha = 1.0;
            this.viewCtx.textAlign = 'center';
            this.viewCtx.textBaseline = 'middle';
            this.viewCtx.font = `${fontSize}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Cormorant Garamond"`;
            this.viewCtx.save();
            this.viewCtx.lineWidth = Math.max(2, fontSize * 0.12);
            this.viewCtx.strokeStyle = 'rgba(8, 10, 20, 0.85)';
            const glyph = animal.isDead ? (animal.dropEmoji || '🦴') : animal.emoji;
            this.viewCtx.strokeText(glyph, px, py);
            this.viewCtx.shadowColor = 'rgba(248, 250, 252, 0.3)';
            this.viewCtx.shadowBlur = Math.max(2, fontSize * 0.16);
            this.viewCtx.fillText(glyph, px, py);
            this.viewCtx.restore();

            if (!animal.isDead && animal.alertTimer > 0) {
                this.viewCtx.globalAlpha = 1.0;
                this.viewCtx.fillStyle = '#f97316';
                this.viewCtx.font = `${fontSize * 0.4}px "Cinzel","Cormorant Garamond","Outfit","Segoe UI"`;
                this.viewCtx.fillText('ALERT', px, py - fontSize * 0.65);
            }

            if (!animal.isDead && animal.angryTimer > 0) {
                this.viewCtx.globalAlpha = 1.0;
                this.viewCtx.fillStyle = '#ef4444';
                this.viewCtx.font = `${fontSize * 0.6}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"`;
                this.viewCtx.fillText('💢', px, py - fontSize * 0.85);
            }

            if (!animal.isDead && animal.hp < animal.maxHp) {
                this.drawHpBar(px, py - fontSize * 0.6, hpBarWidth, hpBarHeight, animal.hp, animal.maxHp, '#f97316');
            }
        }
        this.viewCtx.globalAlpha = 1.0;
    }

    updateLocalPeople(dt) {
        if (!this.started) return;
        const targets = [];
        if (this.viewTransition && this.viewTransition.active) {
            targets.push([this.viewTransition.fromX, this.viewTransition.fromY]);
            targets.push([this.viewTransition.toX, this.viewTransition.toY]);
        } else {
            targets.push([this.player.worldX, this.player.worldY]);
        }

        for (const [worldX, worldY] of targets) {
            const cell = this.grid[worldY]?.[worldX];
            if (!cell || cell.population <= 0) continue;
            if (cell.type !== 'VILLAGE' && cell.type !== 'CITY') continue;
            const count = this.getLocalPeopleCount(cell);
            if (count <= 0) continue;

            const people = this.getLocalPeople(worldX, worldY, count);
            const grid = this.getLocalGrid(worldX, worldY);
            for (const person of people) {
                if (person.isDead || person.isZombie) continue;
                if (person.alertTimer > 0) {
                    person.alertTimer = Math.max(0, person.alertTimer - dt);
                }
                if (person.attackCooldown > 0) {
                    person.attackCooldown = Math.max(0, person.attackCooldown - dt);
                }
                if (person.angryTimer > 0) {
                    person.angryTimer = Math.max(0, person.angryTimer - dt);
                }

                if (person.fleeToAllies) {
                    let closest = null;
                    let closestDist = Infinity;
                    for (const other of people) {
                        if (other === person) continue;
                        if (other.isDead || other.isZombie) continue;
                        const d = Math.hypot(other.x - person.x, other.y - person.y);
                        if (d < closestDist) {
                            closest = other;
                            closestDist = d;
                        }
                    }
                    if (closest) {
                        this.moveNpcToward(person, grid, worldX, worldY, closest.x, closest.y, dt);
                        if (closestDist <= 0.85) {
                            person.fleeToAllies = false;
                            person.speed = person.baseSpeed;
                            person.aggressionMode = person.lastAttackerType === 'zombie' ? 'zombie' : 'player';
                        }
                        continue;
                    } else {
                        person.fleeToAllies = false;
                        person.speed = person.baseSpeed;
                        person.aggressionMode = person.lastAttackerType === 'zombie' ? 'zombie' : 'player';
                    }
                }

                if (person.aggressionMode) {
                    const target = this.getNpcAggroTarget(person, people, grid, worldX, worldY);
                    if (target) {
                        const targetKey = target.type === 'player'
                            ? 'player'
                            : (target.person?.id ?? 'zombie');
                        if (person.aggroTargetId !== targetKey) {
                            person.aggroTargetId = targetKey;
                            person.angryTimer = 0.9;
                        }
                        this.moveNpcToward(person, grid, worldX, worldY, target.x, target.y, dt);
                        const dist = Math.hypot(target.x - person.x, target.y - person.y);
                        if (dist <= CONFIG.NPC_ATTACK_RADIUS && person.attackCooldown <= 0) {
                            if (target.type === 'player') {
                                this.damagePlayer(1);
                            } else if (target.type === 'zombie' && target.person) {
                                this.damageZombie(target.person, 1);
                            }
                            person.attackCooldown = 0.7;
                        }
                        continue;
                    }
                    person.aggroTargetId = null;
                }
                if (person.idle > 0) {
                    person.idle = Math.max(0, person.idle - dt);
                    if (person.idle > 0) continue;
                    const radius = person.type === 'CITY' ? 5.5 : 3.5;
                    const target = this.findWalkableNearWithRng(worldX, worldY, grid, person.random, person.x, person.y, radius);
                    if (target) {
                        person.tx = target.x;
                        person.ty = target.y;
                        person.hasTarget = true;
                    }
                }

                if (!person.hasTarget) {
                    const radius = person.type === 'CITY' ? 5.5 : 3.5;
                    const target = this.findWalkableNearWithRng(worldX, worldY, grid, person.random, person.x, person.y, radius);
                    if (!target) continue;
                    person.tx = target.x;
                    person.ty = target.y;
                    person.hasTarget = true;
                }

                const dx = person.tx - person.x;
                const dy = person.ty - person.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 0.05) {
                    person.x = person.tx;
                    person.y = person.ty;
                    person.hasTarget = false;
                    person.idle = 0.6 + person.random() * 2.2;
                    continue;
                }

                const step = person.speed * dt;
                const move = Math.min(step, dist);
                const nx = person.x + (dx / dist) * move;
                const ny = person.y + (dy / dist) * move;
                const cellX = Math.floor(nx);
                const cellY = Math.floor(ny);
                const cellType = grid[cellY]?.[cellX];
                if (!cellType || this.isBlockedCell(worldX, worldY, cellX, cellY, cellType)) {
                    person.hasTarget = false;
                    person.idle = 0.4 + person.random() * 1.8;
                    continue;
                }

                person.x = nx;
                person.y = ny;
            }
        }
    }

    updateAnimals(dt) {
        if (!this.started) return;
        if (this.isSleeping) return;
        if (this.viewTransition && this.viewTransition.active) return;

        const worldX = this.player.worldX;
        const worldY = this.player.worldY;
        const cell = this.grid[worldY]?.[worldX];
        if (!cell || cell.type === 'VILLAGE' || cell.type === 'CITY') return;

        const animals = this.getLocalAnimals(worldX, worldY);
        if (!animals.length) return;
        const grid = this.getLocalGrid(worldX, worldY);

        for (const animal of animals) {
            if (animal.isDead) continue;

            if (animal.attackCooldown > 0) {
                animal.attackCooldown = Math.max(0, animal.attackCooldown - dt);
            }
            if (animal.alertTimer > 0) {
                animal.alertTimer = Math.max(0, animal.alertTimer - dt);
            }
            if (animal.angryTimer > 0) {
                animal.angryTimer = Math.max(0, animal.angryTimer - dt);
            }
            if (animal.provokedTimer > 0) {
                animal.provokedTimer = Math.max(0, animal.provokedTimer - dt);
            }

            const aggressive = animal.alwaysAggressive || animal.isProvoked;
            if (aggressive && !animal.isAggro) {
                animal.isAggro = true;
                animal.alertTimer = CONFIG.NPC_ALERT_DURATION;
                animal.angryTimer = 0.9;
            } else if (!aggressive) {
                animal.isAggro = false;
            }
            if (aggressive) {
                const dx = this.player.localX - animal.x;
                const dy = this.player.localY - animal.y;
                const dist = Math.hypot(dx, dy);
                this.moveAnimalToward(animal, grid, worldX, worldY, this.player.localX, this.player.localY, dt);
                if (dist <= CONFIG.ANIMAL_ATTACK_RADIUS && animal.attackCooldown <= 0) {
                    this.damagePlayer(1);
                    animal.attackCooldown = 0.9;
                }
                continue;
            }

            if (animal.idle > 0) {
                animal.idle = Math.max(0, animal.idle - dt);
                if (animal.idle > 0) continue;
            }

            if (!animal.hasTarget) {
                const radius = 4.5;
                const target = this.findWalkableNearWithRng(worldX, worldY, grid, animal.random, animal.x, animal.y, radius);
                if (!target) continue;
                animal.tx = target.x;
                animal.ty = target.y;
                animal.hasTarget = true;
            }

            const dx = animal.tx - animal.x;
            const dy = animal.ty - animal.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.05) {
                animal.x = animal.tx;
                animal.y = animal.ty;
                animal.hasTarget = false;
                animal.idle = 0.6 + animal.random() * 2.2;
                continue;
            }

            const step = animal.speed * dt;
            const move = Math.min(step, dist);
            const nx = animal.x + (dx / dist) * move;
            const ny = animal.y + (dy / dist) * move;
            const cellX = Math.floor(nx);
            const cellY = Math.floor(ny);
            const cellType = grid[cellY]?.[cellX];
            if (!cellType || this.isBlockedCell(worldX, worldY, cellX, cellY, cellType)) {
                animal.hasTarget = false;
                animal.idle = 0.4 + animal.random() * 1.8;
                continue;
            }

            animal.x = nx;
            animal.y = ny;
        }
    }

    getLocalPeople(worldX, worldY, count) {
        const key = `${worldX},${worldY}`;
        const cell = this.grid[worldY]?.[worldX];
        const type = cell?.type || 'PLAIN';
        const entry = this.localPeople.get(key);
        if (entry && entry.type === type && entry.count === count) {
            return entry.people;
        }

        const grid = this.getLocalGrid(worldX, worldY);
        const center = (CONFIG.LOCAL_GRID_SIZE - 1) / 2;
        const people = [];
        for (let i = 0; i < count; i++) {
            const seed = hash01(worldX, worldY, i, 1207) * 1000 + i;
            const rng = this.buildSeededRng(seed);
            const start = this.findRandomWalkableLocalCellWithRng(worldX, worldY, grid, rng)
                || { x: center, y: center };
            const baseSpeed = 0.45 + rng() * 1.05;
            const speed = baseSpeed;
            const emoji = LOCAL_PEOPLE_EMOJIS[Math.floor(rng() * LOCAL_PEOPLE_EMOJIS.length)];
            people.push({
                x: start.x,
                y: start.y,
                tx: start.x,
                ty: start.y,
                hasTarget: false,
                idle: rng() * 1.6,
                speed,
                seed,
                id: seed,
                bobPhase: rng() * Math.PI * 2,
                random: rng,
                type,
                emoji,
                isDead: false,
                graveEmoji: rng() < 0.5 ? '🪦' : '⚰️',
                isZombie: false,
                alertTimer: 0,
                angryTimer: 0,
                targetId: null,
                aggroTargetId: null,
                aggressionMode: null,
                hp: 2,
                maxHp: 2,
                attackCooldown: 0,
                baseSpeed,
                fleeToAllies: false,
                lastAttackerType: null,
                hideGrave: false,
                commandTargetType: null,
                commandTargetId: null
            });
        }

        this.localPeople.set(key, { type, count, people });
        return people;
    }

    getLocalAnimals(worldX, worldY) {
        const key = `${worldX},${worldY}`;
        const cell = this.grid[worldY]?.[worldX];
        const baseType = cell?.type || 'PLAIN';
        if (baseType === 'CITY' || baseType === 'VILLAGE') return [];

        const entry = this.localAnimals.get(key);
        if (entry && entry.type === baseType) {
            return entry.animals;
        }

        const animals = [];
        const pool = ANIMALS_BY_AREA[baseType] || [];
        if (!pool.length) {
            this.localAnimals.set(key, { type: baseType, animals });
            return animals;
        }

        const grid = this.getLocalGrid(worldX, worldY);
        const seedBase = Math.floor(hash01(worldX, worldY, 7021) * 100000);
        const rng = this.buildSeededRng(seedBase || 1);

        const hasWolf = pool.includes('wolf') && rng() < 0.4;
        const poolNoWolf = pool.filter((species) => species !== 'wolf');
        const wolfPackSize = hasWolf ? (3 + Math.floor(rng() * 4)) : 0;
        let totalCount = hasWolf ? wolfPackSize : (1 + Math.floor(rng() * 3));
        totalCount = Math.max(1, totalCount);

        for (let i = 0; i < totalCount; i++) {
            let species = (hasWolf || poolNoWolf.length === 0)
                ? pool[Math.floor(rng() * pool.length)]
                : poolNoWolf[Math.floor(rng() * poolNoWolf.length)];
            if (hasWolf && i < wolfPackSize) {
                species = 'wolf';
            }
            const info = ANIMAL_CATALOG[species];
            if (!info) continue;
            let spawn = this.findRandomWalkableLocalCellWithRng(worldX, worldY, grid, rng)
                || { x: (CONFIG.LOCAL_GRID_SIZE - 1) / 2, y: (CONFIG.LOCAL_GRID_SIZE - 1) / 2 };
            const nearest = this.findNearestValidLocalCell(worldX, worldY, spawn.x, spawn.y);
            if (nearest) {
                spawn = { x: nearest.localX, y: nearest.localY };
            }
            const baseSpeed = CONFIG.ANIMAL_SPEED_MIN + rng() * (CONFIG.ANIMAL_SPEED_MAX - CONFIG.ANIMAL_SPEED_MIN);
            const hp = info.minHp + Math.floor(rng() * (info.maxHp - info.minHp + 1));
            animals.push({
                x: spawn.x,
                y: spawn.y,
                tx: spawn.x,
                ty: spawn.y,
                hasTarget: false,
                idle: rng() * 1.4,
                speed: baseSpeed,
                baseSpeed,
                seed: seedBase + i,
                id: seedBase + i + 1,
                bobPhase: rng() * Math.PI * 2,
                random: rng,
                emoji: info.emoji,
                species,
                hp,
                maxHp: hp,
                isDead: false,
                isConsumed: false,
                alwaysAggressive: !!info.aggressive,
                provokedAggro: !!info.provokedAggro,
                isProvoked: false,
                provokedTimer: 0,
                attackCooldown: 0,
                alertTimer: 0,
                angryTimer: 0,
                isAggro: false,
                dropEmoji: null
            });
        }

        this.localAnimals.set(key, { type: baseType, animals });
        return animals;
    }

    getLocalPeopleCount(cell) {
        const base = cell.type === 'CITY'
            ? CONFIG.LOCAL_PEOPLE_BASE_CITY
            : CONFIG.LOCAL_PEOPLE_BASE_VILLAGE;
        const scale = cell.type === 'CITY'
            ? CONFIG.LOCAL_PEOPLE_POP_SCALE_CITY
            : CONFIG.LOCAL_PEOPLE_POP_SCALE_VILLAGE;
        const size = Math.max(1, cell.citySize || 1);
        const sizeMultiplier = 1 + (size - 1) * CONFIG.LOCAL_PEOPLE_CITYSIZE_SCALE;
        return Math.min(
            CONFIG.LOCAL_PEOPLE_MAX,
            Math.max(0, Math.floor((base + cell.population * scale) * sizeMultiplier))
        );
    }

    getNpcAggroTarget(person, people, grid, worldX, worldY) {
        if (person.aggressionMode === 'player') {
            if (this.isSleeping) return null;
            return { type: 'player', x: this.player.localX, y: this.player.localY };
        }
        if (person.aggressionMode === 'zombie') {
            let best = null;
            let bestDist = CONFIG.NPC_SIGHT_RADIUS;
            for (const other of people) {
                if (!other.isZombie || other.isDead) continue;
                const dx = other.x - person.x;
                const dy = other.y - person.y;
                const dist = Math.hypot(dx, dy);
                if (dist > bestDist) continue;
                if (!this.hasLineOfSight(worldX, worldY, grid, person.x, person.y, other.x, other.y)) {
                    continue;
                }
                best = other;
                bestDist = dist;
            }
            if (best) {
                return { type: 'zombie', person: best, x: best.x, y: best.y };
            }
        }
        return null;
    }

    moveNpcToward(person, grid, worldX, worldY, targetX, targetY, dt) {
        const dx = targetX - person.x;
        const dy = targetY - person.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.01) return;

        const step = person.speed * dt;
        const move = Math.min(step, dist);
        const nx = person.x + (dx / dist) * move;
        const ny = person.y + (dy / dist) * move;
        const cellX = Math.floor(nx);
        const cellY = Math.floor(ny);
        const cellType = grid[cellY]?.[cellX];
        if (!cellType || this.isBlockedCell(worldX, worldY, cellX, cellY, cellType)) {
            const tryX = person.x + Math.sign(dx) * move;
            const tryY = person.y + Math.sign(dy) * move;
            const tryCellX = Math.floor(tryX);
            const tryCellY = Math.floor(tryY);
            const tryCellTypeX = grid[Math.floor(person.y)]?.[tryCellX];
            const tryCellTypeY = grid[tryCellY]?.[Math.floor(person.x)];
            if (tryCellTypeX && !this.isBlockedCell(worldX, worldY, tryCellX, Math.floor(person.y), tryCellTypeX)) {
                person.x = tryX;
            } else if (tryCellTypeY && !this.isBlockedCell(worldX, worldY, Math.floor(person.x), tryCellY, tryCellTypeY)) {
                person.y = tryY;
            }
            return;
        }
        person.x = nx;
        person.y = ny;
    }

    moveAnimalToward(animal, grid, worldX, worldY, targetX, targetY, dt) {
        const dx = targetX - animal.x;
        const dy = targetY - animal.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.01) return;

        const step = animal.speed * dt;
        const move = Math.min(step, dist);
        const nx = animal.x + (dx / dist) * move;
        const ny = animal.y + (dy / dist) * move;
        const cellX = Math.floor(nx);
        const cellY = Math.floor(ny);
        const cellType = grid[cellY]?.[cellX];
        if (!cellType || this.isBlockedCell(worldX, worldY, cellX, cellY, cellType)) {
            return;
        }
        animal.x = nx;
        animal.y = ny;
    }

    findWalkableNearWithRng(worldX, worldY, grid, rng, originX, originY, radius) {
        for (let i = 0; i < 40; i++) {
            const angle = rng() * Math.PI * 2;
            const r = Math.sqrt(rng()) * radius;
            const x = originX + Math.cos(angle) * r;
            const y = originY + Math.sin(angle) * r;
            if (x < 0.2 || y < 0.2 || x > CONFIG.LOCAL_GRID_SIZE - 1.2 || y > CONFIG.LOCAL_GRID_SIZE - 1.2) {
                continue;
            }
            const cellX = Math.floor(x);
            const cellY = Math.floor(y);
            const type = grid[cellY]?.[cellX];
            if (!type) continue;
            if (this.isBlockedCell(worldX, worldY, cellX, cellY, type)) continue;
            return { x, y };
        }
        return null;
    }

    findRandomWalkableLocalCellWithRng(worldX, worldY, grid, rng) {
        for (let i = 0; i < 50; i++) {
            const x = rng() * (CONFIG.LOCAL_GRID_SIZE - 1);
            const y = rng() * (CONFIG.LOCAL_GRID_SIZE - 1);
            const cellX = Math.floor(x);
            const cellY = Math.floor(y);
            const type = grid[cellY]?.[cellX];
            if (!type) continue;
            if (this.isBlockedCell(worldX, worldY, cellX, cellY, type)) continue;
            return { x, y };
        }
        return null;
    }

    buildSeededRng(seed) {
        let s = Math.floor(seed) || 1;
        return () => {
            s = (s * 1664525 + 1013904223) % 4294967296;
            return (s >>> 0) / 4294967296;
        };
    }

    getLocalCellEmojiInfo(worldX, worldY, x, y, type) {
        const emojiList = LOCAL_VIEW_EMOJIS[type] || LOCAL_VIEW_EMOJIS.PLAIN;
        const emojiSeed = hash01(worldX, worldY, x, y, 73);
        const density = LOCAL_VIEW_EMOJI_DENSITY[type] ?? 0.35;
        let showEmoji = (type === 'VILLAGE' || type === 'CITY') ? true : emojiSeed < density;
        if ((type === 'WATER' || type === 'MOUNTAIN' || type === 'FOREST')
            && (x === 0 || y === 0 || x === CONFIG.LOCAL_GRID_SIZE - 1 || y === CONFIG.LOCAL_GRID_SIZE - 1)) {
            showEmoji = false;
        }
        let symbol = showEmoji
            ? emojiList[Math.floor(emojiSeed * emojiList.length) % emojiList.length]
            : '';

        if (type === 'MOUNTAIN' && symbol && symbol !== '❄️') {
            const dist = Math.hypot(x - (CONFIG.LOCAL_GRID_SIZE - 1) / 2, y - (CONFIG.LOCAL_GRID_SIZE - 1) / 2);
            const maxDist = Math.hypot((CONFIG.LOCAL_GRID_SIZE - 1) / 2, (CONFIG.LOCAL_GRID_SIZE - 1) / 2) || 1;
            if (dist / maxDist < 0.45) {
                symbol = '❄️';
            }
        }

        return { showEmoji, symbol };
    }

    getLocalGrid(worldX, worldY) {
        const key = `${worldX},${worldY}`;
        const baseType = this.grid[worldY][worldX].type;
        const entry = this.localGrids.get(key);
        if (entry && entry.type === baseType) return entry.grid;

        const neighborTypes = this.getWorldNeighborTypes(worldX, worldY);
        const grid = this.generateLocalGrid(baseType, neighborTypes, worldX, worldY);
        this.localGrids.set(key, { type: baseType, grid });
        return grid;
    }

    generateLocalGrid(baseType, neighborTypes, worldX, worldY) {
        if (baseType === 'WATER') {
            const edgeWater = this.getWorldEdgeWater(worldX, worldY);
            return this.generateLocalWaterGrid(worldX, worldY, edgeWater);
        }
        if (baseType === 'MOUNTAIN') {
            const edgeMountain = this.getWorldEdgeMountain(worldX, worldY);
            return this.generateLocalMountainGrid(worldX, worldY, edgeMountain);
        }
        if (baseType === 'FOREST') {
            const edgeForest = this.getWorldEdgeType(worldX, worldY, 'FOREST');
            return this.generateLocalForestGrid(worldX, worldY, edgeForest);
        }
        if (baseType === 'CITY') {
            const edgeCity = this.getWorldEdgeType(worldX, worldY, 'CITY');
            return this.generateLocalCityGrid(worldX, worldY, edgeCity);
        }
        const weights = this.buildLocalWeights(baseType, neighborTypes);
        const grid = [];
        for (let y = 0; y < CONFIG.LOCAL_GRID_SIZE; y++) {
            grid[y] = [];
            for (let x = 0; x < CONFIG.LOCAL_GRID_SIZE; x++) {
                grid[y][x] = pickFromWeights(weights);
            }
        }
        if (baseType === 'VILLAGE' || baseType === 'CITY') {
            const mid = Math.floor(CONFIG.LOCAL_GRID_SIZE / 2);
            grid[mid][mid] = baseType;
        }
        return grid;
    }

    generateLocalWaterGrid(worldX, worldY, edgeWater) {
        const size = CONFIG.LOCAL_GRID_SIZE;
        const center = (size - 1) / 2;
        const maxDist = Math.hypot(center, center) || 1;
        const water = Array.from({ length: size }, () => Array(size).fill(false));

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dist = Math.hypot(x - center, y - center) / maxDist;
                const threshold = 0.6 - dist * 0.25;
                const noise = hash01(worldX, worldY, x, y, 211);
                water[y][x] = noise < threshold;
            }
        }

        const applyEdgeConstraints = () => {
            const buffer = 1;
            if (!edgeWater.top) {
                for (let y = 0; y <= buffer; y++) {
                    for (let x = 0; x < size; x++) water[y][x] = false;
                }
            } else {
                for (let x = 0; x < size; x++) water[0][x] = true;
            }
            if (!edgeWater.bottom) {
                for (let y = size - 1 - buffer; y < size; y++) {
                    for (let x = 0; x < size; x++) water[y][x] = false;
                }
            } else {
                for (let x = 0; x < size; x++) water[size - 1][x] = true;
            }
            if (!edgeWater.left) {
                for (let x = 0; x <= buffer; x++) {
                    for (let y = 0; y < size; y++) water[y][x] = false;
                }
            } else {
                for (let y = 0; y < size; y++) water[y][0] = true;
            }
            if (!edgeWater.right) {
                for (let x = size - 1 - buffer; x < size; x++) {
                    for (let y = 0; y < size; y++) water[y][x] = false;
                }
            } else {
                for (let y = 0; y < size; y++) water[y][size - 1] = true;
            }
        };

        applyEdgeConstraints();

        const countWaterNeighbors = (x, y) => {
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
                    if (water[ny][nx]) count++;
                }
            }
            return count;
        };

        for (let i = 0; i < 3; i++) {
            const next = Array.from({ length: size }, () => Array(size).fill(false));
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const neighbors = countWaterNeighbors(x, y);
                    if (water[y][x]) {
                        next[y][x] = neighbors >= 3;
                    } else {
                        next[y][x] = neighbors >= 5;
                    }
                }
            }
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) water[y][x] = next[y][x];
            }
            applyEdgeConstraints();
        }

        const shoreWeights = {
            PLAIN: 0.7,
            FOREST: 0.2,
            MOUNTAIN: 0.1
        };
        const grid = [];
        for (let y = 0; y < size; y++) {
            grid[y] = [];
            for (let x = 0; x < size; x++) {
                if (water[y][x]) {
                    grid[y][x] = 'WATER';
                    continue;
                }
                const landNoise = hash01(worldX, worldY, x, y, 317);
                const pick = landNoise * (shoreWeights.PLAIN + shoreWeights.FOREST + shoreWeights.MOUNTAIN);
                if (pick < shoreWeights.PLAIN) grid[y][x] = 'PLAIN';
                else if (pick < shoreWeights.PLAIN + shoreWeights.FOREST) grid[y][x] = 'FOREST';
                else grid[y][x] = 'MOUNTAIN';
            }
        }
        return grid;
    }

    generateLocalMountainGrid(worldX, worldY, edgeMountain) {
        const size = CONFIG.LOCAL_GRID_SIZE;
        const center = (size - 1) / 2;
        const maxDist = Math.hypot(center, center) || 1;
        const mountain = Array.from({ length: size }, () => Array(size).fill(false));

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dist = Math.hypot(x - center, y - center) / maxDist;
                const threshold = 0.64 - dist * 0.22;
                const noise = hash01(worldX, worldY, x, y, 401);
                mountain[y][x] = noise < threshold;
            }
        }

        const applyEdgeConstraints = () => {
            const buffer = 1;
            if (!edgeMountain.top) {
                for (let y = 0; y <= buffer; y++) {
                    for (let x = 0; x < size; x++) mountain[y][x] = false;
                }
            } else {
                for (let x = 0; x < size; x++) mountain[0][x] = true;
            }
            if (!edgeMountain.bottom) {
                for (let y = size - 1 - buffer; y < size; y++) {
                    for (let x = 0; x < size; x++) mountain[y][x] = false;
                }
            } else {
                for (let x = 0; x < size; x++) mountain[size - 1][x] = true;
            }
            if (!edgeMountain.left) {
                for (let x = 0; x <= buffer; x++) {
                    for (let y = 0; y < size; y++) mountain[y][x] = false;
                }
            } else {
                for (let y = 0; y < size; y++) mountain[y][0] = true;
            }
            if (!edgeMountain.right) {
                for (let x = size - 1 - buffer; x < size; x++) {
                    for (let y = 0; y < size; y++) mountain[y][x] = false;
                }
            } else {
                for (let y = 0; y < size; y++) mountain[y][size - 1] = true;
            }
        };

        applyEdgeConstraints();

        const countMountainNeighbors = (x, y) => {
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
                    if (mountain[ny][nx]) count++;
                }
            }
            return count;
        };

        for (let i = 0; i < 4; i++) {
            const next = Array.from({ length: size }, () => Array(size).fill(false));
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const neighbors = countMountainNeighbors(x, y);
                    if (mountain[y][x]) {
                        next[y][x] = neighbors >= 2;
                    } else {
                        next[y][x] = neighbors >= 4;
                    }
                }
            }
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) mountain[y][x] = next[y][x];
            }
            applyEdgeConstraints();
        }

        const foothillWeights = {
            PLAIN: 0.6,
            FOREST: 0.25,
            MOUNTAIN: 0.15
        };
        const grid = [];
        for (let y = 0; y < size; y++) {
            grid[y] = [];
            for (let x = 0; x < size; x++) {
                if (mountain[y][x]) {
                    grid[y][x] = 'MOUNTAIN';
                    continue;
                }
                const landNoise = hash01(worldX, worldY, x, y, 487);
                const pick = landNoise * (foothillWeights.PLAIN + foothillWeights.FOREST + foothillWeights.MOUNTAIN);
                if (pick < foothillWeights.PLAIN) grid[y][x] = 'PLAIN';
                else if (pick < foothillWeights.PLAIN + foothillWeights.FOREST) grid[y][x] = 'FOREST';
                else grid[y][x] = 'MOUNTAIN';
            }
        }
        return grid;
    }

    generateLocalForestGrid(worldX, worldY, edgeForest) {
        const size = CONFIG.LOCAL_GRID_SIZE;
        const center = (size - 1) / 2;
        const maxDist = Math.hypot(center, center) || 1;
        const forest = Array.from({ length: size }, () => Array(size).fill(false));

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dist = Math.hypot(x - center, y - center) / maxDist;
                const threshold = 0.62 - dist * 0.18;
                const noise = hash01(worldX, worldY, x, y, 521);
                forest[y][x] = noise < threshold;
            }
        }

        const applyEdgeConstraints = () => {
            const buffer = 1;
            if (!edgeForest.top) {
                for (let y = 0; y <= buffer; y++) {
                    for (let x = 0; x < size; x++) forest[y][x] = false;
                }
            } else {
                for (let x = 0; x < size; x++) forest[0][x] = true;
            }
            if (!edgeForest.bottom) {
                for (let y = size - 1 - buffer; y < size; y++) {
                    for (let x = 0; x < size; x++) forest[y][x] = false;
                }
            } else {
                for (let x = 0; x < size; x++) forest[size - 1][x] = true;
            }
            if (!edgeForest.left) {
                for (let x = 0; x <= buffer; x++) {
                    for (let y = 0; y < size; y++) forest[y][x] = false;
                }
            } else {
                for (let y = 0; y < size; y++) forest[y][0] = true;
            }
            if (!edgeForest.right) {
                for (let x = size - 1 - buffer; x < size; x++) {
                    for (let y = 0; y < size; y++) forest[y][x] = false;
                }
            } else {
                for (let y = 0; y < size; y++) forest[y][size - 1] = true;
            }
        };

        applyEdgeConstraints();

        const countForestNeighbors = (x, y) => {
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
                    if (forest[ny][nx]) count++;
                }
            }
            return count;
        };

        for (let i = 0; i < 3; i++) {
            const next = Array.from({ length: size }, () => Array(size).fill(false));
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const neighbors = countForestNeighbors(x, y);
                    if (forest[y][x]) {
                        next[y][x] = neighbors >= 3;
                    } else {
                        next[y][x] = neighbors >= 4;
                    }
                }
            }
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) forest[y][x] = next[y][x];
            }
            applyEdgeConstraints();
        }

        const grid = [];
        for (let y = 0; y < size; y++) {
            grid[y] = [];
            for (let x = 0; x < size; x++) {
                if (forest[y][x]) {
                    grid[y][x] = 'FOREST';
                } else {
                    const landNoise = hash01(worldX, worldY, x, y, 563);
                    grid[y][x] = landNoise < 0.75 ? 'PLAIN' : 'FOREST';
                }
            }
        }
        return grid;
    }

    generateLocalCityGrid(worldX, worldY, edgeCity) {
        const size = CONFIG.LOCAL_GRID_SIZE;
        const center = (size - 1) / 2;
        const maxDist = Math.hypot(center, center) || 1;
        const urban = Array.from({ length: size }, () => Array(size).fill(false));

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dist = Math.hypot(x - center, y - center) / maxDist;
                const threshold = 0.58 - dist * 0.22;
                const noise = hash01(worldX, worldY, x, y, 601);
                urban[y][x] = noise < threshold;
            }
        }

        const applyEdgeConstraints = () => {
            const buffer = 1;
            if (!edgeCity.top) {
                for (let y = 0; y <= buffer; y++) {
                    for (let x = 0; x < size; x++) urban[y][x] = false;
                }
            } else {
                for (let x = 0; x < size; x++) urban[0][x] = true;
            }
            if (!edgeCity.bottom) {
                for (let y = size - 1 - buffer; y < size; y++) {
                    for (let x = 0; x < size; x++) urban[y][x] = false;
                }
            } else {
                for (let x = 0; x < size; x++) urban[size - 1][x] = true;
            }
            if (!edgeCity.left) {
                for (let x = 0; x <= buffer; x++) {
                    for (let y = 0; y < size; y++) urban[y][x] = false;
                }
            } else {
                for (let y = 0; y < size; y++) urban[y][0] = true;
            }
            if (!edgeCity.right) {
                for (let x = size - 1 - buffer; x < size; x++) {
                    for (let y = 0; y < size; y++) urban[y][x] = false;
                }
            } else {
                for (let y = 0; y < size; y++) urban[y][size - 1] = true;
            }
        };

        applyEdgeConstraints();

        const countUrbanNeighbors = (x, y) => {
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
                    if (urban[ny][nx]) count++;
                }
            }
            return count;
        };

        for (let i = 0; i < 2; i++) {
            const next = Array.from({ length: size }, () => Array(size).fill(false));
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const neighbors = countUrbanNeighbors(x, y);
                    if (urban[y][x]) {
                        next[y][x] = neighbors >= 3;
                    } else {
                        next[y][x] = neighbors >= 5;
                    }
                }
            }
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) urban[y][x] = next[y][x];
            }
            applyEdgeConstraints();
        }

        const grid = [];
        for (let y = 0; y < size; y++) {
            grid[y] = [];
            for (let x = 0; x < size; x++) {
                if (urban[y][x]) {
                    const streetNoise = hash01(worldX, worldY, x, y, 647);
                    grid[y][x] = streetNoise < 0.15 ? 'PLAIN' : 'CITY';
                } else {
                    const outerNoise = hash01(worldX, worldY, x, y, 677);
                    grid[y][x] = outerNoise < 0.7 ? 'PLAIN' : 'FOREST';
                }
            }
        }
        return grid;
    }

    buildLocalWeights(baseType, neighborTypes) {
        const base = LOCAL_BASE_WEIGHTS[baseType] || LOCAL_BASE_WEIGHTS.PLAIN;
        const adjusted = { ...base };
        neighborTypes.forEach(type => {
            adjusted[type] = (adjusted[type] || 0) + 0.08;
        });

        const total = Object.values(adjusted).reduce((sum, v) => sum + v, 0) || 1;
        Object.keys(adjusted).forEach(key => {
            adjusted[key] = adjusted[key] / total;
        });
        return adjusted;
    }

    getWorldNeighborTypes(worldX, worldY) {
        const types = [];
        const neighbors = this.getNeighbors(worldX, worldY);
        neighbors.forEach(cell => {
            if (cell && cell.type) types.push(cell.type);
        });
        return types;
    }

    getWorldEdgeWater(worldX, worldY) {
        return {
            top: worldY > 0 && this.grid[worldY - 1][worldX].type === 'WATER',
            bottom: worldY < CONFIG.GRID_SIZE - 1 && this.grid[worldY + 1][worldX].type === 'WATER',
            left: worldX > 0 && this.grid[worldY][worldX - 1].type === 'WATER',
            right: worldX < CONFIG.GRID_SIZE - 1 && this.grid[worldY][worldX + 1].type === 'WATER'
        };
    }

    getWorldEdgeMountain(worldX, worldY) {
        return {
            top: worldY > 0 && this.grid[worldY - 1][worldX].type === 'MOUNTAIN',
            bottom: worldY < CONFIG.GRID_SIZE - 1 && this.grid[worldY + 1][worldX].type === 'MOUNTAIN',
            left: worldX > 0 && this.grid[worldY][worldX - 1].type === 'MOUNTAIN',
            right: worldX < CONFIG.GRID_SIZE - 1 && this.grid[worldY][worldX + 1].type === 'MOUNTAIN'
        };
    }

    getWorldEdgeType(worldX, worldY, type) {
        return {
            top: worldY > 0 && this.grid[worldY - 1][worldX].type === type,
            bottom: worldY < CONFIG.GRID_SIZE - 1 && this.grid[worldY + 1][worldX].type === type,
            left: worldX > 0 && this.grid[worldY][worldX - 1].type === type,
            right: worldX < CONFIG.GRID_SIZE - 1 && this.grid[worldY][worldX + 1].type === type
        };
    }

    spawnPlayer() {
        const attemptLimit = 200;
        for (let i = 0; i < attemptLimit; i++) {
            const worldX = Math.floor(Math.random() * CONFIG.GRID_SIZE);
            const worldY = Math.floor(Math.random() * CONFIG.GRID_SIZE);
            const localX = Math.random() * (CONFIG.LOCAL_GRID_SIZE - 1);
            const localY = Math.random() * (CONFIG.LOCAL_GRID_SIZE - 1);
            if (!this.isPositionBlocked(worldX, worldY, localX, localY)) {
                this.placePlayer(worldX, worldY, localX, localY);
                return;
            }
        }

        const fallback = this.findAnyValidPlayerSpot();
        if (fallback) {
            this.placePlayer(fallback.worldX, fallback.worldY, fallback.localX, fallback.localY);
            return;
        }

        this.placePlayer(
            Math.floor(Math.random() * CONFIG.GRID_SIZE),
            Math.floor(Math.random() * CONFIG.GRID_SIZE),
            Math.random() * (CONFIG.LOCAL_GRID_SIZE - 1),
            Math.random() * (CONFIG.LOCAL_GRID_SIZE - 1)
        );
    }

    startAnimationLoop() {
        const loop = (time) => {
            const dt = Math.min(0.05, (time - this.lastFrameTime) / 1000);
            this.lastFrameTime = time;
            this.animationClock = (this.animationClock + dt) % 1000;
            this.updatePlayer(dt);
            this.updateViewTransition(dt);
            this.updateLocalPeople(dt);
            this.updateAnimals(dt);
            this.processPendingZombieTransfers(dt);
            this.processPendingAnimalTransfers(dt);
            this.updateZombies(dt);
            this.render();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    updatePlayer(dt) {
        if (!this.started) return;
        if (this.isSleeping) return;
        if (this.viewMode === 'game') {
            this.ensurePlayerPassable();
        }
        const dx = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
        const dy = (this.input.down ? 1 : 0) - (this.input.up ? 1 : 0);
        if (dx === 0 && dy === 0) return;

        const length = Math.hypot(dx, dy) || 1;
        const moveX = (dx / length) * CONFIG.PLAYER_SPEED * dt;
        const moveY = (dy / length) * CONFIG.PLAYER_SPEED * dt;

        this.movePlayer(moveX, moveY, this.viewMode === 'game');
    }

    handlePlayerWorldWrap() {
        let moved = false;
        let fromX = this.player.worldX;
        let fromY = this.player.worldY;
        let toX = this.player.worldX;
        let toY = this.player.worldY;
        let dx = 0;
        let dy = 0;

        if (this.player.localX < 0) {
            if (this.player.worldX > 0) {
                this.player.localX += CONFIG.LOCAL_GRID_SIZE;
                this.player.worldX -= 1;
                moved = true;
                dx = -1;
            } else {
                this.player.localX = 0;
            }
        } else if (this.player.localX >= CONFIG.LOCAL_GRID_SIZE) {
            if (this.player.worldX < CONFIG.GRID_SIZE - 1) {
                this.player.localX -= CONFIG.LOCAL_GRID_SIZE;
                this.player.worldX += 1;
                moved = true;
                dx = 1;
            } else {
                this.player.localX = CONFIG.LOCAL_GRID_SIZE - 0.01;
            }
        }

        if (this.player.localY < 0) {
            if (this.player.worldY > 0) {
                this.player.localY += CONFIG.LOCAL_GRID_SIZE;
                this.player.worldY -= 1;
                moved = true;
                dy = -1;
            } else {
                this.player.localY = 0;
            }
        } else if (this.player.localY >= CONFIG.LOCAL_GRID_SIZE) {
            if (this.player.worldY < CONFIG.GRID_SIZE - 1) {
                this.player.localY -= CONFIG.LOCAL_GRID_SIZE;
                this.player.worldY += 1;
                moved = true;
                dy = 1;
            } else {
                this.player.localY = CONFIG.LOCAL_GRID_SIZE - 0.01;
            }
        }

        if (moved) {
            toX = this.player.worldX;
            toY = this.player.worldY;
            this.viewTransition = {
                active: true,
                fromX,
                fromY,
                toX,
                toY,
                dx,
                dy,
                progress: 0
            };
        }
    }

    movePlayer(moveX, moveY, useCollision) {
        const startWorldX = this.player.worldX;
        const startWorldY = this.player.worldY;
        const startLocalX = this.player.localX;
        const startLocalY = this.player.localY;
        let worldX = this.player.worldX;
        let worldY = this.player.worldY;
        let localX = this.player.localX;
        let localY = this.player.localY;

        if (!useCollision) {
            localX += moveX;
            localY += moveY;
            const wrapped = this.wrapLocalPosition(worldX, worldY, localX, localY);
            worldX = wrapped.worldX;
            worldY = wrapped.worldY;
            localX = wrapped.localX;
            localY = wrapped.localY;
        } else {
            if (moveX !== 0) {
                const attempt = this.wrapLocalPosition(worldX, worldY, localX + moveX, localY);
                if (!this.isPositionBlocked(attempt.worldX, attempt.worldY, attempt.localX, attempt.localY)) {
                    worldX = attempt.worldX;
                    worldY = attempt.worldY;
                    localX = attempt.localX;
                    localY = attempt.localY;
                }
            }
            if (moveY !== 0) {
                const attempt = this.wrapLocalPosition(worldX, worldY, localX, localY + moveY);
                if (!this.isPositionBlocked(attempt.worldX, attempt.worldY, attempt.localX, attempt.localY)) {
                    worldX = attempt.worldX;
                    worldY = attempt.worldY;
                    localX = attempt.localX;
                    localY = attempt.localY;
                }
            }
        }

        this.player.worldX = worldX;
        this.player.worldY = worldY;
        this.player.localX = localX;
        this.player.localY = localY;
        this.discoverWorldCell(worldX, worldY);

        if (worldX !== startWorldX || worldY !== startWorldY) {
            const dx = worldX - startWorldX;
            const dy = worldY - startWorldY;
            const size = CONFIG.LOCAL_GRID_SIZE;
            const fromLocalX = this.player.localX + dx * size;
            const fromLocalY = this.player.localY + dy * size;
            this.transferZombiesBetweenAreas(startWorldX, startWorldY, worldX, worldY, dx, dy, fromLocalX, fromLocalY);
            this.transferAnimalsBetweenAreas(startWorldX, startWorldY, worldX, worldY, dx, dy, fromLocalX, fromLocalY);
            this.viewTransition = {
                active: true,
                fromX: startWorldX,
                fromY: startWorldY,
                toX: worldX,
                toY: worldY,
                dx: worldX - startWorldX,
                dy: worldY - startWorldY,
                progress: 0
            };
        }
    }

    transferZombiesBetweenAreas(fromX, fromY, toX, toY, dx, dy, playerFromLocalX, playerFromLocalY) {
        const fromKey = `${fromX},${fromY}`;
        const fromEntry = this.localPeople.get(fromKey);
        if (!fromEntry || !fromEntry.people || fromEntry.people.length === 0) return;

        const size = CONFIG.LOCAL_GRID_SIZE;
        const edgeOffset = 0.2;

        for (let i = fromEntry.people.length - 1; i >= 0; i--) {
            const person = fromEntry.people[i];
            if (!person.isZombie || person.isDead) continue;
            const distToPlayer = Math.hypot(person.x - playerFromLocalX, person.y - playerFromLocalY);
            if (distToPlayer > CONFIG.ZOMBIE_FOLLOW_RADIUS) continue;
            fromEntry.people.splice(i, 1);
            const exitDist = dx !== 0
                ? (dx > 0 ? (size - 1 - person.x) : person.x)
                : (dy > 0 ? (size - 1 - person.y) : person.y);
            const travelTime = Math.max(0, exitDist) / Math.max(0.2, person.speed);
            const entryX = dx > 0 ? edgeOffset : (dx < 0 ? size - 1 - edgeOffset : Math.max(edgeOffset, Math.min(size - 1 - edgeOffset, person.x)));
            const entryY = dy > 0 ? edgeOffset : (dy < 0 ? size - 1 - edgeOffset : Math.max(edgeOffset, Math.min(size - 1 - edgeOffset, person.y)));

            this.pendingZombieTransfers.push({
                zombie: person,
                toX,
                toY,
                timer: travelTime,
                entryX,
                entryY
            });
        }
    }

    transferAnimalsBetweenAreas(fromX, fromY, toX, toY, dx, dy, playerFromLocalX, playerFromLocalY) {
        const fromKey = `${fromX},${fromY}`;
        const fromEntry = this.localAnimals.get(fromKey);
        if (!fromEntry || !fromEntry.animals || fromEntry.animals.length === 0) return;

        const size = CONFIG.LOCAL_GRID_SIZE;
        const edgeOffset = 0.2;

        for (let i = fromEntry.animals.length - 1; i >= 0; i--) {
            const animal = fromEntry.animals[i];
            if (animal.isDead) continue;
            const aggressive = animal.alwaysAggressive || animal.isProvoked;
            if (!aggressive) continue;
            const distToPlayer = Math.hypot(animal.x - playerFromLocalX, animal.y - playerFromLocalY);
            if (distToPlayer > CONFIG.ANIMAL_FOLLOW_RADIUS) continue;
            fromEntry.animals.splice(i, 1);
            const exitDist = dx !== 0
                ? (dx > 0 ? (size - 1 - animal.x) : animal.x)
                : (dy > 0 ? (size - 1 - animal.y) : animal.y);
            const travelTime = Math.max(0, exitDist) / Math.max(0.2, animal.speed);
            const entryX = dx > 0 ? edgeOffset : (dx < 0 ? size - 1 - edgeOffset : Math.max(edgeOffset, Math.min(size - 1 - edgeOffset, animal.x)));
            const entryY = dy > 0 ? edgeOffset : (dy < 0 ? size - 1 - edgeOffset : Math.max(edgeOffset, Math.min(size - 1 - edgeOffset, animal.y)));

            this.pendingAnimalTransfers.push({
                animal,
                toX,
                toY,
                timer: travelTime,
                entryX,
                entryY
            });
        }
    }

    processPendingZombieTransfers(dt) {
        if (!this.pendingZombieTransfers.length) return;
        for (let i = this.pendingZombieTransfers.length - 1; i >= 0; i--) {
            const entry = this.pendingZombieTransfers[i];
            entry.timer -= dt;
            if (entry.timer > 0) continue;

            const cell = this.grid[entry.toY]?.[entry.toX];
            if (!cell) {
                this.pendingZombieTransfers.splice(i, 1);
                continue;
            }

            let people = null;
            if (cell.type === 'VILLAGE' || cell.type === 'CITY') {
                const count = this.getLocalPeopleCount(cell);
                people = this.getLocalPeople(entry.toX, entry.toY, count);
            } else {
                people = this.ensureLocalPeopleEntry(entry.toX, entry.toY, cell.type);
            }
            const zombie = entry.zombie;
            let nx = Math.max(0.2, Math.min(CONFIG.LOCAL_GRID_SIZE - 1.2, entry.entryX));
            let ny = Math.max(0.2, Math.min(CONFIG.LOCAL_GRID_SIZE - 1.2, entry.entryY));
            const nearby = this.findNearestValidLocalCell(entry.toX, entry.toY, nx, ny);
            if (nearby) {
                nx = nearby.localX;
                ny = nearby.localY;
            }
            zombie.x = nx;
            zombie.y = ny;
            zombie.tx = nx;
            zombie.ty = ny;
            zombie.targetId = null;
            people.push(zombie);

            this.pendingZombieTransfers.splice(i, 1);
        }
    }

    processPendingAnimalTransfers(dt) {
        if (!this.pendingAnimalTransfers.length) return;
        for (let i = this.pendingAnimalTransfers.length - 1; i >= 0; i--) {
            const entry = this.pendingAnimalTransfers[i];
            entry.timer -= dt;
            if (entry.timer > 0) continue;

            const cell = this.grid[entry.toY]?.[entry.toX];
            if (!cell || cell.type === 'CITY' || cell.type === 'VILLAGE') {
                this.pendingAnimalTransfers.splice(i, 1);
                continue;
            }

            const animals = this.getLocalAnimals(entry.toX, entry.toY);
            const animal = entry.animal;
            let nx = Math.max(0.2, Math.min(CONFIG.LOCAL_GRID_SIZE - 1.2, entry.entryX));
            let ny = Math.max(0.2, Math.min(CONFIG.LOCAL_GRID_SIZE - 1.2, entry.entryY));
            const nearby = this.findNearestValidLocalCell(entry.toX, entry.toY, nx, ny);
            if (nearby) {
                nx = nearby.localX;
                ny = nearby.localY;
            }
            animal.x = nx;
            animal.y = ny;
            animal.tx = nx;
            animal.ty = ny;
            animals.push(animal);

            this.pendingAnimalTransfers.splice(i, 1);
        }
    }

    wrapLocalPosition(worldX, worldY, localX, localY) {
        let nextWorldX = worldX;
        let nextWorldY = worldY;

        if (localX < 0) {
            if (nextWorldX > 0) {
                localX += CONFIG.LOCAL_GRID_SIZE;
                nextWorldX -= 1;
            } else {
                localX = 0;
            }
        } else if (localX >= CONFIG.LOCAL_GRID_SIZE) {
            if (nextWorldX < CONFIG.GRID_SIZE - 1) {
                localX -= CONFIG.LOCAL_GRID_SIZE;
                nextWorldX += 1;
            } else {
                localX = CONFIG.LOCAL_GRID_SIZE - 1;
            }
        }

        if (localY < 0) {
            if (nextWorldY > 0) {
                localY += CONFIG.LOCAL_GRID_SIZE;
                nextWorldY -= 1;
            } else {
                localY = 0;
            }
        } else if (localY >= CONFIG.LOCAL_GRID_SIZE) {
            if (nextWorldY < CONFIG.GRID_SIZE - 1) {
                localY -= CONFIG.LOCAL_GRID_SIZE;
                nextWorldY += 1;
            } else {
                localY = CONFIG.LOCAL_GRID_SIZE - 1;
            }
        }

        return {
            worldX: nextWorldX,
            worldY: nextWorldY,
            localX,
            localY
        };
    }

    isPositionBlocked(worldX, worldY, localX, localY) {
        const grid = this.getLocalGrid(worldX, worldY);
        const centerX = localX + 0.5;
        const centerY = localY + 0.5;
        const radius = this.playerColliderRadius;

        const x0 = Math.max(0, Math.floor(centerX - radius));
        const y0 = Math.max(0, Math.floor(centerY - radius));
        const x1 = Math.min(CONFIG.LOCAL_GRID_SIZE - 1, Math.floor(centerX + radius));
        const y1 = Math.min(CONFIG.LOCAL_GRID_SIZE - 1, Math.floor(centerY + radius));

        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const type = grid[y][x];
                if (this.isBlockedCell(worldX, worldY, x, y, type)
                    && this.circleIntersectsCell(centerX, centerY, radius, x, y)) {
                    return true;
                }
            }
        }
        return false;
    }

    isPositionBlockedWithRadius(worldX, worldY, centerX, centerY, radius) {
        const grid = this.getLocalGrid(worldX, worldY);
        const x0 = Math.max(0, Math.floor(centerX - radius));
        const y0 = Math.max(0, Math.floor(centerY - radius));
        const x1 = Math.min(CONFIG.LOCAL_GRID_SIZE - 1, Math.floor(centerX + radius));
        const y1 = Math.min(CONFIG.LOCAL_GRID_SIZE - 1, Math.floor(centerY + radius));

        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const type = grid[y][x];
                if (this.isBlockedCell(worldX, worldY, x, y, type)
                    && this.circleIntersectsCell(centerX, centerY, radius, x, y)) {
                    return true;
                }
            }
        }
        return false;
    }

    circleIntersectsCell(cx, cy, r, cellX, cellY) {
        const closestX = Math.max(cellX, Math.min(cx, cellX + 1));
        const closestY = Math.max(cellY, Math.min(cy, cellY + 1));
        const dx = cx - closestX;
        const dy = cy - closestY;
        return (dx * dx + dy * dy) <= r * r;
    }

    isBlockedCell(worldX, worldY, cellX, cellY, type) {
        if (type !== 'WATER' && type !== 'MOUNTAIN' && type !== 'FOREST') return false;
        const emojiInfo = this.getLocalCellEmojiInfo(worldX, worldY, cellX, cellY, type);
        return emojiInfo.showEmoji;
    }

    ensureLocalPeopleEntry(worldX, worldY, type) {
        const key = `${worldX},${worldY}`;
        let entry = this.localPeople.get(key);
        if (!entry) {
            entry = { type, count: 0, people: [] };
            this.localPeople.set(key, entry);
        } else if (entry.type !== type) {
            entry.type = type;
        }
        return entry.people;
    }

    findNearestValidLocalCell(worldX, worldY, localX, localY) {
        const grid = this.getLocalGrid(worldX, worldY);
        let best = null;
        let bestDist = Infinity;
        for (let y = 0; y < CONFIG.LOCAL_GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.LOCAL_GRID_SIZE; x++) {
                const type = grid[y][x];
                if (this.isBlockedCell(worldX, worldY, x, y, type)) continue;
                const dx = (x + 0.5) - localX;
                const dy = (y + 0.5) - localY;
                const dist = dx * dx + dy * dy;
                if (dist < bestDist) {
                    bestDist = dist;
                    best = { localX: x, localY: y };
                }
            }
        }
        return best;
    }

    findAnyValidPlayerSpot() {
        for (let worldY = 0; worldY < CONFIG.GRID_SIZE; worldY++) {
            for (let worldX = 0; worldX < CONFIG.GRID_SIZE; worldX++) {
                const grid = this.getLocalGrid(worldX, worldY);
                for (let y = 0; y < CONFIG.LOCAL_GRID_SIZE; y++) {
                    for (let x = 0; x < CONFIG.LOCAL_GRID_SIZE; x++) {
                        const type = grid[y][x];
                        if (this.isBlockedCell(worldX, worldY, x, y, type)) continue;
                        return { worldX, worldY, localX: x, localY: y };
                    }
                }
            }
        }
        return null;
    }

    ensurePlayerPassable() {
        if (!this.started) return;
        if (!this.isPositionBlocked(this.player.worldX, this.player.worldY, this.player.localX, this.player.localY)) {
            return;
        }

        const nearby = this.findNearestValidLocalCell(
            this.player.worldX,
            this.player.worldY,
            this.player.localX,
            this.player.localY
        );
        if (nearby) {
            this.player.localX = nearby.localX;
            this.player.localY = nearby.localY;
            return;
        }

        const fallback = this.findAnyValidPlayerSpot();
        if (fallback) {
            this.placePlayer(fallback.worldX, fallback.worldY, fallback.localX, fallback.localY);
            this.viewTransition = null;
        }
    }

    updateViewTransition(dt) {
        if (!this.viewTransition || !this.viewTransition.active) return;
        this.viewTransition.progress += dt / CONFIG.VIEW_TRANSITION_DURATION;
        if (this.viewTransition.progress >= 1) {
            this.viewTransition.active = false;
        }
    }

    handleMouseMove(e) {
        const rect = this.worldCanvas.getBoundingClientRect();
        this.mouseX = Math.floor((e.clientX - rect.left) / this.worldCellSize);
        this.mouseY = Math.floor((e.clientY - rect.top) / this.worldCellSize);

        const cell = (this.grid[this.mouseY] && this.grid[this.mouseY][this.mouseX]) ? this.grid[this.mouseY][this.mouseX] : null;
        const cemetery = this.getCemeteryAt(this.mouseX, this.mouseY);

        const canInspect = this.viewMode === 'god' || !!cell?.discovered;
        if (canInspect && ((cell && (cell.type === 'VILLAGE' || cell.type === 'CITY') && cell.cityName) || cemetery)) {
            const cityName = cemetery?.cityName || cell?.cityName || '';
            this.tooltip.innerText = cityName;
            // Center tooltip above cursor
            this.tooltip.style.left = `${e.clientX}px`;
            this.tooltip.style.top = `${e.clientY - 20}px`;
            this.tooltip.classList.remove('hidden');

            this.hoveredGroup = this.getHoveredGroupForCity(cityName);
        } else {
            this.tooltip.classList.add('hidden');
            this.hoveredGroup = null;
        }
    }

    handleViewMouseMove(e) {
        if (!this.started || this.viewMode !== 'game') {
            this.clearViewHover();
            return;
        }
        if (this.viewTransition && this.viewTransition.active) {
            this.clearViewHover();
            return;
        }

        const rect = this.viewCanvas.getBoundingClientRect();
        const localX = (e.clientX - rect.left) / this.viewCellSize;
        const localY = (e.clientY - rect.top) / this.viewCellSize;
        this.hoveredObject = this.pickObjectAt(localX, localY);
    }

    pickObjectAt(localX, localY) {
        const cell = this.grid[this.player.worldY]?.[this.player.worldX];
        if (!cell) return null;

        const playerTarget = this.pickPlayerObject(localX, localY);
        if (playerTarget) return playerTarget;

        if (cell.type === 'VILLAGE' || cell.type === 'CITY') {
            const personTarget = this.pickPersonObject(localX, localY, cell);
            if (personTarget) return personTarget;
        } else {
            const undeadTarget = this.pickWildernessPersonObject(localX, localY);
            if (undeadTarget) return undeadTarget;
            const animalTarget = this.pickAnimalObject(localX, localY);
            if (animalTarget) return animalTarget;
        }

        return this.pickTileObject(localX, localY);
    }

    pickPlayerObject(localX, localY) {
        const dx = this.player.localX + 0.5 - localX;
        const dy = this.player.localY + 0.5 - localY;
        const dist = Math.hypot(dx, dy);
        if (dist > CONFIG.NPC_HOVER_RADIUS) return null;
        return {
            kind: 'player',
            worldX: this.player.worldX,
            worldY: this.player.worldY,
            x: this.player.localX,
            y: this.player.localY
        };
    }

    pickPersonObject(localX, localY, cell) {
        if (cell.population <= 0) return null;
        const count = this.getLocalPeopleCount(cell);
        if (count <= 0) return null;
        const people = this.getLocalPeople(this.player.worldX, this.player.worldY, count);
        let best = null;
        let bestDist = CONFIG.NPC_HOVER_RADIUS;

        for (const person of people) {
            if (person.isDead && person.hideGrave) continue;
            const dx = person.x + 0.5 - localX;
            const dy = person.y + 0.5 - localY;
            const dist = Math.hypot(dx, dy);
            if (dist > bestDist) continue;
            best = person;
            bestDist = dist;
        }
        if (!best) return null;

        let kind = 'npc';
        if (best.isDead) kind = 'grave';
        else if (best.isZombie) kind = 'zombie';
        return {
            kind,
            worldX: this.player.worldX,
            worldY: this.player.worldY,
            x: best.x,
            y: best.y,
            person: best
        };
    }

    pickWildernessPersonObject(localX, localY) {
        const key = `${this.player.worldX},${this.player.worldY}`;
        const entry = this.localPeople.get(key);
        if (!entry || !Array.isArray(entry.people) || !entry.people.length) return null;

        let best = null;
        let bestDist = CONFIG.NPC_HOVER_RADIUS;
        for (const person of entry.people) {
            if (person.isDead && person.hideGrave) continue;
            if (!person.isDead && !person.isZombie) continue;
            const dx = person.x + 0.5 - localX;
            const dy = person.y + 0.5 - localY;
            const dist = Math.hypot(dx, dy);
            if (dist > bestDist) continue;
            best = person;
            bestDist = dist;
        }
        if (!best) return null;
        return {
            kind: best.isZombie ? 'zombie' : 'grave',
            worldX: this.player.worldX,
            worldY: this.player.worldY,
            x: best.x,
            y: best.y,
            person: best
        };
    }

    pickAnimalObject(localX, localY) {
        const animals = this.getLocalAnimals(this.player.worldX, this.player.worldY);
        if (!animals.length) return null;
        let best = null;
        let bestDist = CONFIG.ANIMAL_HOVER_RADIUS;
        for (const animal of animals) {
            if (animal.isConsumed) continue;
            const dx = animal.x + 0.5 - localX;
            const dy = animal.y + 0.5 - localY;
            const dist = Math.hypot(dx, dy);
            if (dist > bestDist) continue;
            best = animal;
            bestDist = dist;
        }
        if (!best) return null;
        return {
            kind: 'animal',
            worldX: this.player.worldX,
            worldY: this.player.worldY,
            x: best.x,
            y: best.y,
            animal: best
        };
    }

    pickTileObject(localX, localY) {
        const tileX = Math.floor(localX);
        const tileY = Math.floor(localY);
        if (tileX < 0 || tileY < 0 || tileX >= CONFIG.LOCAL_GRID_SIZE || tileY >= CONFIG.LOCAL_GRID_SIZE) {
            return null;
        }
        const grid = this.getLocalGrid(this.player.worldX, this.player.worldY);
        const type = grid[tileY]?.[tileX];
        if (!type) return null;
        const emojiInfo = this.getLocalCellEmojiInfo(this.player.worldX, this.player.worldY, tileX, tileY, type);
        if (!emojiInfo.showEmoji || !emojiInfo.symbol) return null;
        return {
            kind: 'tile',
            worldX: this.player.worldX,
            worldY: this.player.worldY,
            x: tileX,
            y: tileY,
            tileType: type,
            emoji: emojiInfo.symbol
        };
    }

    handleViewClick(e) {
        if (!this.started) return;
        if (this.isSleeping) return;
        if (this.viewMode !== 'game') return;
        if (this.viewTransition && this.viewTransition.active) return;
        e.stopPropagation();
        if (!this.hoveredObject) {
            this.closeActionMenu();
            return;
        }
        this.openActionMenu(this.hoveredObject, e.clientX, e.clientY);
    }

    clearViewHover() {
        this.hoveredObject = null;
    }

    openActionMenu(target, clientX, clientY) {
        if (!this.actionMenu || !this.actionMenuActions || !this.actionMenuTitle) return;
        this.menuTargetObject = target;
        this.activeActionPreview = null;
        const actions = this.getActionsForObject(target);
        this.actionMenuTitle.textContent = this.getObjectTitle(target);
        this.actionMenuActions.innerHTML = '';
        actions.forEach((action) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'action-menu-btn';
            btn.textContent = action.label;
            btn.disabled = !action.enabled;
            if (action.reason) {
                btn.title = action.reason;
            }
            btn.addEventListener('mousedown', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (!action.enabled) return;
                action.run();
                this.closeActionMenu();
            });
            btn.addEventListener('mouseenter', () => this.setActionPreview(action));
            btn.addEventListener('mouseleave', () => this.clearActionPreview(action));
            btn.addEventListener('focus', () => this.setActionPreview(action));
            btn.addEventListener('blur', () => this.clearActionPreview(action));
            this.actionMenuActions.appendChild(btn);
        });
        const padding = 16;
        const maxX = window.innerWidth - padding;
        const maxY = window.innerHeight - padding;
        const left = Math.min(maxX, Math.max(padding, clientX));
        const top = Math.min(maxY, Math.max(padding, clientY - 8));
        this.actionMenu.style.left = `${left}px`;
        this.actionMenu.style.top = `${top}px`;
        this.actionMenu.classList.remove('hidden');
        this.actionMenu.setAttribute('aria-hidden', 'false');
    }

    closeActionMenu() {
        this.menuTargetObject = null;
        this.activeActionPreview = null;
        if (!this.actionMenu) return;
        this.actionMenu.classList.add('hidden');
        this.actionMenu.setAttribute('aria-hidden', 'true');
    }

    handleDocumentMouseDown(e) {
        if (!this.actionMenu || this.actionMenu.classList.contains('hidden')) return;
        if (this.actionMenu.contains(e.target)) return;
        if (e.target === this.viewCanvas) return;
        this.closeActionMenu();
    }

    getActionsForObject(target) {
        const actions = [{ label: 'Look at', enabled: true, run: () => this.executeLookAt(target) }];

        if (target.kind === 'player') {
            for (const spell of NECROMANCY_SPELLS) {
                const plan = this.planNecromancySpell(spell);
                actions.unshift({
                    label: `${spell.name} ${spell.costEmoji}${spell.requiredMagic}`,
                    enabled: plan.canCast,
                    reason: plan.reason,
                    run: () => this.executeNecromancySpell(spell),
                    preview: { type: 'necromancy-spell', spellId: spell.id }
                });
            }
            return actions;
        }

        const canShowZombieAttack = target
            && (target.kind === 'npc' || (target.kind === 'animal' && !target.animal?.isDead));
        if (canShowZombieAttack) {
            const areaWorldX = Number.isFinite(target.worldX) ? target.worldX : this.player.worldX;
            const areaWorldY = Number.isFinite(target.worldY) ? target.worldY : this.player.worldY;
            const canOrderZombieAttack = this.hasLivingZombiesAt(areaWorldX, areaWorldY);
            actions.unshift({
                label: 'Zombie Attack',
                enabled: canOrderZombieAttack,
                reason: canOrderZombieAttack ? '' : 'No zombies in this area',
                run: () => this.executeZombieAttack(target)
            });
        }

        if (target.kind === 'npc') {
            const inRange = this.isTargetInInteractRange(target);
            actions.unshift({
                label: 'Attack',
                enabled: inRange,
                reason: inRange ? '' : 'Too far away',
                run: () => this.executeAttackNpc(target)
            });
        } else if (target.kind === 'animal' && !target.animal?.isDead) {
            const inRange = this.isTargetInInteractRange(target);
            actions.unshift({
                label: 'Attack',
                enabled: inRange,
                reason: inRange ? '' : 'Too far away',
                run: () => this.executeAttackAnimal(target)
            });
        } else if (target.kind === 'grave') {
            const inRange = this.isTargetInInteractRange(target);
            actions.unshift({
                label: 'Raise Zombie',
                enabled: inRange,
                reason: inRange ? '' : 'Too far away',
                run: () => this.executeRaiseZombie(target)
            });
        }
        return actions;
    }

    setActionPreview(action) {
        if (!action || !action.preview) {
            this.activeActionPreview = null;
            return;
        }
        this.activeActionPreview = action.preview;
    }

    clearActionPreview(action) {
        if (!action || !action.preview) return;
        if (this.activeActionPreview === action.preview) {
            this.activeActionPreview = null;
        }
    }

    hasLivingZombiesAt(worldX, worldY) {
        return this.getLivingZombiesAt(worldX, worldY).length > 0;
    }

    getLivingZombiesAt(worldX, worldY) {
        const key = `${worldX},${worldY}`;
        const cell = this.grid[worldY]?.[worldX];
        if (!cell) return [];
        if (cell.type === 'VILLAGE' || cell.type === 'CITY') {
            const count = this.getLocalPeopleCount(cell);
            if (count > 0) {
                const people = this.getLocalPeople(worldX, worldY, count);
                return people.filter((person) => person.isZombie && !person.isDead);
            }
        }
        const entry = this.localPeople.get(key);
        if (!entry || !Array.isArray(entry.people)) return [];
        return entry.people.filter((person) => person.isZombie && !person.isDead);
    }

    isTargetInInteractRange(target) {
        if (!target) return false;
        if (typeof target.x !== 'number' || typeof target.y !== 'number') return false;
        const distToPlayer = Math.hypot(this.player.localX - target.x, this.player.localY - target.y);
        return distToPlayer <= CONFIG.NPC_INTERACT_RANGE;
    }

    executeAttackNpc(target) {
        const person = target?.person;
        if (!person || person.isDead || person.isZombie) return;
        const distToPlayer = Math.hypot(this.player.localX - person.x, this.player.localY - person.y);
        if (distToPlayer > CONFIG.NPC_INTERACT_RANGE) {
            this.showTransientStatus('Target is too far away to attack.');
            return;
        }
        this.damageNpc(person, 1, target.worldX, target.worldY, 'player');
        if (person.isDead) {
            this.deathSeverity += 1;
        }
    }

    executeAttackAnimal(target) {
        const animal = target?.animal;
        if (!animal || animal.isDead) return;
        const distToPlayer = Math.hypot(this.player.localX - animal.x, this.player.localY - animal.y);
        if (distToPlayer > CONFIG.NPC_INTERACT_RANGE) {
            this.showTransientStatus('Target is too far away to attack.');
            return;
        }
        this.damageAnimal(animal, 1);
    }

    executeRaiseZombie(target) {
        const person = target?.person;
        if (!person || !person.isDead) return;
        const distToPlayer = Math.hypot(this.player.localX - person.x, this.player.localY - person.y);
        if (distToPlayer > CONFIG.NPC_INTERACT_RANGE) {
            this.showTransientStatus('You are too far away to raise this grave.');
            return;
        }
        this.consumeCemeteryGraveStock(person, target.worldX, target.worldY);
        this.raiseZombie(person);
    }

    executeNecromancySpell(spell) {
        if (!spell) return;
        const plan = this.planNecromancySpell(spell);
        if (!plan.canCast) {
            this.showTransientStatus(plan.reason || 'Not enough necromantic essence.');
            return;
        }

        for (const source of plan.consumedSources) {
            this.consumeNecromancySource(source);
        }

        let raised = 0;
        for (const target of plan.raiseTargets) {
            if (!target || target.isDead !== true || target.hideGrave === true || target.isZombie === true) {
                continue;
            }
            this.consumeCemeteryGraveStock(target, this.player.worldX, this.player.worldY);
            this.raiseZombie(target);
            raised += 1;
        }

        this.showTransientStatus(`${spell.name}: raised ${raised} zombie${raised === 1 ? '' : 's'}.`, 3200);
    }

    planNecromancySpell(spell) {
        const raiseCandidates = this.collectRaiseableCorpses(spell.zombieRaiseRadius);
        const { allSources, consumedSources } = this.planNecromancySourceConsumption(
            spell.magicHarvestRadius,
            spell.requiredMagic,
            raiseCandidates
        );
        const enoughMagic = consumedSources.length >= spell.requiredMagic;

        const consumedBodies = new Set(
            consumedSources
                .filter((source) => source.type === 'dead-person')
                .map((source) => source.person)
        );
        const raiseTargets = raiseCandidates.filter((person) => !consumedBodies.has(person));

        if (!enoughMagic) {
            return {
                canCast: false,
                reason: `Need ${spell.requiredMagic} ${spell.costEmoji}. Available: ${allSources.length}.`,
                consumedSources,
                raiseTargets
            };
        }
        if (!raiseCandidates.length) {
            return {
                canCast: false,
                reason: 'No graves or dead NPCs in raise radius.',
                consumedSources,
                raiseTargets
            };
        }
        if (!raiseTargets.length) {
            return {
                canCast: false,
                reason: 'No raise targets left after essence harvest.',
                consumedSources,
                raiseTargets
            };
        }
        return {
            canCast: true,
            reason: '',
            consumedSources,
            raiseTargets
        };
    }

    planNecromancySourceConsumption(radius, requiredMagic, raiseCandidates) {
        const allSources = this.collectNecromancySources(radius);
        const protectedBodies = new Set(raiseCandidates);
        const preferredSources = [];
        const fallbackSources = [];

        for (const source of allSources) {
            if (source.type === 'dead-person' && protectedBodies.has(source.person)) {
                fallbackSources.push(source);
                continue;
            }
            preferredSources.push(source);
        }

        const consumedSources = preferredSources.slice(0, requiredMagic);
        if (consumedSources.length < requiredMagic) {
            const missing = requiredMagic - consumedSources.length;
            consumedSources.push(...fallbackSources.slice(0, missing));
        }

        return { allSources, consumedSources };
    }

    collectNecromancySources(radius) {
        const sources = [];
        const people = this.getCurrentAreaPeople();
        for (const person of people) {
            const dist = Math.hypot((person.x + 0.5) - (this.player.localX + 0.5), (person.y + 0.5) - (this.player.localY + 0.5));
            if (dist > radius) continue;
            if (person.isDead && !person.isZombie && !person.hideGrave && person.hp <= 0) {
                sources.push({ type: 'dead-person', priority: 0, dist, person });
            } else if (person.isZombie && !person.isDead) {
                sources.push({ type: 'zombie', priority: 1, dist, person });
            }
        }

        const animals = this.getLocalAnimals(this.player.worldX, this.player.worldY);
        for (const animal of animals) {
            if (animal.isConsumed) continue;
            if (!animal.isDead || animal.hp > 0) continue;
            const dist = Math.hypot((animal.x + 0.5) - (this.player.localX + 0.5), (animal.y + 0.5) - (this.player.localY + 0.5));
            if (dist > radius) continue;
            sources.push({ type: 'dead-animal', priority: 0, dist, animal });
        }

        sources.sort((a, b) => (a.priority - b.priority) || (a.dist - b.dist));
        return sources;
    }

    collectRaiseableCorpses(radius) {
        const targets = [];
        const people = this.getCurrentAreaPeople();
        for (const person of people) {
            if (!person.isDead || person.isZombie || person.hideGrave || person.hp > 0) continue;
            const dist = Math.hypot((person.x + 0.5) - (this.player.localX + 0.5), (person.y + 0.5) - (this.player.localY + 0.5));
            if (dist > radius) continue;
            targets.push({ person, dist });
        }
        targets.sort((a, b) => a.dist - b.dist);
        return targets.map((entry) => entry.person);
    }

    getCurrentAreaPeople() {
        const cell = this.grid[this.player.worldY]?.[this.player.worldX];
        if (!cell) return [];
        if (cell.type === 'VILLAGE' || cell.type === 'CITY') {
            const count = this.getLocalPeopleCount(cell);
            if (count <= 0) return [];
            return this.getLocalPeople(this.player.worldX, this.player.worldY, count);
        }
        const key = `${this.player.worldX},${this.player.worldY}`;
        const entry = this.localPeople.get(key);
        if (!entry || !Array.isArray(entry.people)) return [];
        return entry.people;
    }

    consumeNecromancySource(source) {
        if (!source) return;
        if (source.type === 'dead-person') {
            const person = source.person;
            if (!person || !person.isDead || person.isZombie || person.hideGrave || person.hp > 0) return;
            person.hideGrave = true;
            this.consumeCemeteryGraveStock(person, this.player.worldX, this.player.worldY);
            return;
        }
        if (source.type === 'dead-animal') {
            const animal = source.animal;
            if (!animal || animal.isConsumed || !animal.isDead || animal.hp > 0) return;
            animal.isConsumed = true;
            return;
        }
        if (source.type === 'zombie') {
            this.killZombie(source.person);
        }
    }

    consumeCemeteryGraveStock(person, worldX, worldY) {
        if (!person || person.originCemetery !== true) return;
        const cemetery = this.getCemeteryAt(worldX, worldY);
        if (!cemetery) return;
        cemetery.graveCount = Math.max(0, (cemetery.graveCount || 0) - 1);
    }

    executeZombieAttack(target) {
        if (!target) return;
        const zombies = this.getLivingZombiesAt(target.worldX, target.worldY);
        if (!zombies.length) {
            this.showTransientStatus('No zombies in this area.');
            return;
        }

        let targetId = null;
        let targetType = null;
        if (target.kind === 'npc') {
            if (!target.person || target.person.isDead || target.person.isZombie) return;
            targetId = target.person.id;
            targetType = 'npc';
        } else if (target.kind === 'animal') {
            if (!target.animal || target.animal.isDead) return;
            targetId = target.animal.id;
            targetType = 'animal';
        } else {
            return;
        }

        for (const zombie of zombies) {
            zombie.commandTargetType = targetType;
            zombie.commandTargetId = targetId;
            zombie.targetId = targetId;
            zombie.alertTimer = CONFIG.ZOMBIE_ALERT_DURATION;
            zombie.angryTimer = 0.9;
        }
        this.showTransientStatus(`Zombie Attack ordered (${zombies.length}).`, 2400);
    }

    executeLookAt(target) {
        const observation = this.describeObject(target);
        this.showTransientStatus(observation, 4200);
        this.appendLookLog(target, observation);
    }

    showTransientStatus(message, durationMs = 2800) {
        this.transientStatusText = message;
        this.transientStatusUntil = performance.now() + durationMs;
    }

    describeObject(target) {
        if (!target) return 'You see nothing of note.';
        if (target.kind === 'player') {
            return `Necromancer • HP ${this.player.hp}/${this.player.maxHp}`;
        }
        if (target.kind === 'npc') {
            const person = target.person;
            return `Villager • HP ${person.hp}/${person.maxHp}`;
        }
        if (target.kind === 'zombie') {
            const person = target.person;
            return `Zombie • HP ${person.hp}/${person.maxHp}`;
        }
        if (target.kind === 'grave') {
            return 'Fresh grave • The body can be raised.';
        }
        if (target.kind === 'animal') {
            const animal = target.animal;
            const species = animal.species ? `${animal.species[0].toUpperCase()}${animal.species.slice(1)}` : 'Animal';
            return `${species} • HP ${animal.hp}/${animal.maxHp}`;
        }
        const label = WORLD_TYPE_LABELS[target.tileType] || target.tileType || 'Unknown';
        return `${label} tile.`;
    }

    appendLookLog(target, text) {
        const emoji = this.getObjectEmoji(target);
        const line = `${emoji} ${text}`;
        this.lookLogEntries.unshift(line);
        if (this.lookLogEntries.length > 8) {
            this.lookLogEntries.length = 8;
        }
        this.renderLookLog();
    }

    getObjectEmoji(target) {
        if (!target) return '👁️';
        if (target.kind === 'player') return '🧙‍♂️';
        if (target.kind === 'npc') return target.person?.emoji || '🧑';
        if (target.kind === 'zombie') return '🧟';
        if (target.kind === 'grave') return target.person?.graveEmoji || '🪦';
        if (target.kind === 'animal') {
            if (target.animal?.isDead) return target.animal?.dropEmoji || '🦴';
            return target.animal?.emoji || '🐾';
        }
        return target.emoji || '✨';
    }

    renderLookLog() {
        if (!this.lookLogList) return;
        this.lookLogList.innerHTML = '';
        if (!this.lookLogEntries.length) {
            const empty = document.createElement('div');
            empty.className = 'look-log-empty';
            empty.textContent = 'No observations yet.';
            this.lookLogList.appendChild(empty);
            return;
        }
        this.lookLogEntries.forEach((entry) => {
            const row = document.createElement('div');
            row.className = 'look-log-item';
            row.textContent = entry;
            this.lookLogList.appendChild(row);
        });
    }

    getObjectTitle(target) {
        if (!target) return 'Object';
        if (target.kind === 'player') return 'Necromancer';
        if (target.kind === 'npc') return 'NPC';
        if (target.kind === 'zombie') return 'Zombie';
        if (target.kind === 'grave') return 'Grave';
        if (target.kind === 'animal') return 'Animal';
        return 'Environment';
    }

    drawActionPreviewOverlay(offsetX, offsetY) {
        if (!this.activeActionPreview) return;
        if (this.activeActionPreview.type !== 'necromancy-spell') return;
        const spell = NECROMANCY_SPELLS.find((entry) => entry.id === this.activeActionPreview.spellId);
        if (!spell) return;
        this.drawNecromancySpellPreview(spell, offsetX, offsetY);
    }

    drawNecromancySpellPreview(spell, offsetX, offsetY) {
        const plan = this.planNecromancySpell(spell);
        const centerX = (this.player.localX + 0.5) * this.viewCellSize + offsetX;
        const centerY = (this.player.localY + 0.5) * this.viewCellSize + offsetY;
        const harvestRadiusPx = spell.magicHarvestRadius * this.viewCellSize;
        const raiseRadiusPx = spell.zombieRaiseRadius * this.viewCellSize;

        this.viewCtx.save();

        this.viewCtx.setLineDash([8, 6]);
        this.viewCtx.lineWidth = Math.max(1.5, this.viewCellSize * 0.1);
        this.viewCtx.strokeStyle = 'rgba(244, 244, 245, 0.92)';
        this.viewCtx.beginPath();
        this.viewCtx.arc(centerX, centerY, harvestRadiusPx, 0, Math.PI * 2);
        this.viewCtx.stroke();

        this.viewCtx.setLineDash([]);
        this.viewCtx.lineWidth = Math.max(1.5, this.viewCellSize * 0.1);
        this.viewCtx.strokeStyle = 'rgba(239, 68, 68, 0.92)';
        this.viewCtx.beginPath();
        this.viewCtx.arc(centerX, centerY, raiseRadiusPx, 0, Math.PI * 2);
        this.viewCtx.stroke();

        const highlightStroke = plan.canCast ? 'rgba(34, 197, 94, 0.95)' : 'rgba(251, 146, 60, 0.95)';
        const highlightFill = plan.canCast ? 'rgba(34, 197, 94, 0.25)' : 'rgba(251, 146, 60, 0.2)';
        for (const person of plan.raiseTargets) {
            const px = (person.x + 0.5) * this.viewCellSize + offsetX;
            const py = (person.y + 0.5) * this.viewCellSize + offsetY;
            const r = Math.max(8, this.viewCellSize * 0.42);
            this.viewCtx.fillStyle = highlightFill;
            this.viewCtx.beginPath();
            this.viewCtx.arc(px, py, r, 0, Math.PI * 2);
            this.viewCtx.fill();
            this.viewCtx.lineWidth = Math.max(1.2, this.viewCellSize * 0.08);
            this.viewCtx.strokeStyle = highlightStroke;
            this.viewCtx.stroke();
        }

        this.viewCtx.restore();
    }

    drawObjectSelectionFrame(offsetX, offsetY) {
        const target = this.menuTargetObject || this.hoveredObject;
        if (target && !this.isObjectStillValid(target)) {
            if (this.menuTargetObject === target) this.closeActionMenu();
            if (this.hoveredObject === target) this.clearViewHover();
            return;
        }
        if (!target) return;
        const x = target.x + 0.5;
        const y = target.y + 0.5;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const px = x * this.viewCellSize + offsetX;
        const py = y * this.viewCellSize + offsetY;
        const size = Math.max(14, this.viewCellSize * 0.8);
        this.viewCtx.save();
        this.viewCtx.globalAlpha = 1;
        this.viewCtx.strokeStyle = 'rgba(248, 250, 252, 0.95)';
        this.viewCtx.lineWidth = Math.max(1.6, this.viewCellSize * 0.1);
        this.viewCtx.strokeRect(px - size / 2, py - size / 2, size, size);
        this.viewCtx.strokeStyle = 'rgba(34, 197, 94, 0.85)';
        this.viewCtx.lineWidth = Math.max(1.2, this.viewCellSize * 0.07);
        this.viewCtx.strokeRect(px - size / 2 + 2, py - size / 2 + 2, size - 4, size - 4);
        this.viewCtx.restore();
    }

    isObjectStillValid(target) {
        if (!target) return false;
        if (target.worldX !== this.player.worldX || target.worldY !== this.player.worldY) return false;
        if (target.kind === 'player') return true;
        if (target.kind === 'npc') return !!target.person && !target.person.isDead && !target.person.isZombie;
        if (target.kind === 'zombie') return !!target.person && target.person.isZombie && !target.person.isDead;
        if (target.kind === 'grave') return !!target.person && target.person.isDead && !target.person.hideGrave;
        if (target.kind === 'animal') return !!target.animal;
        return target.kind === 'tile';
    }

    raiseZombie(person) {
        if (!person || !person.isDead || person.isZombie) return;
        person.isDead = false;
        person.isZombie = true;
        person.emoji = '🧟';
        person.hasTarget = false;
        person.idle = 0;
        person.speed = this.randomBetween(CONFIG.ZOMBIE_SPEED_MIN, CONFIG.ZOMBIE_SPEED_MAX);
        person.alertTimer = CONFIG.ZOMBIE_ALERT_DURATION;
        person.targetId = null;
        person.aggressionMode = null;
        person.hp = 1;
        person.maxHp = 1;
        person.attackCooldown = 0;
        person.hideGrave = false;
        person.commandTargetType = null;
        person.commandTargetId = null;
        const nearby = this.findNearestValidLocalCell(this.player.worldX, this.player.worldY, person.x, person.y);
        if (nearby) {
            person.x = nearby.localX;
            person.y = nearby.localY;
        }
    }

    triggerMurder(worldX, worldY, localX, localY, killerType) {
        const cell = this.grid[worldY]?.[worldX];
        if (!cell || cell.population <= 0 || (cell.type !== 'VILLAGE' && cell.type !== 'CITY')) return;
        const count = this.getLocalPeopleCount(cell);
        if (count <= 0) return;
        const people = this.getLocalPeople(worldX, worldY, count);
        for (const person of people) {
            if (person.isDead || person.isZombie) continue;
            const dist = Math.hypot(person.x - localX, person.y - localY);
            if (dist > CONFIG.NPC_WITNESS_RADIUS) continue;
            person.alertTimer = CONFIG.NPC_ALERT_DURATION;
            person.aggressionMode = killerType === 'zombie' ? 'zombie' : 'player';
        }
    }

    killZombie(person) {
        if (!person || !person.isZombie || person.isDead) return;
        person.isDead = true;
        person.isZombie = false;
        person.hasTarget = false;
        person.idle = 999;
        person.speed = 0;
        person.alertTimer = 0;
        person.hp = 0;
        person.hideGrave = true;
        person.commandTargetType = null;
        person.commandTargetId = null;
    }

    killNpc(person) {
        if (!person || person.isDead) return;
        person.isDead = true;
        person.isZombie = false;
        person.hasTarget = false;
        person.idle = 999;
        person.speed = 0;
        person.alertTimer = 0;
        person.hp = 0;
        person.hideGrave = false;
    }

    damageNpc(person, amount, worldX, worldY, killerType) {
        if (!person || person.isDead) return;
        person.hp = Math.max(0, person.hp - amount);
        if (person.hp <= 0) {
            this.killNpc(person);
            if (killerType === 'player' || killerType === 'zombie') {
                this.killCount += 1;
                this.updateYearDisplay();
            }
            this.triggerMurder(worldX, worldY, person.x, person.y, killerType);
            return;
        }
        person.lastAttackerType = killerType;
        person.fleeToAllies = true;
        person.aggressionMode = null;
        if (!person.baseSpeed) {
            person.baseSpeed = person.speed || 0.8;
        }
        person.speed = person.baseSpeed * 1.5;
    }

    damageZombie(person, amount) {
        if (!person || !person.isZombie || person.isDead) return;
        person.hp = Math.max(0, person.hp - amount);
        if (person.hp <= 0) {
            this.killZombie(person);
        }
    }

    damageAnimal(animal, amount) {
        if (!animal || animal.isDead) return;
        animal.hp = Math.max(0, animal.hp - amount);
        if (animal.hp <= 0) {
            this.killAnimal(animal);
            return;
        }
        if (animal.provokedAggro) {
            animal.isProvoked = true;
            animal.provokedTimer = 999;
            animal.speed = Math.min(CONFIG.ANIMAL_SPEED_MAX * 1.2, animal.baseSpeed * 1.4);
        }
    }

    killAnimal(animal) {
        if (!animal || animal.isDead) return;
        animal.isDead = true;
        animal.hp = 0;
        animal.speed = 0;
        animal.hasTarget = false;
        animal.idle = 999;
        animal.dropEmoji = Math.random() < 0.5 ? '🥩' : '🦴';
    }

    damagePlayer(amount) {
        if (this.isSleeping) return;
        this.player.hp = Math.max(0, this.player.hp - amount);
        if (this.player.hp <= 0) {
            this.killPlayer();
        }
    }

    drawHpBar(px, py, width, height, hp, maxHp, color, force = false) {
        if (!force && (maxHp <= 0 || hp >= maxHp)) return;
        const clamped = Math.max(0, Math.min(maxHp, hp));
        const ratio = maxHp > 0 ? clamped / maxHp : 0;
        const x = px - width / 2;
        const y = py - height / 2;
        this.viewCtx.save();
        this.viewCtx.globalAlpha = 0.9;
        this.viewCtx.fillStyle = 'rgba(8, 10, 20, 0.85)';
        this.viewCtx.fillRect(x - 1, y - 1, width + 2, height + 2);
        this.viewCtx.fillStyle = color;
        this.viewCtx.fillRect(x, y, width * ratio, height);
        this.viewCtx.restore();
    }

    showGameOver() {
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.remove('hidden');
        }
    }

    hideGameOver() {
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.add('hidden');
        }
    }

    updateSleepOverlay() {
        if (!this.gameOverScreen) return;
        if (!this.isSleeping) return;
        const remaining = this.sleepYearsRemaining;
        const remainingEl = document.getElementById('sleep-remaining');
        if (remainingEl) {
            remainingEl.textContent = String(remaining);
        }
    }

    restartGame() {
        this.isSleeping = false;
        this.isPaused = false;
        this.deathSeverity = 0;
        this.deathTurnsRemaining = 0;
        this.year = 1;
        this.killCount = 0;
        this.sleepYearsRemaining = 0;
        this.updateYearDisplay();
        this.input = { up: false, down: false, left: false, right: false };
        this.clearViewHover();
        this.closeActionMenu();
        this.lookLogEntries = [];
        this.renderLookLog();
        this.viewTransition = null;
        this.deathSources = [];
        this.localPeople.clear();
        this.localGrids.clear();
        this.localAnimals.clear();
        this.pendingAnimalTransfers = [];
        this.initGrid();
        this.spawnPlayer();
        this.player.hp = this.player.maxHp;
        this.started = true;
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.classList.add('hidden');
        this.hideGameOver();
        this.start();
    }

    killPlayer() {
        if (this.isSleeping) return;
        this.isSleeping = true;
        this.isPaused = false;
        this.sleepYearsRemaining = this.killCount;
        this.deathWorldX = this.player.worldX;
        this.deathWorldY = this.player.worldY;
        this.markDiscoveredStale();
        this.input = { up: false, down: false, left: false, right: false };
        this.clearViewHover();
        this.closeActionMenu();
        this.viewTransition = null;
        this.destroyAllZombies();
        this.movePlayerOutsideCities();
        if (this.sleepYearsRemaining === 0) {
            this.wakePlayer();
            return;
        }
        this.showGameOver();
        this.updateSleepOverlay();
    }

    updateZombies(dt) {
        if (!this.started) return;
        if (this.isSleeping) return;
        if (this.viewMode !== 'game') return;
        if (this.viewTransition && this.viewTransition.active) return;

        const cell = this.grid[this.player.worldY]?.[this.player.worldX];
        if (!cell) return;

        let people = null;
        if (cell.type === 'VILLAGE' || cell.type === 'CITY') {
            const count = this.getLocalPeopleCount(cell);
            if (count <= 0) return;
            people = this.getLocalPeople(this.player.worldX, this.player.worldY, count);
        } else {
            const entry = this.localPeople.get(`${this.player.worldX},${this.player.worldY}`);
            if (!entry || !entry.people.some(p => p.isZombie && !p.isDead)) return;
            people = entry.people;
        }

        const grid = this.getLocalGrid(this.player.worldX, this.player.worldY);
        const animals = (cell.type === 'CITY' || cell.type === 'VILLAGE')
            ? []
            : this.getLocalAnimals(this.player.worldX, this.player.worldY);

        for (const zombie of people) {
            if (!zombie.isZombie) continue;
            zombie.alertTimer = Math.max(0, zombie.alertTimer - dt);
            if (zombie.attackCooldown > 0) {
                zombie.attackCooldown = Math.max(0, zombie.attackCooldown - dt);
            }
            if (zombie.angryTimer > 0) {
                zombie.angryTimer = Math.max(0, zombie.angryTimer - dt);
            }
            if (this.isPositionBlockedWithRadius(this.player.worldX, this.player.worldY, zombie.x + 0.5, zombie.y + 0.5, CONFIG.ZOMBIE_COLLIDER_RADIUS)) {
                const escape = this.findNearestValidLocalCell(this.player.worldX, this.player.worldY, zombie.x, zombie.y);
                if (escape) {
                    zombie.x = escape.localX;
                    zombie.y = escape.localY;
                }
            }

            let target = null;
            let targetDist = CONFIG.ZOMBIE_SIGHT_RADIUS;
            let targetIsAnimal = false;

            if (zombie.commandTargetType === 'animal') {
                const commandedAnimal = animals.find((animal) =>
                    !animal.isDead && animal.id === zombie.commandTargetId
                );
                if (commandedAnimal) {
                    target = commandedAnimal;
                    targetDist = Math.hypot(commandedAnimal.x - zombie.x, commandedAnimal.y - zombie.y);
                    targetIsAnimal = true;
                } else {
                    zombie.commandTargetType = null;
                    zombie.commandTargetId = null;
                }
            }

            if (!target && zombie.commandTargetType === 'npc') {
                const commandedNpc = people.find((person) =>
                    !person.isDead && !person.isZombie && person.id === zombie.commandTargetId
                );
                if (commandedNpc) {
                    target = commandedNpc;
                    targetDist = Math.hypot(commandedNpc.x - zombie.x, commandedNpc.y - zombie.y);
                } else {
                    zombie.commandTargetType = null;
                    zombie.commandTargetId = null;
                }
            }

            if (!target) {
                for (const animal of animals) {
                    if (animal.isDead) continue;
                    if (!(animal.alwaysAggressive || animal.isProvoked)) continue;
                    const adx = animal.x - zombie.x;
                    const ady = animal.y - zombie.y;
                    const d = Math.hypot(adx, ady);
                    if (d > targetDist) continue;
                    if (!this.hasLineOfSight(this.player.worldX, this.player.worldY, grid, zombie.x, zombie.y, animal.x, animal.y)) {
                        continue;
                    }
                    target = animal;
                    targetDist = d;
                    targetIsAnimal = true;
                }
            }

            if (!target) {
                for (const person of people) {
                    if (person.isDead || person.isZombie) continue;
                    const pdx = person.x - zombie.x;
                    const pdy = person.y - zombie.y;
                    const d = Math.hypot(pdx, pdy);
                    if (d > targetDist) continue;
                    if (!this.hasLineOfSight(this.player.worldX, this.player.worldY, grid, zombie.x, zombie.y, person.x, person.y)) {
                        continue;
                    }
                    target = person;
                    targetDist = d;
                }
            }

            if (target && !targetIsAnimal && zombie.targetId !== target.id) {
                zombie.alertTimer = CONFIG.ZOMBIE_ALERT_DURATION;
                zombie.angryTimer = 0.9;
                zombie.targetId = target.id;
            }

            const baseFollowX = target ? target.x : this.player.localX;
            const baseFollowY = target ? target.y : this.player.localY;
            const noiseAngle = (this.animationClock * 1.4) + (zombie.seed * 0.01);
            const noiseRadius = 0.22;
            const followX = baseFollowX + Math.cos(noiseAngle) * noiseRadius;
            const followY = baseFollowY + Math.sin(noiseAngle) * noiseRadius;
            const dx = followX - zombie.x;
            const dy = followY - zombie.y;
            const dist = Math.hypot(dx, dy) || 1;
            const step = zombie.speed * dt;
            const move = Math.min(step, dist);
            const nx = zombie.x + (dx / dist) * move;
            const ny = zombie.y + (dy / dist) * move;

            let moved = false;
            if (!this.isPositionBlockedWithRadius(this.player.worldX, this.player.worldY, nx + 0.5, ny + 0.5, CONFIG.ZOMBIE_COLLIDER_RADIUS)) {
                zombie.x = nx;
                zombie.y = ny;
                moved = true;
            }

            if (!moved) {
                const tryX = zombie.x + Math.sign(dx) * move;
                const tryY = zombie.y + Math.sign(dy) * move;
                if (!this.isPositionBlockedWithRadius(this.player.worldX, this.player.worldY, tryX + 0.5, zombie.y + 0.5, CONFIG.ZOMBIE_COLLIDER_RADIUS)) {
                    zombie.x = tryX;
                } else {
                    if (!this.isPositionBlockedWithRadius(this.player.worldX, this.player.worldY, zombie.x + 0.5, tryY + 0.5, CONFIG.ZOMBIE_COLLIDER_RADIUS)) {
                        zombie.y = tryY;
                    }
                }
            }

            // Gentle separation to avoid stacking
            let pushX = 0;
            let pushY = 0;
            for (const other of people) {
                if (!other.isZombie || other === zombie) continue;
                const ox = zombie.x - other.x;
                const oy = zombie.y - other.y;
                const d = Math.hypot(ox, oy);
                if (d > 0 && d < 0.6) {
                    const force = (0.6 - d) * 0.12;
                    pushX += (ox / d) * force;
                    pushY += (oy / d) * force;
                }
            }

            // Avoid the player collider
            const pdx = zombie.x - this.player.localX;
            const pdy = zombie.y - this.player.localY;
            const pd = Math.hypot(pdx, pdy);
            if (pd > 0 && pd < CONFIG.ZOMBIE_AVOID_PLAYER_RADIUS) {
                const force = (CONFIG.ZOMBIE_AVOID_PLAYER_RADIUS - pd) * 0.18;
                pushX += (pdx / pd) * force;
                pushY += (pdy / pd) * force;
            }

            if (pushX !== 0 || pushY !== 0) {
                const px = zombie.x + pushX;
                const py = zombie.y + pushY;
                if (!this.isPositionBlockedWithRadius(this.player.worldX, this.player.worldY, px + 0.5, py + 0.5, CONFIG.ZOMBIE_COLLIDER_RADIUS)) {
                    zombie.x = px;
                    zombie.y = py;
                }
            }

            if (target && targetDist <= CONFIG.ZOMBIE_ATTACK_RADIUS && zombie.attackCooldown <= 0) {
                if (targetIsAnimal) {
                    this.damageAnimal(target, 1);
                } else {
                    this.damageNpc(target, 1, this.player.worldX, this.player.worldY, 'zombie');
                    if (this.hoveredObject?.person === target && target.isDead) {
                        this.clearViewHover();
                    }
                }
                zombie.attackCooldown = 0.9;
            }
        }
    }

    destroyAllZombies() {
        this.pendingZombieTransfers = [];
        for (const entry of this.localPeople.values()) {
            if (!entry || !Array.isArray(entry.people)) continue;
            for (const person of entry.people) {
                if (!person || !person.isZombie || person.isDead) continue;
                person.isDead = true;
                person.isZombie = false;
                person.hideGrave = true;
                person.hp = 0;
            }
        }
    }

    movePlayerOutsideCities() {
        const spot = this.findNonCityPlayerSpot() || this.findAnyValidPlayerSpot();
        if (spot) {
            this.placePlayer(spot.worldX, spot.worldY, spot.localX, spot.localY);
            return;
        }
        this.spawnPlayer();
    }

    findNonCityPlayerSpot() {
        const candidates = [];
        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y]?.[x];
                if (!cell) continue;
                if (cell.type === 'CITY' || cell.type === 'VILLAGE') continue;
                candidates.push([x, y]);
            }
        }
        if (!candidates.length) return null;
        const attempts = 200;
        for (let i = 0; i < attempts; i++) {
            const [worldX, worldY] = candidates[Math.floor(Math.random() * candidates.length)];
            const localX = Math.random() * (CONFIG.LOCAL_GRID_SIZE - 1);
            const localY = Math.random() * (CONFIG.LOCAL_GRID_SIZE - 1);
            if (!this.isPositionBlocked(worldX, worldY, localX, localY)) {
                return { worldX, worldY, localX, localY };
            }
        }
        for (const [worldX, worldY] of candidates) {
            for (let i = 0; i < 20; i++) {
                const localX = Math.random() * (CONFIG.LOCAL_GRID_SIZE - 1);
                const localY = Math.random() * (CONFIG.LOCAL_GRID_SIZE - 1);
                if (!this.isPositionBlocked(worldX, worldY, localX, localY)) {
                    return { worldX, worldY, localX, localY };
                }
            }
        }
        return null;
    }

    wakePlayer() {
        if (!this.isSleeping) return;
        this.isSleeping = false;
        this.player.hp = this.player.maxHp;
        this.sleepYearsRemaining = 0;
        this.wakePlayerNearDeath();
        this.updateYearDisplay();
        this.hideGameOver();
    }

    wakePlayerNearDeath() {
        const originX = typeof this.deathWorldX === 'number' ? this.deathWorldX : this.player.worldX;
        const originY = typeof this.deathWorldY === 'number' ? this.deathWorldY : this.player.worldY;
        const spot = this.findNearestNonCitySpot(originX, originY) || this.findNonCityPlayerSpot() || this.findAnyValidPlayerSpot();
        if (spot) {
            this.placePlayer(spot.worldX, spot.worldY, spot.localX, spot.localY);
            return;
        }
        this.spawnPlayer();
    }

    findNearestNonCitySpot(originX, originY) {
        const maxRadius = Math.max(CONFIG.GRID_SIZE, CONFIG.GRID_SIZE);
        const initialRadius = 3;
        let best = null;
        let bestDist = Infinity;

        for (let dy = -initialRadius; dy <= initialRadius; dy++) {
            for (let dx = -initialRadius; dx <= initialRadius; dx++) {
                const dist = Math.abs(dx) + Math.abs(dy);
                if (dist > initialRadius) continue;
                const worldX = originX + dx;
                const worldY = originY + dy;
                if (worldX < 0 || worldY < 0 || worldX >= CONFIG.GRID_SIZE || worldY >= CONFIG.GRID_SIZE) continue;
                const cell = this.grid[worldY]?.[worldX];
                if (!cell) continue;
                if (cell.type === 'CITY' || cell.type === 'VILLAGE') continue;
                const localSpot = this.findValidLocalSpotInTile(worldX, worldY);
                if (!localSpot) continue;
                if (dist < bestDist) {
                    bestDist = dist;
                    best = { worldX, worldY, localX: localSpot.localX, localY: localSpot.localY };
                }
            }
        }

        if (best) return best;

        for (let r = initialRadius + 1; r < maxRadius; r++) {
            for (let dx = -r; dx <= r; dx++) {
                const dy = r - Math.abs(dx);
                const candidates = [
                    [originX + dx, originY + dy],
                    [originX + dx, originY - dy]
                ];
                for (const [worldX, worldY] of candidates) {
                    if (worldX < 0 || worldY < 0 || worldX >= CONFIG.GRID_SIZE || worldY >= CONFIG.GRID_SIZE) continue;
                    const cell = this.grid[worldY]?.[worldX];
                    if (!cell) continue;
                    if (cell.type === 'CITY' || cell.type === 'VILLAGE') continue;
                    const localSpot = this.findValidLocalSpotInTile(worldX, worldY);
                    if (localSpot) {
                        return { worldX, worldY, localX: localSpot.localX, localY: localSpot.localY };
                    }
                }
            }
        }
        return null;
    }

    findValidLocalSpotInTile(worldX, worldY) {
        for (let i = 0; i < 40; i++) {
            const localX = Math.random() * (CONFIG.LOCAL_GRID_SIZE - 1);
            const localY = Math.random() * (CONFIG.LOCAL_GRID_SIZE - 1);
            if (!this.isPositionBlocked(worldX, worldY, localX, localY)) {
                return { localX, localY };
            }
        }
        return null;
    }

    hasLineOfSight(worldX, worldY, grid, x0, y0, x1, y1) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const dist = Math.hypot(dx, dy) || 1;
        const steps = Math.max(6, Math.ceil(dist * 4));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const x = x0 + dx * t;
            const y = y0 + dy * t;
            const cellX = Math.floor(x);
            const cellY = Math.floor(y);
            const type = grid[cellY]?.[cellX];
            if (!type) continue;
            if (this.isBlockedCell(worldX, worldY, cellX, cellY, type)) {
                return false;
            }
        }
        return true;
    }

    randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    getCityGroup(startCell) {
        const group = [];
        const queue = [startCell];
        const visited = new Set([startCell]);

        while (queue.length > 0) {
            const current = queue.shift();
            group.push(current);

            const neighbors = this.getAllNeighbors(current.x, current.y);
            neighbors.forEach(n => {
                if (!visited.has(n) && (n.type === 'VILLAGE' || n.type === 'CITY') && n.cityName === startCell.cityName) {
                    visited.add(n);
                    queue.push(n);
                }
            });
        }
        return group;
    }

    handleClick(e) {
        if (this.isPaused) return;
        const rect = this.worldCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.worldCellSize);
        const y = Math.floor((e.clientY - rect.top) / this.worldCellSize);

        if (this.grid[y] && this.grid[y][x]) {
            this.killCell(x, y);
            this.syncCemeteriesWithCities();
            this.renderWorld();
        }
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === 'escape') {
            this.closeActionMenu();
        }
        if (key === 'arrowup') { e.preventDefault(); this.input.up = true; return; }
        if (key === 'arrowdown') { e.preventDefault(); this.input.down = true; return; }
        if (key === 'arrowleft') { e.preventDefault(); this.input.left = true; return; }
        if (key === 'arrowright') { e.preventDefault(); this.input.right = true; return; }
        if (key === 'w') { this.input.up = true; return; }
        if (key === 's') { this.input.down = true; return; }
        if (key === 'a') { this.input.left = true; return; }
        if (key === 'd') {
            if (e.shiftKey) {
                this.handleKey(e);
            } else {
                this.input.right = true;
            }
            return;
        }
        this.handleKey(e);
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === 'arrowup') this.input.up = false;
        if (key === 'arrowdown') this.input.down = false;
        if (key === 'arrowleft') this.input.left = false;
        if (key === 'arrowright') this.input.right = false;
        if (key === 'w') this.input.up = false;
        if (key === 's') this.input.down = false;
        if (key === 'a') this.input.left = false;
        if (key === 'd') this.input.right = false;
    }

    handleKey(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.togglePause();
        }
        if (e.key === '1') this.setSpeed(1);
        if (e.key === '2') this.setSpeed(2);
        if (e.key === '3') this.setSpeed(5);
        if (e.key === '4') this.setSpeed(10);

        if (e.key === 'f') {
            if (!document.fullscreenElement) {
                this.worldCanvas.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }
        if (e.key.toLowerCase() === 'd' && e.shiftKey && !this.isPaused) {
            if (this.grid[this.mouseY] && this.grid[this.mouseY][this.mouseX]) {
                this.deathSources.push(new DeathSource(this.mouseX, this.mouseY));
            }
        }
    }

    killCell(x, y) {
        const cell = this.grid[y][x];
        if (cell.population > 0) {
            this.deathSeverity += cell.population;
            cell.population = 0;
            cell.stability = 0;
            if (cell.type === 'VILLAGE' || cell.type === 'CITY') {
                cell.type = 'PLAIN';
                cell.symbol = Math.random() < 0.5 ? ',' : '.';
                cell.cityName = null;
            }
        } else {
            cell.stability = Math.max(0, cell.stability - 0.5);
            this.deathSeverity += 5;
        }
    }
}
