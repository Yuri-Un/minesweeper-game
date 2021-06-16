//Global constants and variables
const menuElem = document.querySelector('#menu');
const menuIcoElem = document.querySelector('#menu img');
const menuListElem = document.querySelector('.popup-menu');
const refreshIcoElem = document.querySelector('#refresh');
const newGameMenuElem = document.querySelector('#new-game');
const restartGameMenuElem = document.querySelector('#restart-game');
const nextGameMenuElem = document.querySelector('#next-game');
const aboutGameMenuElem = document.querySelector('#about-game');

const timerElem = document.querySelector('#timer');
const flagsElem = document.querySelector('#flags');
const minesElem = document.querySelector('#mines');

//Global events
menuElem.addEventListener('click', menuHandler, false);
refreshIcoElem.addEventListener('click', refreshWindowHandler, false);

newGameMenuElem.addEventListener('click', newGameMenuHandler, false);
restartGameMenuElem.addEventListener('click', restartGameMenuHandler, false);
nextGameMenuElem.addEventListener('click', nextGameMenuHandler, false);
aboutGameMenuElem.addEventListener('click', aboutGameMenuHandler, false);
//Main functions (Enter point)
initStyles();

//Minesweeper module initialization
import {Board, gameMode, newGame, restartGame, nextGame} from '../lib/scripts/minesweeper-mod.js';
const board = new Board('game', gameMode.EASY_MODE);
newGame(board);

board.domElement.addEventListener('ms-timer', timerHandler, false);
board.domElement.addEventListener('ms-flags', flagsHandler, false);
board.domElement.addEventListener('ms-mines', minesHandler, false);


//Private functions library
function initStyles(){
    const menuIconParams = menuIcoElem.getBoundingClientRect();
    const menuButtonParams = menuElem.getBoundingClientRect();

    document.documentElement.style.setProperty('--game-menu-top', menuButtonParams.bottom + 'px');
    document.documentElement.style.setProperty('--game-menu-left', menuIconParams.left + 'px');

    console.table(menuIconParams);

}


//Event handlers
function menuHandler(e){
    if(menuIcoElem.getAttribute('status') === 'normal'){
        menuListElem.style.display = 'block';
        menuIcoElem.src = '../styles/images/delete.png';
        menuIcoElem.setAttribute('status', 'close');
    }
    else{
        menuListElem.style.display = 'none';
        menuIcoElem.src = '../styles/images/menu-button-of-three-horizontal-lines.png';
        menuIcoElem.setAttribute('status', 'normal');
    }
}

function newGameMenuHandler(e){
    if(board === null) return;

    newGame(board);
}

function restartGameMenuHandler(e){
    if(board === null) return;

    restartGame(board);
}

function nextGameMenuHandler(e){
    if(board === null) return;

    nextGame(board);
}

function aboutGameMenuHandler(e){
    location.assign('../about.html');
}


function refreshWindowHandler(e){
    location.reload();
}

function timerHandler(e){
    const timer = e.detail.timer;
    timerElem.innerText = timer;
}

function flagsHandler(e){
    const flags = e.detail.flags;
    flagsElem.innerText = flags;
}

function minesHandler(e){
    const mines = e.detail.mines;
    minesElem.innerText = mines;
}