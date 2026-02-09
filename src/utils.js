import { CITY_PREFIX_WORDS, VILLAGE_NAME_LISTS, VILLAGE_NAME_WEIGHTS } from './config.js';

export function pickWeighted(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of items) {
        roll -= item.weight;
        if (roll <= 0) return item;
    }
    return items[items.length - 1];
}

export function pickFromWeights(weightMap) {
    const entries = Object.entries(weightMap).map(([type, weight]) => ({ type, weight }));
    const chosen = pickWeighted(entries);
    return chosen.type;
}

export function hash01(...values) {
    let h = 2166136261;
    for (const value of values) {
        h ^= (value | 0);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
}

export function expandOptionalSuffix(value) {
    if (!value.includes("(s)")) return value;
    return Math.random() < 0.5 ? value.replace("(s)", "") : value.replace("(s)", "s");
}

export function generateVillageName() {
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

export function stripKnownPrefixWord(name) {
    if (!name) return "";
    const parts = name.split(" ");
    if (parts.length <= 1) return name;
    const first = parts[0];
    if (CITY_PREFIX_WORDS.includes(first)) {
        return parts.slice(1).join(" ");
    }
    return name;
}

export function generateDerivedName(baseName, existingNames) {
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
