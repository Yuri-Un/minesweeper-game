import {Board, gameMode, newGame} from '../lib/scripts/minesweeper-mod.js';

const board = new Board('game', gameMode.EASY_MODE);
newGame(board);