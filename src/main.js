import { CONFIG } from './config.js';
import { Game } from './game.js';

const game = new Game();

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
        year: game.year,
        isPaused: game.isPaused,
        cemeteries: Array.from(game.cemeteries.values()).map((cemetery) => ({
            cityName: cemetery.cityName,
            worldX: cemetery.x,
            worldY: cemetery.y,
            graves: cemetery.graveCount
        })),
        sampleCells: [
            game.grid[0][0],
            game.grid[Math.floor(CONFIG.GRID_SIZE / 2)][Math.floor(CONFIG.GRID_SIZE / 2)]
        ]
    };
    return JSON.stringify(state);
};
