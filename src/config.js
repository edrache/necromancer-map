export const CONFIG = {
    GRID_SIZE: 20,
    CELL_SIZE: 32,
    LOCAL_GRID_SIZE: 20,
    VIEW_CELL_SIZE: 28,
    PLAYER_SPEED: 4.5,
    VIEW_TRANSITION_DURATION: 0.22,
    TURN_DURATION: 1000,
    DIFFUSION_RATE: 0.22,
    CONSUMPTION_RATE: 0.6,
    EXPANSION_THRESHOLD: 0.1,
    REGRESSION_THRESHOLD: 0.3,
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
    NPC_INTERACT_RANGE: 1.6,
    NPC_HOVER_RADIUS: 0.85,
    NPC_WITNESS_RADIUS: 4.2,
    NPC_ALERT_DURATION: 4.5,
    NPC_ATTACK_RADIUS: 0.65,
    NPC_SIGHT_RADIUS: 4.8,
    ZOMBIE_SPEED_MIN: 0.85,
    ZOMBIE_SPEED_MAX: 1.6,
    ZOMBIE_ATTACK_RADIUS: 0.7,
    ZOMBIE_SIGHT_RADIUS: 3.2,
    ZOMBIE_ALERT_DURATION: 0.8,
    ZOMBIE_COLLIDER_RADIUS: 0.28,
    ZOMBIE_AVOID_PLAYER_RADIUS: 0.75,
    ZOMBIE_FOLLOW_RADIUS: 5,
    ANIMAL_SPEED_MIN: 0.5,
    ANIMAL_SPEED_MAX: 1.1,
    ANIMAL_ATTACK_RADIUS: 0.7,
    ANIMAL_SIGHT_RADIUS: 4.6,
    ANIMAL_HOVER_RADIUS: 0.85,
    ANIMAL_FOLLOW_RADIUS: 5.4
};

export const CELL_TYPES = {
    PLAIN: { emoji: '🌱', sustainProduce: 0, sustainConsume: 0.1, color: '#050505' },
    FOREST: { emoji: '🌲', sustainProduce: 2.0, sustainConsume: 0, color: '#0a2a0a' },
    WATER: { emoji: '🌊', sustainProduce: 1.5, sustainConsume: 0, color: '#0a1a2a' },
    VILLAGE: { emoji: '🏡', sustainProduce: 0, sustainConsume: 1.0, color: '#2a2a0a' },
    CITY: { emoji: '🏙️', sustainProduce: 0, sustainConsume: 3.0, color: '#2a0a2a' },
    MOUNTAIN: { emoji: '⛰️', sustainProduce: 0, sustainConsume: 0, color: '#1a1a1a' }
};

export const VILLAGE_NAME_LISTS = {
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

export const VILLAGE_NAME_WEIGHTS = [
    { type: 'list', list: 'towns1', weight: 1 },
    { type: 'list', list: 'towns2', weight: 1 },
    { type: 'list', list: 'towns3', weight: 1 },
    { type: 'list', list: 'towns4', weight: 1 },
    { type: 'ironsworn', weight: 5 }
];

export const CITY_PREFIX_WORDS = [
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

export const LOCAL_BASE_WEIGHTS = {
    PLAIN: { PLAIN: 0.72, FOREST: 0.15, WATER: 0.06, MOUNTAIN: 0.07 },
    FOREST: { FOREST: 0.7, PLAIN: 0.18, WATER: 0.05, MOUNTAIN: 0.07 },
    WATER: { WATER: 0.7, PLAIN: 0.18, FOREST: 0.06, MOUNTAIN: 0.06 },
    MOUNTAIN: { MOUNTAIN: 0.68, PLAIN: 0.2, FOREST: 0.06, WATER: 0.06 },
    VILLAGE: { PLAIN: 0.7, FOREST: 0.12, WATER: 0.08, MOUNTAIN: 0.05, VILLAGE: 0.05 },
    CITY: { PLAIN: 0.6, FOREST: 0.1, WATER: 0.1, MOUNTAIN: 0.05, CITY: 0.15 }
};

export const LOCAL_VIEW_COLORS = {
    PLAIN: { h: 110, s: 14, l: 15, v: 2 },
    FOREST: { h: 125, s: 18, l: 13, v: 2 },
    WATER: { h: 205, s: 18, l: 13, v: 2 },
    MOUNTAIN: { h: 220, s: 8, l: 15, v: 2 },
    VILLAGE: { h: 36, s: 14, l: 16, v: 2 },
    CITY: { h: 255, s: 10, l: 16, v: 2 }
};

export const LOCAL_VIEW_EMOJIS = {
    PLAIN: ['🌿', '🌱', '🍃'],
    FOREST: ['🌲', '🌳', '🌲'],
    WATER: ['🌊', '💧', '🫧'],
    MOUNTAIN: ['⛰️', '🏔️', '🪨', '❄️'],
    VILLAGE: ['🏡', '🛖', '🌾'],
    CITY: ['🏙️', '🏢', '🌆']
};

export const LOCAL_VIEW_EMOJI_DENSITY = {
    PLAIN: 0.22,
    FOREST: 0.25,
    WATER: 0.25,
    MOUNTAIN: 0.2,
    VILLAGE: 0.85,
    CITY: 0.9
};

export const LOCAL_PEOPLE_EMOJIS = [
    '🧑', '👨', '👩', '🧔', '👨‍🌾', '👩‍🌾', '👨‍🏭', '👩‍🏭',
    '👨‍🔧', '👩‍🔧', '👨‍🎨', '👩‍🎨', '👨‍🍳', '👩‍🍳', '👨‍⚕️', '👩‍⚕️'
];

export const ANIMAL_CATALOG = {
    deer: { emoji: '🦌', minHp: 2, maxHp: 4, aggressive: false, provokedAggro: true },
    boar: { emoji: '🐗', minHp: 2, maxHp: 4, aggressive: false, provokedAggro: true },
    wolf: { emoji: '🐺', minHp: 2, maxHp: 4, aggressive: true, provokedAggro: false },
    rabbit: { emoji: '🐇', minHp: 1, maxHp: 2, aggressive: false, provokedAggro: false },
    fox: { emoji: '🦊', minHp: 1, maxHp: 2, aggressive: false, provokedAggro: false },
    chamois: { emoji: '🐐', minHp: 2, maxHp: 4, aggressive: false, provokedAggro: true },
    eagle: { emoji: '🦅', minHp: 1, maxHp: 3, aggressive: false, provokedAggro: true },
    mouflon: { emoji: '🐏', minHp: 2, maxHp: 4, aggressive: false, provokedAggro: true },
    fish: { emoji: '🐟', minHp: 1, maxHp: 2, aggressive: false, provokedAggro: false },
    otter: { emoji: '🦦', minHp: 1, maxHp: 3, aggressive: false, provokedAggro: false },
    duck: { emoji: '🦆', minHp: 1, maxHp: 2, aggressive: false, provokedAggro: false }
};

export const ANIMALS_BY_AREA = {
    PLAIN: ['deer', 'rabbit', 'fox', 'wolf'],
    FOREST: ['deer', 'boar', 'wolf'],
    WATER: ['fish', 'otter', 'duck'],
    MOUNTAIN: ['chamois', 'eagle', 'mouflon'],
    VILLAGE: [],
    CITY: []
};

export const WORLD_TYPE_LABELS = {
    PLAIN: "Plains",
    FOREST: "Forest",
    WATER: "Water",
    MOUNTAIN: "Mountain",
    VILLAGE: "Village",
    CITY: "City"
};
