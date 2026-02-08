/**
 * Necromancer Island - Core Script
 */

const CONFIG = {
    GRID_SIZE: 20,
    CELL_SIZE: 32,
    LOCAL_GRID_SIZE: 20,
    VIEW_CELL_SIZE: 28,
    PLAYER_SPEED: 4.5, // cells per second in local view
    VIEW_TRANSITION_DURATION: 0.22, // seconds
    TURN_DURATION: 1000, // ms between automatic turns
    DIFFUSION_RATE: 0.22,
    CONSUMPTION_RATE: 0.6,
    EXPANSION_THRESHOLD: 0.1,
    REGRESSION_THRESHOLD: 0.3, // Added for new rules
    STABILITY_DECAY: 0.08,
    STABILITY_REGEN: 0.01,
    DEATH_SEVERITY_THRESHOLD: 100,
    MAX_CITY_SIZE: 25,
    CITY_SIZE_DEMAND_SCALE: 0.04,
    CITY_EXPANSION_CHANCE: 0.08,
    FOREST_EXPANSION_CHANCE: 0.015,
    CITY_FOREST_BURN_SUSTAIN: 4,
    CITY_FOREST_BURN_STABILITY_COST: 0.1,
    FOREST_REGROWTH_CHANCE: 0.004,
    CITY_EROSION_STABILITY_COST: 0.12,
    LOCAL_PEOPLE_BASE_VILLAGE: 5,
    LOCAL_PEOPLE_BASE_CITY: 12,
    LOCAL_PEOPLE_POP_SCALE_VILLAGE: 0.08,
    LOCAL_PEOPLE_POP_SCALE_CITY: 0.12,
    LOCAL_PEOPLE_CITYSIZE_SCALE: 0.18,
    LOCAL_PEOPLE_MAX: 24,
    NPC_INTERACT_RANGE: 1.6, // local cell distance from player
    NPC_HOVER_RADIUS: 0.85, // local cell distance from cursor
    ZOMBIE_SPEED_MIN: 0.85, // local cells per second
    ZOMBIE_SPEED_MAX: 1.6, // local cells per second
    ZOMBIE_ATTACK_RADIUS: 0.7, // local cell distance
    ZOMBIE_SIGHT_RADIUS: 3.2,
    ZOMBIE_ALERT_DURATION: 0.8,
    ZOMBIE_COLLIDER_RADIUS: 0.28,
    ZOMBIE_AVOID_PLAYER_RADIUS: 0.75
};

const CELL_TYPES = {
    PLAIN: { emoji: '', sustainProduce: 0, sustainConsume: 0.1, color: '#050505' },
    FOREST: { emoji: '🌲', sustainProduce: 2.0, sustainConsume: 0, color: '#0a2a0a' },
    WATER: { emoji: '🌊', sustainProduce: 1.5, sustainConsume: 0, color: '#0a1a2a' },
    VILLAGE: { emoji: '🏡', sustainProduce: 0, sustainConsume: 1.0, color: '#2a2a0a' },
    CITY: { emoji: '🏙️', sustainProduce: 0, sustainConsume: 3.0, color: '#2a0a2a' },
    MOUNTAIN: { emoji: '⛰️', sustainProduce: 0, sustainConsume: 0, color: '#1a1a1a' }
};

const VILLAGE_NAME_LISTS = {
    towns1: [
        "Dallington", "Oakham", "Osgodby", "Goltho", "Hill End", "Denchworth", "Doddington Thorpe", "Stockerston",
        "Caithness", "Sulby", "Lancaut", "Foston", "Fawcliff", "Edenham", "Foscote", "Furtho", "Hewland", "Minsden",
        "Apuldram", "Brickendon", "Mawsley", "Leesthorpe", "Thrupp", "East Compton", "Worlingham", "Sauvey",
        "Whitwell", "Willaston", "Skinnand", "Shorne", "Little Cowarn", "Lower Bullingham", "Keythorpe", "Betterton",
        "Dylife", "Monkton", "Willows", "Freak's Ground", "East Stoke", "Wickham", "Horsepool", "Appletree",
        "Papley", "Torpel", "Falconhurst", "Fleet Marston", "Rufford", "Bucklebury", "Thundridge", "Tidemills",
        "Clopton", "Boxbury", "Tubney", "Kelmarsh", "Oswaldbeck", "Yester", "Knave Hill", "Little Lavington",
        "Moor Green", "Wykeham", "Windridge", "ToxallChilstone", "South Heighton", "Bilby", "Eye Kettleby", "Gilston",
        "Endloss Ditton", "Twyford", "Childwick", "Meering", "Sapperton", "Binnend", "Holdenby", "Oxwich",
        "Over Colwick", "Pipewell", "Broadmead", "Wyld Court", "Kinoulton", "Barrowby", "Wakely", "Falcutt",
        "Wistow", "Inglewood", "Sudwelle", "Dembleby", "Emberton", "Moorhouse", "Holt", "Great Purston",
        "Nether Catesby", "Little Gringley", "Easington", "Woodcoates"
    ],
    towns2: [
        "Stapleford", "Nether Chalford", "Thoresby", "Ringstone", "Holme Lacy", "Starmore", "Tyneham", "Dornford",
        "Cotton Mill", "Henwick", "Hawkshaw", "Atterton", "Lindley", "Westcotes", "Witherley", "Bordesden",
        "Stanstead Abbots", "Marwood", "Lilford", "Fakenham Parva", "Ichetone", "Astwell", "Hardwick", "Farworth",
        "Carburton", "Hundatora", "Asterleigh", "Knaptoft", "Crastell", "Braunstonbury", "Newton Purcell", "uenby",
        "Tusmore", "Westerby", "Murcott", "Frogmire", "Brentingby", "Bolham", "Wyham", "Haughton", "Kilvington",
        "Ganthorpe", "High Worsall", "Keighton", "Newbottle", "Brookenby", "Burrough Hill", "Maidencourt", "Rattray",
        "East Shefford", "Great Munden", "Enstone", "Wiverton", "Frovie", "Odstone", "Hoarwithy", "Badsaddle",
        "Kincardine", "Gilroes", "Manxey", "Gatton", "Baggrave", "West Laughton", "Exceat", "Welham", "Wharram",
        "Eastbridge", "Welby", "Rutland", "Althorp", "Henderskelf", "Humberstone", "Orgarswick", "South Marefield",
        "Beacon Hill", "Skipsea", "Wordwell", "East Chilwell", "Doddershall", "Shuart", "Stuchbury", "Holbeck",
        "Easton Bavents", "Mardley", "Preston Deanery", "Osberton", "Southerham", "Kettlebaston", "Greenbooth",
        "Wollenwick", "Burston", "Sibberton", "Othorpe", "Andreskirk", "Chaddleworth", "Gillethorp", "Thorpe",
        "Netone", "Thurmaston", "Willoughby"
    ],
    towns3: [
        "Carswell", "Radley", "Nether Adber", "Brookend", "Hoston", "Cumbria", "Erringham", "Upper Catesby",
        "Peeblesshire", "Winwick", "Field Burcote", "Caswell", "Trafford", "North Stoke", "Strixton", "Quickswood",
        "Berehill", "Kilpeck", "Chaldean", "Charwelton", "Flawford", "Fawsley", "Whatborough", "Ossington",
        "Sapeham", "Lubenham", "Bricewold", "Calme", "Midley", "Wothorpe", "Hale", "Fairhurst", "Imber",
        "Dodyngton", "Wain Wood", "Lewarewich", "Wootton", "Bigging", "Exton", "Wyck", "Newsells", "Faxton",
        "Old Jedward", "Winterborne Farringdon", "Woburn", "Nobottle", "Garendon", "Bradgate", "Barpham", "Weald",
        "Gartree", "Paddlesworth", "Hixham", "Gubblecote", "Langford", "Ringsthorpe", "Laythorpe", "Napsbury",
        "Rutherford", "Venonnis", "Stonebury", "Hygham", "West Whykeham", "Draycott", "Kilwardby", "Barcote",
        "Milton", "Newton", "Stormsworth", "Lordington", "Rycote", "Canons Ashby", "Stevenage", "Doveland",
        "Wintringham", "Wellbury", "Dode", "Swanston", "Tiscott", "Elmesthorpe", "Pendley", "Warby", "Hound Tor",
        "Shalford", "East Lothian", "Mirabel", "Duns", "Hanstead", "Cestersover", "Bockenfield", "Swinbrook",
        "Gainsthorpe", "Bockhampton", "Broxtowe", "Dartmoor", "Tomley", "Serlby", "Little Oxendon"
    ],
    towns4: [
        "Westthorpe", "Whittington", "Fairfield", "Wiltshire", "Normanton", "Hainstone", "North Marefield",
        "Poyningstown", "Onley", "West Backworth", "Wolfhampcote", "Parbold", "Waterton", "Westrill", "Hallowtree",
        "Throcking", "Bittesby", "Streethill", "Washingley", "Brime", "Berkeden", "Burghley", "Brightwell",
        "Stagenhoe", "Wellsborough", "Moreton", "Howgrave", "Kitts End", "Upper Ditchford", "Broadbusk",
        "Colston Basset", "Studmarsh", "Lubbesthorpe", "Wandon", "Lowfield Heath", "Fleecethorpe", "Burton",
        "Babworth", "Glassthorpe", "Wacton", "Findhorn", "Elkington", "Nafferton", "Silkby", "Galloways",
        "Tinwell", "Seawell", "Elmington", "Roxton", "Northeye", "Withcote", "Plumtree", "Roxburgh", "Walcot",
        "Stanford", "Shottesbrooke", "Bitteswell", "Moray", "Fife", "Perching", "Northwick", "Seacourt", "Knuston",
        "South Wheatley", "Hothorpe", "Stanmer", "Wymondham", "Newbold", "Ulnaby", "Langton", "Dishley", "Foxley",
        "Upton", "Aldwick", "Broadfield", "Cratendune", "Morwellham Quay", "Mardale", "Kirby", "Whatcombe", "Whenham",
        "Misterton", "Wainscarre", "Flaunden", "Armston", "Addingrove", "Knapthorpe", "Whimpton", "Libury",
        "Snittlegarth", "Dunningworth", "Brooksby", "Cuddington", "Langley", "Hempshill", "Old Shoreham", "Lowesby",
        "Stroud", "Naneby"
    ],
    ironswornA: [
        "Bleak", "Green", "Wolf", "Raven", "Gray", "Red", "Axe", "Great", "Wood", "Low", "White", "Storm", "Black",
        "Mourn", "New", "Stone", "Grim", "Lost", "High", "Rock", "Shield", "Sword", "Frost", "Thorn", "Long"
    ],
    ironswornB: [
        "moor", "ford", "crag", "watch", "hope", "wood", "ridge", "stone", "haven", "fall(s)", "river", "field",
        "hill", "bridge", "mark", "cairn", "land", "hall", "mount", "rock", "brook", "barrow", "stead", "home", "wick"
    ]
};

const VILLAGE_NAME_WEIGHTS = [
    { type: 'list', list: 'towns1', weight: 1 },
    { type: 'list', list: 'towns2', weight: 1 },
    { type: 'list', list: 'towns3', weight: 1 },
    { type: 'list', list: 'towns4', weight: 1 },
    { type: 'ironsworn', weight: 5 }
];

const CITY_PREFIX_WORDS = [
    "New",
    "Next",
    "Neo",
    "Nova",
    "Ebon",
    "Elder",
    "Ashen",
    "Dusk",
    "Shadow",
    "Frost",
    "Iron",
    "Raven",
    "Wolf",
    "Thorn",
    "Wyrd",
    "Grim",
    "Hallow",
    "Black",
    "Silver",
    "Storm",
    "Dawn",
    "Blood"
];

function pickWeighted(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of items) {
        roll -= item.weight;
        if (roll <= 0) return item;
    }
    return items[items.length - 1];
}

function pickFromWeights(weightMap) {
    const entries = Object.entries(weightMap).map(([type, weight]) => ({ type, weight }));
    const chosen = pickWeighted(entries);
    return chosen.type;
}

const LOCAL_BASE_WEIGHTS = {
    PLAIN: { PLAIN: 0.72, FOREST: 0.15, WATER: 0.06, MOUNTAIN: 0.07 },
    FOREST: { FOREST: 0.7, PLAIN: 0.18, WATER: 0.05, MOUNTAIN: 0.07 },
    WATER: { WATER: 0.7, PLAIN: 0.18, FOREST: 0.06, MOUNTAIN: 0.06 },
    MOUNTAIN: { MOUNTAIN: 0.68, PLAIN: 0.2, FOREST: 0.06, WATER: 0.06 },
    VILLAGE: { PLAIN: 0.7, FOREST: 0.12, WATER: 0.08, MOUNTAIN: 0.05, VILLAGE: 0.05 },
    CITY: { PLAIN: 0.6, FOREST: 0.1, WATER: 0.1, MOUNTAIN: 0.05, CITY: 0.15 }
};

const LOCAL_VIEW_COLORS = {
    PLAIN: { h: 110, s: 14, l: 15, v: 2 },
    FOREST: { h: 125, s: 18, l: 13, v: 2 },
    WATER: { h: 205, s: 18, l: 13, v: 2 },
    MOUNTAIN: { h: 220, s: 8, l: 15, v: 2 },
    VILLAGE: { h: 36, s: 14, l: 16, v: 2 },
    CITY: { h: 255, s: 10, l: 16, v: 2 }
};

const LOCAL_VIEW_EMOJIS = {
    PLAIN: ['🌿', '🌱', '🍃'],
    FOREST: ['🌲', '🌳', '🌲'],
    WATER: ['🌊', '💧', '🫧'],
    MOUNTAIN: ['⛰️', '🏔️', '🪨', '❄️'],
    VILLAGE: ['🏡', '🛖', '🌾'],
    CITY: ['🏙️', '🏢', '🌆']
};

const LOCAL_VIEW_EMOJI_DENSITY = {
    PLAIN: 0.22,
    FOREST: 0.25,
    WATER: 0.25,
    MOUNTAIN: 0.2,
    VILLAGE: 0.85,
    CITY: 0.9
};

const LOCAL_PEOPLE_EMOJIS = [
    '🧑', '👨', '👩', '🧔', '👨‍🌾', '👩‍🌾', '👨‍🏭', '👩‍🏭',
    '👨‍🔧', '👩‍🔧', '👨‍🎨', '👩‍🎨', '👨‍🍳', '👩‍🍳', '👨‍⚕️', '👩‍⚕️'
];

const WORLD_TYPE_LABELS = {
    PLAIN: "Plains",
    FOREST: "Forest",
    WATER: "Water",
    MOUNTAIN: "Mountain",
    VILLAGE: "Village",
    CITY: "City"
};

function hash01(...values) {
    let h = 2166136261;
    for (const value of values) {
        h ^= (value | 0);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
}

function expandOptionalSuffix(value) {
    if (!value.includes("(s)")) return value;
    return Math.random() < 0.5 ? value.replace("(s)", "") : value.replace("(s)", "s");
}

function generateVillageName() {
    const choice = pickWeighted(VILLAGE_NAME_WEIGHTS);
    if (choice.type === 'list') {
        const list = VILLAGE_NAME_LISTS[choice.list];
        return list[Math.floor(Math.random() * list.length)];
    }
    const a = VILLAGE_NAME_LISTS.ironswornA[Math.floor(Math.random() * VILLAGE_NAME_LISTS.ironswornA.length)];
    const bRaw = VILLAGE_NAME_LISTS.ironswornB[Math.floor(Math.random() * VILLAGE_NAME_LISTS.ironswornB.length)];
    const b = expandOptionalSuffix(bRaw);
    return `${a}${b}`;
}

function stripKnownPrefixWord(name) {
    if (!name) return "";
    const parts = name.split(" ");
    if (parts.length <= 1) return name;
    const first = parts[0];
    if (CITY_PREFIX_WORDS.includes(first)) {
        return parts.slice(1).join(" ");
    }
    return name;
}

function generateDerivedName(baseName, existingNames) {
    const base = stripKnownPrefixWord(baseName);
    for (let i = 0; i < 25; i++) {
        const prefix = CITY_PREFIX_WORDS[Math.floor(Math.random() * CITY_PREFIX_WORDS.length)];
        const candidate = `${prefix} ${base}`;
        if (candidate !== baseName && !existingNames.has(candidate)) {
            return candidate;
        }
    }
    return `New ${base}`;
}

class Cell {
    constructor(x, y, type = 'PLAIN') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.population = (type === 'VILLAGE') ? 10 : (type === 'CITY' ? 50 : 0);
        this.sustain = 0;
        this.stability = 1.0;
        this.targetSustain = 0; // For diffusion buffering
        this.cityName = null;

        // Random symbol for Plains
        this.symbol = Math.random() < 0.5 ? ',' : '.';
    }
}

class Region {
    constructor() {
        this.cells = [];
        this.sustainCapacity = 0;
        this.populationDemand = 0;
        this.deathSeverity = 0;
        this.stability = 1.0;
    }

    calculateMetrics() {
        this.sustainCapacity = 0;
        this.populationDemand = 0;
        this.cells.forEach(cell => {
            const typeData = CELL_TYPES[cell.type];
            this.sustainCapacity += typeData.sustainProduce;
            this.populationDemand += (cell.population * CONFIG.CONSUMPTION_RATE);
        });
    }
}

class DeathSource {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.turnsLeft = 5;
    }
}

class Game {
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
        this.isPaused = true;
        this.isDead = false;
        this.deathSeverity = 0;
        this.deathTurnsRemaining = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.hoveredGroup = null; // Set of cells in currently hovered city group
        this.hoveredNpc = null;
        this.hoveredGrave = null;
        this.tooltip = document.getElementById('city-tooltip');

        this.tps = 1;
        this.started = false;
        this.worldCellSize = CONFIG.CELL_SIZE;
        this.viewCellSize = CONFIG.VIEW_CELL_SIZE;
        this.input = { up: false, down: false, left: false, right: false };
        this.viewMode = 'god';
        this.playerColliderRadius = 0.375; // in local cell units (75% diameter)
        this.player = {
            worldX: 0,
            worldY: 0,
            localX: 0,
            localY: 0
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
            this.started = true;
            this.start();
            document.getElementById('start-screen').classList.add('hidden');
        });

        // Interactions
        this.worldCanvas.addEventListener('mousedown', (e) => this.handleClick(e));
        this.worldCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.viewCanvas.addEventListener('mousemove', (e) => this.handleViewMouseMove(e));
        this.viewCanvas.addEventListener('mouseleave', () => this.clearNpcHover());
        this.viewCanvas.addEventListener('mousedown', (e) => this.handleViewClick(e));
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        this.render();
        this.startAnimationLoop();
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
        this.clearNpcHover();
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
        if (this.viewMode === 'game') {
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
        this.detectRegions();
        this.checkRepression();
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

        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                if (visited.has(cell) || cell.type === 'MOUNTAIN' || cell.type === 'WATER') continue;

                const region = new Region();
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
                this.regions.push(region);
            }
        }
    }

    updateUI() {
        const status = document.getElementById('game-status');
        if (this.regions.length > 0) {
            const avgStability = this.regions.reduce((acc, r) => acc + r.stability, 0) / this.regions.length;
            status.innerText = `World Stability: ${Math.round(avgStability * 100)}% | Regions: ${this.regions.length} | Severity: ${Math.floor(this.deathSeverity)}`;
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

        if (cell.type === 'CITY' || cell.type === 'VILLAGE') {
            const name = cell.cityName || "Unknown";
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

        for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
            for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
                const cell = this.grid[y][x];
                const typeData = CELL_TYPES[cell.type];
                const px = x * this.worldCellSize;
                const py = y * this.worldCellSize;

                this.worldCtx.fillStyle = typeData.color;
                this.worldCtx.fillRect(px, py, this.worldCellSize, this.worldCellSize);

                this.worldCtx.font = `${this.worldCellSize * 0.7}px "Cormorant Garamond"`;
                this.worldCtx.textAlign = 'center';
                this.worldCtx.textBaseline = 'middle';
                this.worldCtx.globalAlpha = 0.2 + (cell.stability * 0.8);
                if (cell.type === 'PLAIN') {
                    this.worldCtx.fillStyle = '#1a3a1a'; // Dim green symbol
                    this.worldCtx.font = `italic ${this.worldCellSize * 0.5}px "Cormorant Garamond"`;
                    this.worldCtx.fillText(cell.symbol, px + this.worldCellSize * 0.5, py + this.worldCellSize * 0.5);
                } else {
                    this.worldCtx.fillStyle = '#ffffff';
                    this.worldCtx.fillText(typeData.emoji, px + this.worldCellSize * 0.5, py + this.worldCellSize * 0.5);
                }
            }
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

            const groupSet = new Set(this.hoveredGroup);
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
                    } else if (!groupSet.has(this.grid[ny][nx])) {
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
            this.drawLocalPeople(this.viewTransition.fromX, this.viewTransition.fromY, -dx * shift, -dy * shift);
            this.drawLocalGrid(this.viewTransition.toX, this.viewTransition.toY, offsetX, offsetY);
            this.drawLocalPeople(this.viewTransition.toX, this.viewTransition.toY, offsetX, offsetY);
        } else {
            this.drawLocalGrid(this.player.worldX, this.player.worldY, 0, 0);
            this.drawLocalPeople(this.player.worldX, this.player.worldY, 0, 0);
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
        if (!cell || cell.population <= 0) return;
        if (cell.type !== 'VILLAGE' && cell.type !== 'CITY') return;

        const count = this.getLocalPeopleCount(cell);
        if (count <= 0) return;

        const people = this.getLocalPeople(worldX, worldY, count);
        const fontSize = Math.max(12, this.viewCellSize * 0.7);

        for (let i = 0; i < people.length; i++) {
            const person = people[i];
            const bob = (person.isDead || person.isZombie)
                ? 0
                : Math.sin((this.animationClock * 3) + person.bobPhase) * this.viewCellSize * 0.03;
            const px = (person.x + 0.5) * this.viewCellSize + offsetX;
            const py = (person.y + 0.5) * this.viewCellSize + offsetY + bob;

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
                this.viewCtx.fillText('❗', px, py - fontSize * 0.55);
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
            const speed = 0.45 + rng() * 1.05;
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
                targetId: null
            });
        }

        this.localPeople.set(key, { type, count, people });
        return people;
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
        const showEmoji = (type === 'VILLAGE' || type === 'CITY') ? true : emojiSeed < density;
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
                this.player.worldX = worldX;
                this.player.worldY = worldY;
                this.player.localX = localX;
                this.player.localY = localY;
                return;
            }
        }

        const fallback = this.findAnyValidPlayerSpot();
        if (fallback) {
            this.player.worldX = fallback.worldX;
            this.player.worldY = fallback.worldY;
            this.player.localX = fallback.localX;
            this.player.localY = fallback.localY;
            return;
        }

        this.player.worldX = Math.floor(Math.random() * CONFIG.GRID_SIZE);
        this.player.worldY = Math.floor(Math.random() * CONFIG.GRID_SIZE);
        this.player.localX = Math.random() * (CONFIG.LOCAL_GRID_SIZE - 1);
        this.player.localY = Math.random() * (CONFIG.LOCAL_GRID_SIZE - 1);
    }

    startAnimationLoop() {
        const loop = (time) => {
            const dt = Math.min(0.05, (time - this.lastFrameTime) / 1000);
            this.lastFrameTime = time;
            this.animationClock = (this.animationClock + dt) % 1000;
            this.updatePlayer(dt);
            this.updateViewTransition(dt);
            this.updateLocalPeople(dt);
            this.updateZombies(dt);
            this.render();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    updatePlayer(dt) {
        if (!this.started) return;
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

        if (worldX !== startWorldX || worldY !== startWorldY) {
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
            this.player.worldX = fallback.worldX;
            this.player.worldY = fallback.worldY;
            this.player.localX = fallback.localX;
            this.player.localY = fallback.localY;
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

        if (cell && (cell.type === 'VILLAGE' || cell.type === 'CITY') && cell.cityName) {
            this.tooltip.innerText = cell.cityName;
            // Center tooltip above cursor
            this.tooltip.style.left = `${e.clientX}px`;
            this.tooltip.style.top = `${e.clientY - 20}px`;
            this.tooltip.classList.remove('hidden');

            // Find all connected cells with same name
            this.hoveredGroup = this.getCityGroup(cell);
        } else {
            this.tooltip.classList.add('hidden');
            this.hoveredGroup = null;
        }
    }

    handleViewMouseMove(e) {
        if (!this.started || this.viewMode !== 'game') {
            this.clearNpcHover();
            return;
        }
        if (this.viewTransition && this.viewTransition.active) {
            this.clearNpcHover();
            return;
        }

        const rect = this.viewCanvas.getBoundingClientRect();
        const localX = (e.clientX - rect.left) / this.viewCellSize;
        const localY = (e.clientY - rect.top) / this.viewCellSize;

        const cell = this.grid[this.player.worldY]?.[this.player.worldX];
        if (!cell || cell.population <= 0 || (cell.type !== 'VILLAGE' && cell.type !== 'CITY')) {
            this.clearNpcHover();
            return;
        }

        const count = this.getLocalPeopleCount(cell);
        if (count <= 0) {
            this.clearNpcHover();
            return;
        }

        const people = this.getLocalPeople(this.player.worldX, this.player.worldY, count);
        let closestAlive = null;
        let closestAliveDist = CONFIG.NPC_HOVER_RADIUS;
        let closestGrave = null;
        let closestGraveDist = CONFIG.NPC_HOVER_RADIUS;

        for (const person of people) {
            const dx = person.x + 0.5 - localX;
            const dy = person.y + 0.5 - localY;
            const dist = Math.hypot(dx, dy);
            if (person.isDead) {
                if (dist <= closestGraveDist) {
                    closestGrave = person;
                    closestGraveDist = dist;
                }
                continue;
            }
            if (person.isZombie) continue;
            if (dist <= closestAliveDist) {
                closestAlive = person;
                closestAliveDist = dist;
            }
        }

        const canInteractAlive = closestAlive
            && Math.hypot(this.player.localX - closestAlive.x, this.player.localY - closestAlive.y) <= CONFIG.NPC_INTERACT_RANGE;
        const canInteractGrave = closestGrave
            && Math.hypot(this.player.localX - closestGrave.x, this.player.localY - closestGrave.y) <= CONFIG.NPC_INTERACT_RANGE;

        if (!canInteractAlive && !canInteractGrave) {
            this.clearNpcHover();
            return;
        }

        const aliveIsCloser = canInteractAlive
            && (!canInteractGrave || closestAliveDist <= closestGraveDist);

        if (aliveIsCloser) {
            this.hoveredNpc = { worldX: this.player.worldX, worldY: this.player.worldY, person: closestAlive };
            this.hoveredGrave = null;
            this.viewCanvas.classList.add('cursor-sword');
            this.viewCanvas.classList.remove('cursor-curse');
            return;
        }

        if (canInteractGrave) {
            this.hoveredGrave = { worldX: this.player.worldX, worldY: this.player.worldY, person: closestGrave };
            this.hoveredNpc = null;
            this.viewCanvas.classList.add('cursor-curse');
            this.viewCanvas.classList.remove('cursor-sword');
            return;
        }

        this.clearNpcHover();
    }

    handleViewClick(e) {
        if (!this.started) return;
        if (this.viewMode !== 'game') return;
        if (this.hoveredGrave?.person) {
            this.raiseZombie(this.hoveredGrave.person);
            this.hoveredGrave = null;
            return;
        }
        if (!this.hoveredNpc) return;
        const { worldX, worldY, person } = this.hoveredNpc;
        if (!person || person.isDead) return;

        const distToPlayer = Math.hypot(this.player.localX - person.x, this.player.localY - person.y);
        if (distToPlayer > CONFIG.NPC_INTERACT_RANGE) return;

        person.isDead = true;
        person.hasTarget = false;
        person.idle = 999;
        person.speed = 0;

        this.deathSeverity += 1;
        this.clearNpcHover();
    }

    clearNpcHover() {
        this.hoveredNpc = null;
        this.hoveredGrave = null;
        this.viewCanvas.classList.remove('cursor-sword');
        this.viewCanvas.classList.remove('cursor-curse');
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
    }

    updateZombies(dt) {
        if (!this.started) return;
        if (this.viewMode !== 'game') return;
        if (this.viewTransition && this.viewTransition.active) return;

        const cell = this.grid[this.player.worldY]?.[this.player.worldX];
        if (!cell || cell.population <= 0 || (cell.type !== 'VILLAGE' && cell.type !== 'CITY')) return;

        const count = this.getLocalPeopleCount(cell);
        if (count <= 0) return;

        const grid = this.getLocalGrid(this.player.worldX, this.player.worldY);
        const people = this.getLocalPeople(this.player.worldX, this.player.worldY, count);

        for (const zombie of people) {
            if (!zombie.isZombie) continue;
            zombie.alertTimer = Math.max(0, zombie.alertTimer - dt);

            let target = null;
            let targetDist = CONFIG.ZOMBIE_SIGHT_RADIUS;
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

            if (target && zombie.targetId !== target.id) {
                zombie.alertTimer = CONFIG.ZOMBIE_ALERT_DURATION;
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

            if (target && targetDist <= CONFIG.ZOMBIE_ATTACK_RADIUS) {
                target.isDead = true;
                target.isZombie = false;
                target.hasTarget = false;
                target.idle = 999;
                target.speed = 0;
                if (this.hoveredNpc?.person === target) {
                    this.clearNpcHover();
                }
            }
        }
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
            this.renderWorld();
        }
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
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

const game = new Game();

/**
 * Skill Hooks
 */
window.advanceTime = (ms) => {
    const turns = Math.floor(ms / CONFIG.TURN_DURATION);
    for (let i = 0; i < turns; i++) {
        game.step();
    }
    game.render();
};

window.render_game_to_text = () => {
    const state = {
        gridSize: CONFIG.GRID_SIZE,
        deathSeverity: game.deathSeverity,
        isPaused: game.isPaused,
        sampleCells: [
            game.grid[0][0],
            game.grid[Math.floor(CONFIG.GRID_SIZE / 2)][Math.floor(CONFIG.GRID_SIZE / 2)]
        ]
    };
    return JSON.stringify(state);
};
