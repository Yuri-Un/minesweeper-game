/****************************************************************
*                  Minesweeper Videogame Module                 *
*                                                               *
*  Author: Yuri Un                                              *
*  Date: April 2021                                             *
*****************************************************************/

//==============================================================
//                      USER DEFINED TYPES
//==============================================================

//The main data type. Defines the board properties and methods.
export class Board{
    constructor(id, mode){
        //check for the main required parameters
        if(id.length <= 0 || id === undefined){
            errorLog("Board DOM id is missing");
            return;
        }
        if(mode === undefined){
            errorLog("Game mode is not defined");
            return;
        }

        //class properties
        this.ID = id; //external DOM Element id
        this.domElement = document.getElementById(id); //DOM Element object
        this.width = this.domElement.parentElement.clientWidth;
        this.height = 300;
        if(this.domElement.parentElement.nodeName === 'BODY'){
            this.height = docViewProperties.screenHeight;
        }else{
            this.height = this.domElement.parentElement.clientHeight;
        }
        this.aspectRatio = this.width/this.height;
        
        this.updateGameMode(mode);

        this.openCells = 0; //the counter for opened cells from total (rows*columns)
        this.flags = 0; //flag markers
        this.field = []; //board cell matrix
        //this.enabledCookies = false;
        this.gameStarted = false;
        this.gameOver = false; //lose status
        this.gamePaused = false; 
        this.winCondition = false; //win status

        //class composition properties
        this.timer = new Timer();
        this.cookies = new CookiesManager();

        //class custom defined events
        this.flagEvent = new CustomEvent('ms-flags', {
            detail: {flags: this.flags},
            bubbles: true,
            cancelable: true,
            composed: false
        });
        this.mineEvent = new CustomEvent('ms-mines', {
            detail: {mines: this.mines},
            bubbles: true,
            cancelable: true,
            composed: false
        });
        this.timerEvent = new CustomEvent('ms-timer', {
            detail: {timer: this.timer.getTimer()},
            bubbles: true,
            cancelable: true,
            composed: false
        })
    }

    //Event publisher
    raiseFlagEvent(){
        this.flagEvent.detail.flags = this.flags;
        this.domElement.dispatchEvent(this.flagEvent);
    }

    //Event publisher
    raiseMineEvent(){
        this.mineEvent.detail.mines = this.mines;
        this.domElement.dispatchEvent(this.mineEvent);
    }

    //Event publisher
    raiseTimerEvent(){
        this.timerEvent.detail.timer = this.timer.getTimer();
        this.domElement.dispatchEvent(this.timerEvent);
    }

    //Reusable status method
    updateSize(){
        this.width = this.domElement.clientWidth;
        this.height = this.domElement.clientHeight;
        this.aspectRatio = this.width/this.height;
    }

    //Reusable status method
    updateGameMode(mode){
        this.mode = mode;
        this.scale = this.initBoardScale();
        this.setupScale();
    }

    //Reusable status method
    setupScale(){
        this.rows = this.scale.rows; //board rows
        this.columns = this.scale.columns; //board columns
        this.cells = this.scale.cells; //rows*columns
        this.mines = this.scale.mines; //total amount of mines (game difficulty)
    }

    //Initializes board properties based on the game settings and game mode
    initBoardScale(){
        const squareBase = Math.ceil(Math.sqrt(this.mode.difficultyRank));
        let cellSize = 50;
        let rows = 0;
        let columns = 0;
        let mines = 0;

        const gridGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ms-grid-gap'));
        const boardMargin = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ms-margin'));
        const boardPaddingTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ms-padding'));
        const boardBorderWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ms-border-width'));

        const boardHeight = this.height - 2*(boardMargin + boardPaddingTop + boardBorderWidth);
        const boardWidth = this.width - 2*(boardMargin + boardPaddingTop + boardBorderWidth);
        let gridGapTotal = 0;

        if(docViewProperties.aspectRatio >= 1){
            columns = squareBase + Math.ceil(this.aspectRatio);
            cellSize = boardWidth/columns;

            while(rows*cellSize <= boardHeight - gridGapTotal - cellSize){
                rows++;
                gridGapTotal = (rows - 1)*gridGap;
            }
        }
        else{
            columns = squareBase;
            cellSize = boardWidth/columns;

            while(rows*cellSize <= boardHeight - gridGapTotal - cellSize){
                rows++;
                gridGapTotal = (rows - 1)*gridGap;
            }
        }
        
        const cells = rows*columns;

        switch(this.mode.difficultyMode){
            case 'easy':
                mines = getRandomRangeInt(Math.floor(cells/6), Math.ceil(cells/5));
            break;

            case 'normal':
                mines = getRandomRangeInt(Math.floor(cells/5), Math.ceil(cells/4));
            break;

            case 'hard':
                mines = getRandomRangeInt(Math.floor(cells/4), Math.ceil(cells/3));
            break;

            default:
                mines = getRandomRangeInt(Math.floor(cells/6), Math.ceil(cells/4));
        }

        return {rows: rows, columns: columns, cells: cells, mines: mines};
    }

    //Increases the game difficulty for Next Game menu option
    incGameDifficulty(){
        if(!gameSettings.isDefaultDifficulty){
            return;
        }

        if(this.width/50 < Math.sqrt(this.mode.difficultyRank)){
            warningLog("Game difficulty reached its max value");
            return;
        }

        this.mode.difficultyRank = Number.parseInt(this.mode.difficultyRank);
        this.mode.difficultyRank += 25;
        this.scale = this.initBoardScale();
        this.setupScale();

        this.raiseMineEvent();
    }

    //Manages class timer
    updateBoardTimer(){
        if(this.gamePaused){
            this.timer.pauseTimer();
            return;
        }
        this.timer.startTimer(this);
    }

    pauseGame(){
        this.gamePaused = true;

        this.updateBoardTimer();
    }

    restoreGame(){
        this.gamePaused = false;

        this.updateBoardTimer();
    }

    //Resets the general game status without affecting the board configuration
    resetStatus(){
        this.gameStarted = false;
        this.gameOver = false;
        this.gamePaused = false;
        this.winCondition = false;

        this.timer.resetTimer();
    }
}

//A supportive data type. Generates and saves available game modes.
class GameMode{
    constructor(customGameMode){
        this.TEST_MODE = this.getEasyMode(); //{rows: 5, columns: 5, mines: 5};
        this.EASY_MODE = this.getEasyMode();
        this.NORMAL_MODE = this.getNormalMode();
        this.HARD_MODE = this.getHardMode();
        this.CUSTOM_MODE = this.getCustomMode(customGameMode);
        this.RANDOM_MODE =this.getRandomMode();
    }

    updateMode(){
        this.EASY_MODE = this.getEasyMode();
        this.NORMAL_MODE = this.getNormalMode();
        this.HARD_MODE = this.getHardMode();
        this.RANDOM_MODE =this.getRandomMode();
    }

    getEasyMode(){
        let difficultyRank = getRandomRangeInt(50, 100);

        return {difficultyMode: 'easy', difficultyRank: difficultyRank, color: getRandomMapValue(cellColors), style: cellStyles[0]};
    }

    getNormalMode(){
        let difficultyRank = getRandomRangeInt(getMinDifficultyRank(), getMidDifficultyRank());

        return {difficultyMode: 'normal', difficultyRank: difficultyRank, color: getRandomMapValue(cellColors), style: cellStyles[0]};
    }

    getHardMode(){
        const difficultyRank = getRandomRangeInt(getMidDifficultyRank(), getMaxDifficultyRank());

        return {difficultyMode: 'hard', difficultyRank: difficultyRank, color: getRandomMapValue(cellColors), style: cellStyles[0]};
    }

    getCustomMode(settings){
        let difficulty = getRandomRangeInt(50, 100);
        let color = getRandomMapValue(cellColors);

        if(!settings.isDefaultDifficulty){
            difficulty = settings.difficulty;
        }
        if(!settings.isDefaultColor){
            color = settings.cellColor;
        }

        return {difficultyMode: 'custom', difficultyRank: difficulty, color: color, style: settings.cellStyle};
    }

    setCustomMode(settings){
        this.CUSTOM_MODE = this.getCustomMode(settings);
    }

    getRandomMode(){
        const difficultyRank = getRandomRangeInt(getMinDifficultyRank(), getMaxDifficultyRank());
       
        return {difficultyMode: 'random', difficultyRank: difficultyRank, color: getRandomMapValue(cellColors), style: cellStyles[0]};
    } 
}

//Supports data processing algorithms.
class Node{
    constructor(row, column){
        this.nodeId = row + ':' + column; //DOM Element id
        this.row = row; //A binding to the matrix row
        this.column = column; //A binding to the matrix column
        this.visited = false;  //True if a node is processed/visited
        this.nodeLinks = []; //Array of links to zero-based sibling nodes
    }
    
    static nodeMap = [];
}

//Reads and computes the browser overlay properties. Supportive class.
class DocViewProperties{
    constructor(){
        this.refresh();
    }
    
    refresh(){
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
        this.aspectRatio = this.getAspectRatio();
        this.orientation = this.getOrientation();
        this.scrollBarWidth =  this.getScrollbarWidth();
        this. resizeTimer = null;
    }
    
    getAspectRatio(){
        return this.screenWidth/this.screenHeight;
    }
    
    getOrientation(){
        let result = "album";
        
        if(this.aspectRatio < 1) result = 'portrait';
        if(this.aspectRatio === 1) result = 'square';
        // if(this.aspectRatio > 1) result = 'album';
        
        return result;
    }
    
    getScrollbarWidth(){
        // Creating invisible container
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll';
        outer.style.msOverflowStyle = 'scrollbar';
        document.body.appendChild(outer);
        
        // Creating inner element and placing it in the container
        const inner = document.createElement('div');
        outer.appendChild(inner);
        
        // Calculating difference between container's full width and the child width
        const scrollbarWidth = (outer.offsetWidth - inner.offsetWidth);
        
        // Removing temporary elements from the DOM
        outer.parentNode.removeChild(outer);
        
        return scrollbarWidth;
    }
}

//Supports in game timer management. The Board class property.
class Timer{
    constructor(){
        this.hour = 0;
        this.minute = 0;
        this.second = 0;
        this.timer = null;
    }

    startTimer(sender){
        this.pauseTimer();
        this.timer = setInterval(() => {
            this.counter();
            sender.raiseTimerEvent();
        }, 1000);
    }

    pauseTimer(){
        clearInterval(this.timer);
        this.timer = null;
    }

    resetTimer(){
        this.hour = 0;
        this.minute = 0;
        this.second = 0;
    }

    getTimer(){
        if(this.hour > 0){
            return this.toString(this.hour) + ':' + this.toString(this.minute) + ':' + this.toString(this.second);
        }

        return this.toString(this.minute) + ':' + this.toString(this.second);
    }

    counter(){
        this.second++;

        if(this.second === 60){
            this.second = 0;
            this.minute++;
        }
        if(this.minute === 60){
            this.minute = 0;
            this.hour++;
        }
        if(this.hour > 24) this.resetTimer();
    }

    toString(digit){
        return digit >= 10 ? digit: `0${digit}`;
    }
}

//Supports in game cookie files (local storage) management. The Board class property.
class CookiesManager{
    constructor(){
        if(this.isSavedCookies()){
            this.loadCookies();
        }
        else{
            this.enabledCookies = false;
        }
    }

    isSavedCookies(){
        const data = localStorage.getItem('ms-game-cookies');
        if(data === null) return false;

        return true;
    }

    enableCookies(){
        this.enabledCookies = true;

        const data = JSON.stringify(this);
        localStorage.setItem('ms-game-cookies', data);
    }

    disableCookies(){
        this.enabledCookies = false;
        this.clearCookies();
    }

    loadCookies(){
        const data = JSON.parse(localStorage.getItem('ms-game-cookies'));
        this.enabledCookies = data.enabledCookies;
    }

    clearCookies(){
        if(!this.isSavedCookies()){
            return;
        }

        localStorage.removeItem('ms-game-cookies');
    }
}

//Supports in game settings menu. Determines the properties of CUSTOM game mode.
class GameSettings{
    constructor(){
        if(this.isSavedSettings()){
            this.loadSettings();
            return;
        }
        
        this.setDefault();
    }

    isSavedSettings(){
        const data = localStorage.getItem('ms-settings');
        if(data === null) return false;

        return true;
    }

    isDefaultSettings(){
        let result = true;

        result &&= this.isDefaultDifficulty;
        result &&= this.isDefaultColor;
        if(this.cellStyle !== "Square") result &&= false;
        if(this.sounds !== "On") result &&= false;

        return result;
    }

    saveSettings(){
        const data = JSON.stringify(this);
        localStorage.setItem('ms-settings', data);
    }

    loadSettings(){
        const data = JSON.parse(localStorage.getItem('ms-settings'));
        
        this.isDefaultDifficulty = data.isDefaultDifficulty;
        this.difficulty = data.difficulty;
        this.isDefaultColor = data.isDefaultColor;
        this.cellColor = data.cellColor;
        this.cellStyle = data.cellStyle;
        this.sounds = data.sounds;
    }

    clearSettings(){
        if(!this.isSavedSettings()){
            return;
        }

        localStorage.removeItem('ms-settings');
    }

    setDefault(){
        this.isDefaultDifficulty = true;
        this.difficulty = 50;
        this.isDefaultColor = true;
        this.cellColor = {r: 71, g: 92, b: 108};
        this.cellStyle = cellStyles[0];
        this.sounds = switchSelector[0];
    }
}

class ConfigFile{
    constructor(){
        this.path = this.getRelPath();
        this.loaded = false;
    }

    async getRelPath(){
        let result = '.';

        await fetch(location.origin + '/minesweeper-config.json')
        .then(response => response.json())
        .then(data => {
            result = data.path; 
            this.loaded = true;
        })
        .catch(error => {
            warningLog('Configuration file not found! The module sound effects may be disabled! \nCheck the README documentation at https://github.com/Yuri-Un/minesweeper \n');
        });

        return result;
    }
}


//==============================================================
//                      PUBLIC GAME OBJECTS
//==============================================================
let board = {};
let firstRun = false;
const cellStyles = ['Square', 'Rounded', 'Circle'];
const switchSelector = ['On', 'Off'];

//Async file loader. Path to the root directory configuratioin
const configFile = new ConfigFile();
const relPath = await configFile.path;

export const audioFiles = new Map();
audioFiles.set('click', {file: relPath + '/styles/sounds/click.mp3'});
audioFiles.set('open-cell', {file: relPath + '/styles/sounds/open-cell.mp3'});
audioFiles.set('drop-flag', {file: relPath + '/styles/sounds/drop-flag.mp3'});

export const cellColors = new Map();
cellColors.set('Darkblue', {r: 71, g: 92, b: 108});
cellColors.set('Blue', {r: 31, g: 119, b: 180});
cellColors.set('Lightblue', {r: 165, g: 181, b: 193});
cellColors.set('Darkgray', {r: 71, g: 68, b: 68});
cellColors.set('Gray', {r: 133, g: 128, b: 125});
cellColors.set('Orange', {r: 197, g: 120, b: 73});
cellColors.set('Darkred', {r: 172, g: 114, b: 114});
cellColors.set('Red', {r: 206, g: 141, b: 141});
cellColors.set('Darkgreen', {r: 4, g: 88, b: 62});
cellColors.set('Green', {r: 88, g: 148, b: 116});
cellColors.set('Blue-green', {r: 44, g: 84, b: 75});
cellColors.set('Violet', {r: 148, g: 103, b: 189});
cellColors.set('Darkviolet', {r: 98, g: 41, b: 111});

const docViewProperties = new DocViewProperties();
const gameSettings = new GameSettings();
export const gameMode = new GameMode(gameSettings);


//==============================================================
//                      PUBLIC GAME FUNCTIONS
//==============================================================
export function newGame(gameObject){
    //Singleton emulation
    let mode = null;
    
    switch(gameObject.mode.difficultyMode){
        case 'easy':
            mode = gameMode.getEasyMode();
        break;
            
        case 'normal':
            mode = gameMode.getNormalMode();
        break;
        
        case 'hard':
            mode = gameMode.getHardMode();            
        break;
        
        case 'custom':
            mode = gameObject.mode;
        break;

        default:
            mode = gameMode.getRandomMode();
    }

    if(!gameSettings.isDefaultSettings()){
        mode = gameMode.getCustomMode(gameSettings);
    }

    if(!firstRun){
        board = gameObject;
        board.updateGameMode(gameObject.mode);
    }    
    else{
        board = new Board(gameObject.ID, mode);
    }
    
    renderBoard(board.ID, initBoard(board));

    if(!firstRun){
        mainMenu();
    }
    
    firstRun = true; //the only place where the variable is changed
}

export function restartGame(board){
    board.resetStatus();
    renderBoard(board.ID, initBoard(board));
}

export function nextGame(board){
    board.resetStatus();
    board.incGameDifficulty();

    renderBoard(board.ID, initBoard(board));
}


//==============================================================
//                      PRIVATE GAME FUNCTIONS
//==============================================================
function initBoard(board){
    //set initial board properties
    Node.nodeMap = [];
    board.flags = 0;
    board.openCells = 0;

    board.raiseMineEvent();
    board.raiseFlagEvent();
    board.raiseTimerEvent();

    //create Model
    return createBoard(board.rows, board.columns, board.mines);
}

function createBoard(rows, columns, mines){
    board.field = new Array(rows);

    for (let row = 0; row < board.field.length; row++) {
        board.field[row] = new Array(columns);
        board.field[row].fill(0);
    }

    setMines(board, mines);
    setMineRadar(board);

    return board;
}

//Set mines on the board one by one recursively
function setMines(board, mines){
    let minesLeft = mines;
    const maxMinesPerRow = Math.round(board.columns/7);
    let minesPerRowCounter = 0;

    for (let row = 0; row < board.field.length; row++) {
        for (let column = 0; column < board.field[row].length; column++) {
            let element = board.field[row][column];

            if(element === -1) continue;

            if(getRandomInt() > 95 && minesPerRowCounter < maxMinesPerRow){
                board.field[row][column] = -1;
                minesLeft--;
                minesPerRowCounter++;

                if(minesLeft <= 0) return;
            }
        }
        minesPerRowCounter = 0;
    }

    setMines(board, minesLeft);
}

//Set mine's proximity map overlay
function setMineRadar(board){
    for (let row = 0; row < board.field.length; row++) {
        for (let column = 0; column < board.field[row].length; column++) {
            const element = board.field[row][column];

            if(element !== -1){
                board.field[row][column] = countNearbyMines(board, row, column);
            }
        }
    }
}

//A sub-processor for setMineRadar()
function countNearbyMines(board, row, column){
    let result = 0;
    let leftOffsetColumn = column - 1;
    let rightOffsetColumn = column + 1;
    let upperOffsetRow = row - 1;
    let bottomOffsetRow = row + 1;

    if(leftOffsetColumn < 0) leftOffsetColumn = 0;
    if(rightOffsetColumn >= board.field[row].length) rightOffsetColumn = column;
    if(upperOffsetRow < 0) upperOffsetRow = 0;
    if(bottomOffsetRow >= board.field.length) bottomOffsetRow = row;

    for (let i = upperOffsetRow; i <= bottomOffsetRow; i++) {
        for (let j = leftOffsetColumn; j <= rightOffsetColumn; j++) {
            const element = board.field[i][j];

            if(i === row && j === column) continue;
            if(element === -1) result++;
        }
    }    

    return result;
}

//View-Controller rendering of the board Model.
//id - is the external identifier of HTML-CSS container wrapper
//board - is the internal user defined object
function renderBoard(id, board){
    //setup the board overlay component and styles
    initOverlayObject(id);
    initStyles(board.mode);

    for (let row = 0; row < board.field.length; row++) {
        for (let column = 0; column < board.field[row].length; column++) {
            const nodeValue = board.field[row][column];
           
            const element = createCell(nodeValue, row, column);

            board.domElement.appendChild(element);
        }
    }

    board.domElement.addEventListener("contextmenu", contextMSHandler, false);
    board.domElement.addEventListener("mouseup", boardMSHandler, false);
    window.addEventListener("resize", resizeMSHandler, false);

    UpdateOverlay(board.domElement, board);
    openRandomCells();
}

function initOverlayObject(id){
    if(id.length <= 0){
        errorLog('The DOM component id value is missing');
        return;
    }

    let domBoard = document.getElementById(id);
    
    if(domBoard === null){
        errorLog('Incorrect DOM id');
        return;
    }

    board.ID = id;
    board.domElement = domBoard;
    domBoard.innerHTML = '';

    //A hook to remove the scrollbar clipping glitches while the document is loading.
    //Because the CSS Grid and Flex causes multiple overlay changes while the data is appended.
    // document.documentElement.style.setProperty('--ms-height', '100vh');
    removeBlurBG();
}

function initStyles(mode){
    document.documentElement.style.setProperty('--ms-columns', board.columns);
    document.documentElement.style.setProperty('--ms-rows', board.rows);

    let cellBaseColor = mode.color;
    let cellDarkColor = getDarkRGBColor(cellBaseColor);
    let cellLightColor = getLightRGBColor(cellBaseColor);

    document.documentElement.style.setProperty('--ms-hidden-bg', 'rgb(' + cellBaseColor.r + ', ' + cellBaseColor.g + ', ' + cellBaseColor.b + ')');
    document.documentElement.style.setProperty('--ms-hidden-bg-shadow', 'rgb(' + cellDarkColor.r + ', ' + cellDarkColor.g + ', ' + cellDarkColor.b + ')');
    document.documentElement.style.setProperty('--ms-hidden-bg-hover', 'rgb(' + cellLightColor.r + ', ' + cellLightColor.g + ', ' + cellLightColor.b + ')');

    switch(mode.style){
        case 'Square':
            document.documentElement.style.setProperty('--ms-cell-radius', '0px');
        break;

        case 'Rounded':
            document.documentElement.style.setProperty('--ms-cell-radius', '20%');
        break;

        case 'Circle':
            document.documentElement.style.setProperty('--ms-cell-radius', '50%');
        break;

        default:
            document.documentElement.style.setProperty('--ms-cell-radius', '0px');
    }

    const cellHeight = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ms-cell-height'));
    const fontSize = Math.floor(cellHeight / 3) + 'px';
    document.documentElement.style.setProperty('--ms-font-size', fontSize);

    if(cellHeight < 70){
        document.documentElement.style.setProperty('--ms-open-color', 'rgb(51, 51, 51)');
    }
}

function UpdateOverlay(element, board, isResized = false){
    let domBoard = element;

    //gets the browser scrollbar width
    let scrollBarWidth = docViewProperties.scrollBarWidth;

    //gets the board overlay properties
    let boardStyle = getComputedStyle(domBoard);
    let boardPaddingTop = parseInt(boardStyle.paddingTop);
    let boardPaddingRight = parseInt(boardStyle.paddingRight);
    let boardPaddingBottom = parseInt(boardStyle.paddingBottom);
    let boardPaddingLeft = parseInt(boardStyle.paddingLeft);
    let boardMarginTop = parseInt(boardStyle.marginTop);

    //gets the board inner size
    let boardInnerWidth = domBoard.clientWidth;
    let boardInnerHeight = domBoard.clientHeight;

     //gets the overall gap width of the Grid element
    let gridGap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ms-grid-gap'));
    let gridGapTotalWidth = gridGap*(board.columns - 1);
    let gridGapTotalHeight = gridGap*(board.rows - 1);

    
    let cellWidth = (boardInnerWidth - gridGapTotalWidth - boardPaddingLeft - boardPaddingRight) / board.columns;
    let cellHeight = cellWidth;

    //recomputes the cell size when the scrollbar is active
    let boardHeight = board.rows*cellHeight + gridGapTotalHeight + boardPaddingTop+ boardPaddingBottom + 2*boardMarginTop;
    if(boardHeight > window.innerHeight){
        //a hook to remove the scrollbar clipping glitches while the view is resized.
        boardInnerWidth = isResized?boardInnerWidth + scrollBarWidth: boardInnerWidth;

        cellWidth = (boardInnerWidth - gridGapTotalWidth - boardPaddingLeft - boardPaddingRight - scrollBarWidth) / board.columns;
        cellHeight = cellWidth;
    }
    
    //updates the CSS file vars
    document.documentElement.style.setProperty('--ms-cell-width', cellWidth +  'px');
    document.documentElement.style.setProperty('--ms-cell-height', cellHeight +  'px');

    //remove the CSS hook setup when the rendering is finished
    //document.documentElement.style.setProperty('--ms-height', 'auto');
}

function createCell(value, row, column){
    let spot = document.createElement('div');

    spot.setAttribute('class', 'cell hidden');
    spot.setAttribute('node', row + ':' + column);

    spot.addEventListener('mouseup', clickMSHandler, false);

    return spot;
}

function openRandomCells(){
    const rndRow = getRandomRangeInt(0, board.rows - 1);
    const rndColumn = getRandomRangeInt(0, board.columns - 1);

    for (let row = rndRow; row <= rndRow + 1; row++) {
        for (let column = rndColumn; column <= rndColumn + 1; column++) {
            openRandomCell(row, column);
        }
    }
}

function openRandomCell(cellRow, cellColumn){
    const element = board.field[cellRow][cellColumn];
    const cell = board.domElement.querySelector('[node="' + cellRow + ':' + cellColumn + '"]');

    if(element === -1){
        setupFlag(cell, true);
        return;
    }

    if(element === 0){
        discoverCellsGraph(null, new Node(cellRow, cellColumn), 0);
    }
    else{
        setupFlag(cell, false);

        if(isHiddenCell(cell)) board.openCells++;

        cell.className = "cell open";
        cell.innerText = element !== 0? element: "";
    }
}

//Open [this] cell and change its status. Check the game win/lose condition.
function openCell(cell){
    let cellRow = parseInt(cell.getAttribute("node").split(':')[0]);
    let cellColumn = parseInt(cell.getAttribute("node").split(':')[1]);
    let element = board.field[cellRow][cellColumn];
    
    if(element === -1){
        cell.className = "cell mine";
        
        gameOver();
    }

    if(element === 0){
        //let timerStart = performance.now();
        discoverCellsGraph(null, new Node(cellRow, cellColumn), 0);
        //let timerEnd = performance.now();
        //console.log("Algorithm runtime (ms): " + (timerEnd - timerStart));
    }
    else{
        setupFlag(cell, false);

        if(isHiddenCell(cell)) board.openCells++;

        cell.className = "cell open";
        cell.innerText = element !== 0? element: "";
    }
    
    if(board.rows*board.columns - board.openCells <= board.mines){
        gameWon();
    }
}

function isHiddenCell(cell){
    let result = false;

    let classNames = cell.className.split(' ');
    if(classNames.find(s => s === 'hidden') !== undefined)  {
        result = true;
    }

    return result;
}

function isOpenCell(cell){
    let result = false;

    let classNames = cell.className.split(' ');
    if(classNames.find(s => s === 'open') !== undefined)  {
        result = true;
    }

    return result;
}

//Implements the Depth First Traversal and Graph Cycle algorithms.
function discoverCellsGraph(previousNode, currentNode, rank = 0){
    //exit point
    if(currentNode === null){
        return;
    }

    if(previousNode === currentNode){
        errorLog('Undefined Graph stance');
        return;
    }

    //ignore a visited node and remove its recursion stack
    if(currentNode.visited){
        return;
    }

    //change the current node visual status
    let nodeValue = board.field[currentNode.row][currentNode.column];
    setupCell(currentNode, nodeValue);

    currentNode.visited = true;
    rank++;
    //stop any deep stack allocations in case
    if(rank > 255) return;

    let topNode = new Node(currentNode.row - 1, currentNode.column);
    let rightNode = new Node(currentNode.row, currentNode.column + 1);
    let bottomNode = new Node(currentNode.row + 1, currentNode.column);
    let leftNode = new Node(currentNode.row, currentNode.column - 1);
    
    let siblingNodes = new Array();
    siblingNodes.push(topNode, rightNode, bottomNode, leftNode);
    
    currentNode.nodeLinks = siblingNodes.filter((node) =>{
        let result = false;
        
        if(isNodeAvailable(node)){
            
            let nodeValue = board.field[node.row][node.column];
            let found = false;
            
            for (const subNode of Node.nodeMap) {
                if(node.nodeId === subNode.nodeId){
                    found = true;
                    return result;
                }
            }
            
            result = nodeValue === 0? true: false;
            
            if(!found && result){
                Node.nodeMap.push(node);
            }
            
            if(!result){
                //change the current node visual status
                setupCell(node, nodeValue);
            }
        } 
        
        return result;
    });

    if(currentNode.nodeLinks.length === 0){
        discoverCellsGraph(currentNode, previousNode, rank);
    }
    else{
        currentNode.nodeLinks.forEach((node) => {
            discoverCellsGraph(currentNode, node, rank);
        })
    }
}

function isNodeAvailable(node){
    return node.row >= 0 && node.row <= board.rows - 1 && node.column >= 0 && node.column <= board.columns - 1;
}

function setupCell(node, value){
    const cellElement = document.querySelector("[node='" + node.row + ":" + node.column + "']");

    if(isOpenCell(cellElement)) return;

    if(hasFlag(cellElement)){
        board.flags--;
        board.raiseFlagEvent();
    }
    if(isHiddenCell(cellElement)) board.openCells++;

    cellElement.className = "cell open";
    cellElement.innerText = value !== 0? value: "";
}

//The flag display handler. 
function setupFlag(cell, marker = true){

    if(isOpenCell(cell)) return;

    switch(marker){
        case true:
            cell.classList.toggle("flag");
            
            setTimeout(() => {
                if(hasFlag(cell)){
                    board.flags++;
                }
                else{
                    board.flags--;
                }
                
                if(board.flags >= board.mines){
                    checkMarkedFlags();
                }

                board.raiseFlagEvent();
            }, 5);
        break;
            
        case false:
            if(hasFlag(cell)) board.flags--;
            board.raiseFlagEvent();
        break;
            
        default:
            return;
    }
}

function checkMarkedFlags(){
    let markers = 0;

    for (let row = 0; row < board.field.length; row++) {
        for (let column = 0; column < board.field[row].length; column++) {
            const nodeValue = board.field[row][column];
            const cellElement = document.querySelector("[node='" + row + ":" + column + "']");
            
            if(hasFlag(cellElement) && nodeValue === -1){
                markers++;
            }
            
            if(markers >= board.mines){
                gameWon();
                return;
            }
        }
    }

    gameOver();
    return;
}

function hasFlag(cell){
    let result = false;

    let classNames = cell.className.split(' ');
    if(classNames.find(s => s === 'flag') !== undefined){
        result = true;
    }

    return result;
}

//Game won menu generator
function gameWon(){
    board.winCondition = true;

    board.pauseGame();
    setBlurBG();

    let menuWrapper = document.createElement('div');
    menuWrapper.className = "game-menu-wrapper";
    
    let gameWonMenu = document.createElement('div');
    gameWonMenu.className = "game-won-menu";
    
    let menuTitle = document.createElement('div');
    menuTitle.className = "menu-title win-game";
    menuTitle.innerText = "You Won";
    
    let menuNextGameOption = document.createElement('div');
    menuNextGameOption.className = "menu-option next-game";
    menuNextGameOption.innerText = "Next Game";
    menuNextGameOption.addEventListener('click', nextGameMenuHandler, false);
    
    let menuMainOption = document.createElement('div');
    menuMainOption.className = "menu-option exit-game";
    menuMainOption.innerText = "Main Menu";
    menuMainOption.addEventListener('click', mainMenuHandler, false);

    gameWonMenu.appendChild(menuTitle);
    gameWonMenu.appendChild(menuNextGameOption);
    gameWonMenu.appendChild(menuMainOption);
    
    menuWrapper.appendChild(gameWonMenu);

    board.domElement.appendChild(menuWrapper);

    bindMenuSoundHandlers('.menu-option');
}

//Game over menu generator
function gameOver(){
    board.gameOver = true;

    board.pauseGame();
    setBlurBG();

    for (let row = 0; row < board.field.length; row++) {
        for (let column = 0; column < board.field[row].length; column++) {
            const element = board.field[row][column];

            if(element === -1) {
                setTimeout(() => {
                    let cell = document.querySelector("[node='"+ row + ":" + column + "']");
                    cell.className = "cell mine";
                }, 3);
            }
        }
    }

    let menuWrapper = document.createElement('div');
    menuWrapper.className = "game-menu-wrapper";
    
    let gameOverMenu = document.createElement('div');
    gameOverMenu.className = "game-over-menu";
    
    let menuTitle = document.createElement('div');
    menuTitle.className = "menu-title lose-game";
    menuTitle.innerText = "Game over";
    
    let menuRestartGameOption = document.createElement('div');
    menuRestartGameOption.className = "menu-option restart-game";
    menuRestartGameOption.innerText = "Restart Game";
    menuRestartGameOption.addEventListener('click', restartGameMenuHandler, false);

    let menuNextGameOption = document.createElement('div');
    menuNextGameOption.className = "menu-option next-game";
    menuNextGameOption.innerText = "Next Game";
    menuNextGameOption.addEventListener('click', nextGameMenuHandler, false);
    
    let menuMainOption = document.createElement('div');
    menuMainOption.className = "menu-option exit-game";
    menuMainOption.innerText = "Main Menu";
    menuMainOption.addEventListener('click', mainMenuHandler, false);

    gameOverMenu.appendChild(menuTitle);
    gameOverMenu.appendChild(menuRestartGameOption);
    gameOverMenu.appendChild(menuNextGameOption);
    gameOverMenu.appendChild(menuMainOption);
    
    menuWrapper.appendChild(gameOverMenu);

    board.domElement.appendChild(menuWrapper);

    bindMenuSoundHandlers('.menu-option');
}

//Pause menu generator
function pauseMenu(){
    board.pauseGame();
    setBlurBG();

    let menuWrapper = document.createElement('div');
    menuWrapper.className = "game-menu-wrapper";
    
    let gamePauseMenu = document.createElement('div');
    gamePauseMenu.className = "game-pause-menu";
    
    let menuTitle = document.createElement('div');
    menuTitle.className = "menu-title pause-game";
    menuTitle.innerText = "Paused";
    
    let menuRestoreGameOption = document.createElement('div');
    menuRestoreGameOption.className = "menu-option restore-game";
    menuRestoreGameOption.innerText = "Restore Game";
    menuRestoreGameOption.addEventListener('click', restoreGameMenuHandler, false);

    let menuMainOption = document.createElement('div');
    menuMainOption.className = "menu-option exit-game";
    menuMainOption.innerText = "Main Menu";
    menuMainOption.addEventListener('click', mainMenuHandler, false);

    gamePauseMenu.appendChild(menuTitle);
    gamePauseMenu.appendChild(menuRestoreGameOption);
    gamePauseMenu.appendChild(menuMainOption);
    
    menuWrapper.appendChild(gamePauseMenu);

    board.domElement.appendChild(menuWrapper);

    bindMenuSoundHandlers('.menu-option');
}

//Main menu generator (contains About and Settings submenus)
function mainMenu(){
    board.pauseGame();
    setBlurBG();

    let menuWrapper = document.createElement('div');
    menuWrapper.className = "game-menu-wrapper";
    
    //build main menu frame
    let gameMainMenu = document.createElement('div');
    gameMainMenu.className = "game-main-menu";
    
    let menuTitle = document.createElement('div');
    menuTitle.className = "menu-title main-menu";
    menuTitle.innerText = "Minesweeper";
    
    let menuNewGameOption = document.createElement('div');
    menuNewGameOption.className = "menu-option new-game";
    menuNewGameOption.innerText = "New Game";
    menuNewGameOption.addEventListener('click', newGameMenuHandler, false);

    let menuAboutGameOption = document.createElement('div');
    menuAboutGameOption.className = "menu-option about-game";
    menuAboutGameOption.innerText = "About";
    menuAboutGameOption.addEventListener('click', openAboutMenuHandler, false);
    
    let menuSettingsOption = document.createElement('div');
    menuSettingsOption.className = "menu-option game-settings";
    menuSettingsOption.innerText = "Settings";
    menuSettingsOption.addEventListener('click', settingsMenuHandler, false);

    //build About menu frame
    let gameAboutMenu = document.createElement('div');
    gameAboutMenu.className = "game-about-menu hidden-menu";
    
    let gameAboutMenuTitle = document.createElement('div');
    gameAboutMenuTitle.className = "menu-title main-menu";
    gameAboutMenuTitle.innerText = "About";

    let gameAboutMenuLabelVersion = document.createElement('h3');
    gameAboutMenuLabelVersion.innerText = "Minesweeper";
    let gameAboutMenuTxtVersion = document.createElement('p');
    gameAboutMenuTxtVersion.innerText = "Version: 1.01";

    let gameAboutMenuLabelRules = document.createElement('h3');
    gameAboutMenuLabelRules.innerText = "The rules of the game";
    let gameAboutMenuTxtRules = document.createElement('p');
    gameAboutMenuTxtRules.innerText = "Win condition - mark all mines correctly or open all none mined cells";

    //Lose condition - when opening a mined cell or when all available flags not mark all mines.
    
    let gameAboutMenuLabelControls = document.createElement('h3');
    gameAboutMenuLabelControls.innerText = "Controls";
    let gameAboutMenuTxtControls = document.createElement('p');
    gameAboutMenuTxtControls.innerText = "LMB - open a cell \n MMB - pause menu \n RMB - mark a mine";

    let gameAboutMenuLabelResources = document.createElement('h3');
    gameAboutMenuLabelResources.innerText = "Resources";
   
    let gameAboutMenuTxtResources = document.createElement('p');
    gameAboutMenuTxtResources.innerText = "GitHub ";
    let gameAboutMenuLinkGit = document.createElement('a');
    gameAboutMenuLinkGit.setAttribute('href', 'https://github.com/Yuri-Un/minesweeper');
    gameAboutMenuLinkGit.innerText = "repository";
    gameAboutMenuTxtResources.appendChild(gameAboutMenuLinkGit);
    
    let gameAboutMenuTxtResourcesSounds = document.createElement('p');
    gameAboutMenuTxtResourcesSounds.innerText = "Sounds from "
    let gameAboutMenuLinkSounds = document.createElement('a');
    gameAboutMenuLinkSounds.setAttribute('href', 'https://www.zapsplat.com');
    gameAboutMenuLinkSounds.innerText = "Zapsplat";
    gameAboutMenuTxtResourcesSounds.appendChild(gameAboutMenuLinkSounds);

    let gameAboutMenuContainer = document.createElement('div');
    gameAboutMenuContainer.className = "menu-container";

    let gameAboutMenuCookiesTitle = document.createElement('h3');
    gameAboutMenuCookiesTitle.innerText = "Cookies";

    let gameAboutMenuCookies = document.createElement('input');
    gameAboutMenuCookies.setAttribute('type', 'checkbox');
    gameAboutMenuCookies.setAttribute('name', 'cookies');
    gameAboutMenuCookies.setAttribute('id', 'cookies');
    gameAboutMenuCookies.checked = board.cookies.enabledCookies;
    gameAboutMenuCookies.addEventListener('click', cookiesSettingsMenuHandler, false);

    let gameAboutMenuCancel = document.createElement('div');
    gameAboutMenuCancel.className = "menu-option exit-about";
    gameAboutMenuCancel.innerText = "Back";
    gameAboutMenuCancel.addEventListener('click', closeAboutMenuHandler, false);

    //build Settings menu frame
    let gameSettingsMenu = document.createElement('div');
    gameSettingsMenu.className = "game-settings-menu hidden-menu";
    
    let gameSettingsMenuTitle = document.createElement('div');
    gameSettingsMenuTitle.className = "menu-title main-menu";
    gameSettingsMenuTitle.innerText = "Settings";

    let gameSettingsMenuContainer = document.createElement('div');
    gameSettingsMenuContainer.className = "menu-container";
    
    //difficulty option
    let optionDiffLabel = document.createElement('div');
    optionDiffLabel.className = "option-label";
    
    let gameSettingsMenuLabelDiff = document.createElement('label');
    gameSettingsMenuLabelDiff.setAttribute('for', 'game-difficulty');
    gameSettingsMenuLabelDiff.innerText = "Difficulty";

    let gameSettingsMenuLabelDefDiff = document.createElement('input');
    gameSettingsMenuLabelDefDiff.setAttribute('type', 'checkbox');
    gameSettingsMenuLabelDefDiff.setAttribute('name', 'def-diff');
    gameSettingsMenuLabelDefDiff.setAttribute('id', 'def-diff');
    gameSettingsMenuLabelDefDiff.checked = gameSettings.isDefaultDifficulty;
    gameSettingsMenuLabelDefDiff.addEventListener('click', defDiffSettingsMenuHandler, false);

    let gameSettingsMenuLabelDefSpan = document.createElement('span');
    gameSettingsMenuLabelDefSpan.setAttribute('title', 'Default option');
    gameSettingsMenuLabelDefSpan.innerText = "Def";

    optionDiffLabel.appendChild(gameSettingsMenuLabelDiff);
    optionDiffLabel.appendChild(gameSettingsMenuLabelDefDiff);
    optionDiffLabel.appendChild(gameSettingsMenuLabelDefSpan);

    let enhancedRange = document.createElement('div');
    enhancedRange.className = "enhanced-range disabled";
    let minSpan = document.createElement('span');
    minSpan.innerText = "min";
    let maxSpan = minSpan.cloneNode(false);
    maxSpan.innerText = "max";
    let gameSettingsMenuInputDiff = document.createElement('input');
    gameSettingsMenuInputDiff.setAttribute('type', 'range');
    gameSettingsMenuInputDiff.setAttribute('name', 'game-difficulty');
    gameSettingsMenuInputDiff.setAttribute('id', 'game-difficulty');
    gameSettingsMenuInputDiff.setAttribute('min', getMinDifficultyRank()+'');
    gameSettingsMenuInputDiff.setAttribute('max', getMaxDifficultyRank() + '');
    gameSettingsMenuInputDiff.setAttribute('value', gameSettings.difficulty);

    enhancedRange.appendChild(minSpan);
    enhancedRange.appendChild(gameSettingsMenuInputDiff);
    enhancedRange.appendChild(maxSpan);

    //color option
    let optionColorLabel = optionDiffLabel.cloneNode(false);
    optionColorLabel.className = "option-label";

    let gameSettingsMenuLabelColor = document.createElement('label');
    gameSettingsMenuLabelColor.setAttribute('for', 'game-color');
    gameSettingsMenuLabelColor.innerText = "Color";

    let gameSettingsMenuLabelDefColor = document.createElement('input');
    gameSettingsMenuLabelDefColor.setAttribute('type', 'checkbox');
    gameSettingsMenuLabelDefColor.setAttribute('name', 'def-color');
    gameSettingsMenuLabelDefColor.setAttribute('id', 'def-color');
    gameSettingsMenuLabelDefColor.checked = gameSettings.isDefaultColor;
    gameSettingsMenuLabelDefColor.addEventListener('click', defColorSettingsMenuHandler, false);

    let gameSettingsMenuLabelDefColorSpan = gameSettingsMenuLabelDefSpan.cloneNode(true);

    optionColorLabel.appendChild(gameSettingsMenuLabelColor);
    optionColorLabel.appendChild(gameSettingsMenuLabelDefColor);
    optionColorLabel.appendChild(gameSettingsMenuLabelDefColorSpan);

    let gameSettingsMenuInputColor = document.createElement('input');
    gameSettingsMenuInputColor.setAttribute('type', 'color');
    gameSettingsMenuInputColor.setAttribute('name', 'game-color');
    gameSettingsMenuInputColor.setAttribute('id', 'game-color');
    gameSettingsMenuInputColor.setAttribute('value', rgbToHex(gameSettings.cellColor));
    gameSettingsMenuInputColor.className = "disabled";

    //style option
    let gameSettingsMenuLabelStyle = document.createElement('label');
    gameSettingsMenuLabelStyle.setAttribute('for', 'game-style');
    gameSettingsMenuLabelStyle.innerText = "Cell style";

    let gameSettingsMenuSelectStyle = document.createElement('select');
    gameSettingsMenuSelectStyle.setAttribute('name', 'game-style');
    gameSettingsMenuSelectStyle.setAttribute('id', 'game-style');
    cellStyles.forEach((elem) => {
        let optElem = document.createElement('option');
        optElem.value = elem;
        optElem.innerText = elem;
        if(gameSettings.cellStyle === elem){
            optElem.selected = true;
        }
        gameSettingsMenuSelectStyle.appendChild(optElem);
    });

    //sounds option
    let gameSettingsMenuLabelSounds = document.createElement('label');
    gameSettingsMenuLabelSounds.setAttribute('for', 'game-sounds');
    gameSettingsMenuLabelSounds.innerText = "Sounds";

    let gameSettingsMenuSelectSounds = document.createElement('select');
    gameSettingsMenuSelectSounds.setAttribute('name', 'game-sounds');
    gameSettingsMenuSelectSounds.setAttribute('id', 'game-sounds');
    switchSelector.forEach((elem) => {
        let optElem = document.createElement('option');
        optElem.value = elem;
        optElem.innerText = elem;
        if(gameSettings.sounds === elem){
            optElem.selected = true;
        }
        gameSettingsMenuSelectSounds.appendChild(optElem);
    });

    //settings menu buttons
    let gameSettingsMenuAccept = document.createElement('div');
    gameSettingsMenuAccept.className = "menu-option acc-settings";
    gameSettingsMenuAccept.innerText = "Accept";
    gameSettingsMenuAccept.addEventListener('click', accSettingsMenuHandler, false);

    let gameSettingsMenuDefault = document.createElement('div');
    gameSettingsMenuDefault.className = "menu-option default-settings";
    gameSettingsMenuDefault.innerText = "Default";
    gameSettingsMenuDefault.addEventListener('click', defaultSettingsMenuHandler, false);

    let gameSettingsMenuCancel = document.createElement('div');
    gameSettingsMenuCancel.className = "menu-option exit-settings";
    gameSettingsMenuCancel.innerText = "Back";
    gameSettingsMenuCancel.addEventListener('click', cancelSettingsMenuHandler, false);


    //append main menu elements
    gameMainMenu.appendChild(menuTitle);
    gameMainMenu.appendChild(menuNewGameOption);
    gameMainMenu.appendChild(menuAboutGameOption);
    gameMainMenu.appendChild(menuSettingsOption);
    
    menuWrapper.appendChild(gameMainMenu);

    //append about frame elements
    gameAboutMenuContainer.appendChild(gameAboutMenuTitle);
    gameAboutMenuContainer.appendChild(gameAboutMenuLabelVersion);
    gameAboutMenuContainer.appendChild(gameAboutMenuTxtVersion);
    gameAboutMenuContainer.appendChild(gameAboutMenuLabelRules);
    gameAboutMenuContainer.appendChild(gameAboutMenuTxtRules);
    gameAboutMenuContainer.appendChild(gameAboutMenuLabelControls);
    gameAboutMenuContainer.appendChild(gameAboutMenuTxtControls);
    gameAboutMenuContainer.appendChild(gameAboutMenuLabelResources);
    gameAboutMenuContainer.appendChild(gameAboutMenuTxtResources);
    gameAboutMenuContainer.appendChild(gameAboutMenuTxtResourcesSounds);
    gameAboutMenuContainer.appendChild(gameAboutMenuCookiesTitle);
    gameAboutMenuContainer.appendChild(gameAboutMenuCookies);

    gameAboutMenuContainer.appendChild(gameAboutMenuCancel);
    gameAboutMenu.appendChild(gameAboutMenuContainer);

    menuWrapper.appendChild(gameAboutMenu);

    //append settings menu elements
    gameSettingsMenu.appendChild(gameSettingsMenuTitle);
    let containerDiff = gameSettingsMenuContainer.cloneNode(false);
    containerDiff.appendChild(optionDiffLabel);
    containerDiff.appendChild(enhancedRange);
    gameSettingsMenu.appendChild(containerDiff);
    let containerColor = gameSettingsMenuContainer.cloneNode(false);
    containerColor.appendChild(optionColorLabel);
    containerColor.appendChild(gameSettingsMenuInputColor);
    gameSettingsMenu.appendChild(containerColor);
    let containerStyle = gameSettingsMenuContainer.cloneNode(false);
    containerStyle.appendChild(gameSettingsMenuLabelStyle);
    containerStyle.appendChild(gameSettingsMenuSelectStyle);
    gameSettingsMenu.appendChild(containerStyle);
    let containerSounds = gameSettingsMenuContainer.cloneNode(false);
    containerSounds.appendChild(gameSettingsMenuLabelSounds);
    containerSounds.appendChild(gameSettingsMenuSelectSounds);
    gameSettingsMenu.appendChild(containerSounds);
    gameSettingsMenu.appendChild(gameSettingsMenuAccept);
    gameSettingsMenu.appendChild(gameSettingsMenuDefault);
    gameSettingsMenu.appendChild(gameSettingsMenuCancel);

    menuWrapper.appendChild(gameSettingsMenu);

    board.domElement.appendChild(menuWrapper);

    //update menu options after they were added to the document
    updateMainMenuPane();
    updateDifficultyPane(gameSettingsMenuLabelDefDiff);
    updateColorPane(gameSettingsMenuLabelDefColor);
    bindMenuSoundHandlers('.menu-option');
}

function setBlurBG(){
    document.documentElement.style.setProperty('--blur-mode', '3px');
}

function removeBlurBG(){
    document.documentElement.style.setProperty('--blur-mode', '0px');
}

function bindMenuSoundHandlers(classSelector){
    if(classSelector.toString().length === 0){
        warningLog('className is not defined');
    }

    const menuOptions = document.querySelectorAll(classSelector);
    menuOptions.forEach((element) => {
        element.addEventListener('mousedown', menuOptionSoundHandler, false);
    });
}

function updateMainMenuPane(){
    const settingsBtn = document.querySelector('.game-settings');
    
    if(!board.cookies.isSavedCookies()){
        settingsBtn.classList.add('disabled');
    }
    else{
        settingsBtn.classList.remove('disabled');
    }
}

function updateDifficultyPane(controller){
    const anchor = document.querySelector('.enhanced-range');

    if(controller.checked){
        anchor.classList.add('disabled');
        return;
    }

    anchor.classList.remove('disabled');
}

function updateColorPane(controller){
    const anchor = document.querySelector('#game-color');

    if(controller.checked){
        anchor.classList.add('disabled');
        return;
    }

    anchor.classList.remove('disabled');
}

function getMinDifficultyRank(){
    return Number.parseInt((Math.pow(docViewProperties.screenWidth/50, 2)/3).toString());
}

function getMidDifficultyRank(){
    return Number.parseInt((Math.pow(docViewProperties.screenWidth/50, 2)/2).toString());
}

function getMaxDifficultyRank(){
    return Number.parseInt((Math.pow(docViewProperties.screenWidth/50, 2)).toString());
}

function removeMenu(){
    board.restoreGame();
    removeBlurBG();

    let currentMenu = document.querySelector('.game-menu-wrapper');
    board.domElement.removeChild(currentMenu);
}

function openAboutMenu(){
    const mainMenu = document.querySelector('.game-main-menu');
    const aboutMenu = document.querySelector('.game-about-menu');
    aboutMenu.classList.remove('hidden-menu');
    mainMenu.classList.add('hidden-menu');
}

function closeAboutMenu(){
    const mainMenu = document.querySelector('.game-main-menu');
    const aboutMenu = document.querySelector(".game-about-menu");
    aboutMenu.classList.add("hidden-menu");
    mainMenu.classList.remove('hidden-menu');
}


function openSettingsMenu(){
    const mainMenu = document.querySelector('.game-main-menu');
    const settingsMenu = document.querySelector(".game-settings-menu");
    settingsMenu.classList.remove("hidden-menu");
    mainMenu.classList.add('hidden-menu');
}

function closeSettingsMenu(){
    const mainMenu = document.querySelector('.game-main-menu');
    const settingsMenu = document.querySelector(".game-settings-menu");
    settingsMenu.classList.add("hidden-menu");
    mainMenu.classList.remove('hidden-menu');
}

function saveSettings(){
    const button = document.querySelector('.acc-settings');

    const isDefaultDiff = document.querySelector('#def-diff');
    const boardDiff = document.querySelector('#game-difficulty');
    const isDefaultColor = document.querySelector('#def-color');
    const boardColor = document.querySelector('#game-color');
    const boardStyle = document.querySelector('#game-style');
    const boardSounds = document.querySelector('#game-sounds');

    gameSettings.isDefaultDifficulty = isDefaultDiff.checked;
    gameSettings.difficulty = Number.parseInt(boardDiff.value);
    gameSettings.isDefaultColor = isDefaultColor.checked;
    gameSettings.cellColor = hexToRGB(boardColor.value);
    gameSettings.cellStyle = boardStyle.value;
    gameSettings.sounds = boardSounds.value;

    gameMode.setCustomMode(gameSettings);
    gameSettings.saveSettings();

    button.innerText = "Saved";
    setTimeout(() => {
        button.innerText = "Accept";
    }, 700);
}

function setDefaultSettings(){
    const button = document.querySelector('.default-settings');

    const isDefaultDiff = document.querySelector('#def-diff');
    const boardDiff = document.querySelector('#game-difficulty');
    const isDefaultColor = document.querySelector('#def-color');
    const boardColor = document.querySelector('#game-color');
    const boardStyle = document.querySelector('#game-style');
    const boardSounds = document.querySelector('#game-sounds');
    
    gameSettings.setDefault();

    isDefaultDiff.checked = gameSettings.isDefaultDifficulty;
    boardDiff.value = gameSettings.difficulty;
    isDefaultColor.checked = gameSettings.isDefaultColor;
    boardColor.value = rgbToHex(gameSettings.cellColor);
    boardStyle.value = gameSettings.cellStyle;
    boardSounds.value = gameSettings.sounds;
    
    gameMode.setCustomMode(gameSettings);
    gameSettings.clearSettings();

    button.innerText = "Saved";
    setTimeout(() => {
        button.innerText = "Default";
    }, 700);

    updateDifficultyPane(isDefaultDiff);
    updateColorPane(isDefaultColor);
}

function disposeBoard(){
    board.domElement.removeEventListener("contextmenu", contextMSHandler, false);
    window.removeEventListener("resize", resizeMSHandler, false);

    for (let row = 0; row < board.field.length; row++) {
        for (let column = 0; column < board.field[row].length; column++) {
            let element = document.querySelector("[node='"+ row + ":" + column + "']");
            element.removeEventListener('mouseup', clickMSHandler, false);
        }
    }
}

//==============================================================
//                      SUPPORTIVE FUNCTIONS
//==============================================================

//Debouce function wrapper
//It's reserved for future use
// function debounce(func, timeout = 300){
//     let timer;
//     return (...args) => {
//         clearTimeout(timer);
//         timer = setTimeout(() => {
//             func.apply(this, args);
//         }, timeout);
//     };
// }

function errorLog(msg){
    console.log('ERROR: ' + msg);
}

function warningLog(msg){
    console.log('Warning: ' + msg);
}

function getRandomInt(max = 100){
    return Math.floor(Math.random() * max);
}

function getRandomRangeInt(min, max){
    let result = -1;
    let rank = 0;

    if(min >= max) return max;

    while(result <= min || result >= max) {
        result = getRandomInt(max);
        if(rank > 50) break;
        rank++;
    }

    return result;
}

function getRandomMapValue(map){
    const values = Array.from(map.values());
    const randomId = Math.floor(Math.random()*values.length);

    return values[randomId];
}

function insertAfter(newNode, refNode){
    refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
}

//Reserved
// function getRandomMapKey(map){
//     const keys = Array.from(map.keys());
//     const randomId = Math.floor(Math.random()*keys.length);
     
//     return keys[randomId];
// }

function playSound(file){
    if(gameSettings.sounds === "Off"){
        return;
    }

    if(!configFile.loaded){
        return;
    }

    const player = new Audio(file);
    player.play();
}

function hexToRGB(hex){
    let red = 0, green = 0, blue = 0;

    switch(hex.length){
        case 4:
            red = "0x" + hex[1] + hex[1];
            green = "0x" + hex[2] + hex[2];
            blue = "0x" + hex[3] + hex[3];
            break;

        case 7:
            red = "0x" + hex[1] + hex[2];
            green = "0x" + hex[3] + hex[4];
            blue = "0x" + hex[5] + hex[6];
            break;

        default:
            return {r: 0, g: 0, b: 0};
    }

        return {r: +red, g: +green, b: +blue};
}

function rgbToHex(color) {
    let r = color.r;
    let g = color.g;
    let b = color.b;

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

function getDarkRGBColor(cellBaseColor){
    let rDarkDelta = cellBaseColor.r - 40 < 0? 0: cellBaseColor.r - 40;
    let gDarkDelta = cellBaseColor.g - 40 < 0? 0: cellBaseColor.g - 40;
    let bDarkDelta = cellBaseColor.b - 40 < 0? 0: cellBaseColor.b - 40;

    return {r: rDarkDelta, g: gDarkDelta, b: bDarkDelta};
}

function getLightRGBColor(cellBaseColor){
    let rLightDelta = cellBaseColor.r + 25 > 255? 255: cellBaseColor.r + 25;
    let gLightDelta = cellBaseColor.g + 25 > 255? 255: cellBaseColor.g + 25;
    let bLightDelta = cellBaseColor.b + 25 > 255? 255: cellBaseColor.b + 25;

    return {r: rLightDelta, g: gLightDelta, b: bLightDelta};
}

//==============================================================
//                          EVENT HANDLERS
//==============================================================
function clickMSHandler(e){
    if(board.gameOver || board.winCondition || board.gamePaused){
        return;
    }

    if(!board.gameStarted){
        board.gameStarted = true;
        board.updateBoardTimer();
    }

    e.preventDefault();
    e.stopPropagation();

    if(typeof e === 'object'){
        switch(e.button){
            case 0: //left mouse button click
                if(isOpenCell(this)) return;
                playSound(audioFiles.get('open-cell').file);
                openCell(this);
            break;

            case 1: //middle mouse button click
                pauseMenu();
            break;

            case 2: //right mouse button click
                if(isOpenCell(this)) return;
                playSound(audioFiles.get('drop-flag').file);
                setupFlag(this);
            break;

            default: //no action otherwise
                return;
        }
    }
}

function menuOptionSoundHandler(e){
    playSound(audioFiles.get('click').file);
}

function nextGameMenuHandler(e){
    disposeBoard(); 
    nextGame(board);
}

function restartGameMenuHandler(e){
    disposeBoard();       
    restartGame(board);
}

function restoreGameMenuHandler(e){
    removeMenu();
}

function mainMenuHandler(e){
    removeMenu()
    mainMenu();
}

function newGameMenuHandler(e){
    disposeBoard();       
    newGame(board);
}

function openAboutMenuHandler(e){
    openAboutMenu();
}

function cookiesSettingsMenuHandler(e){
    if(e.target.checked){
        board.cookies.enableCookies();
    }
    else{
        board.cookies.disableCookies();
        setDefaultSettings();
    }

    updateMainMenuPane();
}

function closeAboutMenuHandler(e){
    closeAboutMenu();
}

function settingsMenuHandler(e){
    openSettingsMenu();
}

function accSettingsMenuHandler(e){
    saveSettings();
}

function defDiffSettingsMenuHandler(e){
    updateDifficultyPane(e.target);
}

function defColorSettingsMenuHandler(e){
    updateColorPane(e.target);
}

function defaultSettingsMenuHandler(e){
    setDefaultSettings();
}

function cancelSettingsMenuHandler(e){
    closeSettingsMenu();
}

//disable the context menu of [this] Element
function contextMSHandler(e){    
    e.preventDefault();
    e.stopPropagation();

    return;
}

function boardMSHandler(e){
    if(board.gameOver || board.winCondition || board.gamePaused){
        return;
    }
    
    e.preventDefault();
    e.stopPropagation();

    if(typeof e === 'object' && e.button === 1){
        pauseMenu();
    }

    return;
}

function resizeMSHandler(e){
    clearTimeout(docViewProperties.resizeTimer);
    docViewProperties.resizeTimer = setTimeout(() => {
        board.updateSize();

        UpdateOverlay(board.domElement, board, true);
        }, 100);
}