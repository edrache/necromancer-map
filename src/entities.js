import { CELL_TYPES, CONFIG } from './config.js';

export class Cell {
    constructor(x, y, type = 'PLAIN') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.population = (type === 'VILLAGE') ? 10 : (type === 'CITY' ? 50 : 0);
        this.sustain = 0;
        this.stability = 1.0;
        this.regionId = -1;
        this.targetSustain = 0;
        this.cityName = null;
        this.discovered = false;
        this.discoveryAlpha = 0;

        this.symbol = Math.random() < 0.5 ? ',' : '.';
    }
}

export class Region {
    constructor() {
        this.cells = [];
        this.sustainCapacity = 0;
        this.populationDemand = 0;
        this.deathSeverity = 0;
        this.stability = 1.0;
        this.id = -1;
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

export class DeathSource {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.turnsLeft = 5;
    }
}
