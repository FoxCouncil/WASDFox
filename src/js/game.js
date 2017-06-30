const STATE_UNINITIALIZED = Symbol('STATE_UNINITIALIZED');
const STATE_MAINMENU = Symbol('STATE_MAINMENU');
const STATE_PLAY = Symbol('STATE_PLAY');
const STATE_LOADINGMAP = Symbol('STATE_LOADINGMAP');
const STATE_SHOWINGMAP = Symbol('STATE_SHOWINGMAP');

class Game {
    constructor(tileSize=32, frameRate=60, canvasId='gs') {
        this.tileSize = tileSize;
        this.frameRate = frameRate;
        this.canvasId = canvasId;

        this.maps = [];

        this.currentMap = null;
        this.currentPlayer = null;        

        this.containerMap = new createjs.Container();
        this.containerPlayer = new createjs.Container();

        // Views
        this.viewNewPlayer = document.getElementById('newplayer');
        this.viewNewPlayerStats = document.getElementById('newplayer-statlist');

        this.viewGameBar = document.getElementById('gamebar');

        this.hpValue = document.getElementById('value-hp');
        this.hpTotal = document.getElementById('value-total-hp');

        this.manaValue = document.getElementById('value-mana');
        this.manaTotal = document.getElementById('value-total-mana');

        this.statusBar = document.getElementById('gamebar-right');

        this.statsView = new Stats();

        this.state = STATE_UNINITIALIZED;
    }

    initialize() {
        if (this.state == STATE_UNINITIALIZED) {
            
            document.body.appendChild( this.statsView.dom );

            this.loadTileset('art/tileset.png');
            
            this.stage = new createjs.Stage(this.canvasId);
            this.stage.addChild(this.containerMap);
            this.stage.addChild(this.containerPlayer);

            this.resize();

            createjs.Ticker.useRAF = true;
            createjs.Ticker.setFPS(this.frameRate);
            createjs.Ticker.addEventListener("tick", () => this.tick());

            window.addEventListener('resize', () => this.resize());
            window.addEventListener('keydown', (e) => this.handleKeyboard(e));

            this.queue = new createjs.LoadQueue();
            this.queue.installPlugin(createjs.JSON);
            this.queue.on('fileload', this.preloaderFileReady, this);
            this.queue.on('complete', this.preloaderComplete, this);
            
            this.queue.loadFile('maps/home.json');
        } else {
            console.error('Game already initialized!');
        }
    }

    get width() {
        return this.stage.canvas.width;
    }

    set width(width) {
        this.stage.canvas.width = width;
    }

    get height() {
        return this.stage.canvas.height;
    }

    set height(height) {
        this.stage.canvas.height = height;
    }

    tick() {
        this.statsView.begin();

        if (this.state === STATE_LOADINGMAP) {
            if (this.containerMap.numChildren > 0) {     
                for (var idx = 0; idx < 250; idx++) {
                    let rndTile = this.containerMap.getChildAt(this.randomNumber(0, this.containerMap.numChildren));
                    if (rndTile !== undefined) {
                        rndTile.alpha -= 0.33;
                        rndTile.rotation += 45;
                        if (rndTile.alpha < 0) {
                            this.containerMap.removeChild(rndTile);
                        }
                    }         
                }
            } else {
                this.currentMap = this.maps[this.mapToLoad];
                delete this.mapToLoad;
                this.mapToShowIds = Array.from(Array(this.currentMap.width * this.currentMap.height).keys());
                this.drawMap();
                this.setState(STATE_SHOWINGMAP);
            }
        } else if (this.state == STATE_SHOWINGMAP) {
            if (this.mapToShowIds.length > 0) {
                for (var idx = 0; idx < 2000; idx++) {
                    let rndId = this.randomNumber(0, this.mapToShowIds.length);
                    let rndTileId = this.mapToShowIds[rndId];
                    let rndTile = this.containerMap.getChildAt(rndTileId);
                    if (rndTile !== undefined) {
                        rndTile.alpha += 0.33;
                        rndTile.rotation -= 45;
                        if (rndTile.alpha >= 1) {
                            rndTile.rotation = 0;
                            rndTile.alpha = 1;
                            this.mapToShowIds.splice(rndId, 1);
                        }
                    }
                }
            } else {
                delete this.mapToShowIds;
                this.setState(STATE_PLAY);
            } 
        }
        /*    
        }*/

        this.stage.update();
        this.statsView.end();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.draw();
    }

    setState(newState) {
        if (typeof newState !== 'symbol' || newState === STATE_UNINITIALIZED) {
            throw 'InvalidStateException';
        }
        
        if (this.state === newState) {
            return;
        }

        this.debugMessage('STATE', this.state.toString(), ` CHANGED TO STATE(${newState.toString()})`);

        this.state = newState;

        switch (newState) {
            case STATE_MAINMENU: {
                while (this.viewNewPlayerStats.hasChildNodes()) {
                    this.viewNewPlayerStats.removeChild(this.viewNewPlayerStats.lastChild);
                }

                for (var idx = 0; idx < Player.StatNames.length; idx++) {
                    let statName = Player.StatNames[idx];

                    let statLabel = document.createElement('label');
                    let statSpan = document.createElement('span');
                    statSpan.innerText = statName;
                    statLabel.appendChild(statSpan);
                    let statInput = document.createElement('input');
                    statInput.setAttribute('class', 'player-stat-input');
                    statInput.setAttribute('type', 'number');
                    statInput.setAttribute('name', statName.toLowerCase());
                    statInput.setAttribute('value', '5');
                    statInput.setAttribute('min', '0');
                    statLabel.appendChild(statInput);    
                    this.viewNewPlayerStats.appendChild(statLabel);                
                }

                const statsCalculator = function(e) {
                    let statInputs = document.getElementsByClassName('player-stat-input');
                    let totalPoints = statInputs.length * 5;

                    let lastStatInput;
                    for (var idx = 0; idx < statInputs.length; idx++) {
                        lastStatInput = statInputs[idx];
                        if (lastStatInput.valueAsNumber < 0) {
                            lastStatInput.value = 0;
                        }

                        if (totalPoints > 0) {
                            totalPoints -= lastStatInput.valueAsNumber;
                        } else {
                            break;
                        }
                    }

                    if (totalPoints < 0) {
                        let fuck = Math.abs(totalPoints);

                        lastStatInput.value -= fuck;
                        totalPoints += fuck;
                    }

                    document.getElementsByName('pointsleft')[0].value = totalPoints;
                };

                let statInputs = document.getElementsByClassName('player-stat-input');

                for (var idx = 0; idx < statInputs.length; idx++) {
                    var statInput = statInputs[idx];
                    statInput.addEventListener('input', statsCalculator);                    
                }

                this.viewNewPlayer.classList.remove('hidden');
                this.viewGameBar.classList.add('hidden');
                if (document.getElementsByName('startgamebutton')[0].onclick == null) {
                    var self = this;
                    document.getElementsByName('startgamebutton')[0].onclick = function() {
                        self.currentMap = self.maps['home'];
                        self.currentPlayer = new Player();
                        self.currentPlayer.x = 50;
                        self.currentPlayer.y = 50;
                        self.setState(STATE_PLAY);
                    }

                    // DEV ONLY
                    document.getElementsByName('startgamebutton')[0].click();
                }
            }
            break;

            case STATE_PLAY: {
                this.viewNewPlayer.classList.add('hidden');
                this.viewGameBar.classList.remove('hidden');

                this.draw();
            }
            break;
        }
    }

    draw() {
        this.drawDebugView();
        
        if (this.state != STATE_PLAY) {
            return;
        }
        
        this.drawMap();
        this.drawInterface();
    }

    drawDebugView() {
        if (this.debugContainer === undefined) {
            this.debugContainer = new createjs.Container();
            this.debugContainer.visible = false;
            this.stage.addChild(this.debugContainer);
        } else {
            this.debugContainer.removeAllChildren();
        }
        
        let lineX = new createjs.Shape();
        lineX.name = 'linex';
        lineX.graphics.beginStroke('#F00').drawRect(this.width / 2, 0, 1, this.height);
        this.debugContainer.addChild(lineX);

        let lineY = new createjs.Shape();
        lineY.name = 'liney';
        lineY.graphics.beginStroke('#0F0').drawRect(0, this.height / 2, this.width, 1);
        this.debugContainer.addChild(lineY);        
    }

    drawMap() {
        if (this.currentMap === null || this.currentMap === undefined) {
            return;
        }        

        let map = this.currentMap;
        let layers = map.layers;
        
        this.containerMap.removeAllChildren();

        if (layers.base !== undefined && layers.base.length > 0) {
            let totalTilesX = this.width / this.tileSize;
            let totalTilesY = this.height / this.tileSize;

            let drawTotalTilesX = totalTilesX;
            let drawTotalTilesY = totalTilesY;

            let centerX = Math.floor(totalTilesX / 2);
            let centerY = Math.floor(totalTilesY / 2);

            let drawOffsetX = centerX - this.currentPlayer.x;
            let drawOffsetY = centerY - this.currentPlayer.y;

            let tile = new createjs.Sprite(this.tileset);

            let tileTotal = 0;

            for (let x = 0; x < drawTotalTilesX; x++) {
                for (let y = 0; y < drawTotalTilesY; y++) {
                    let alterX = x - drawOffsetX;
                    let alterY = y - drawOffsetY;

                    if ((alterX >= 0 && alterX < this.width && alterX < map.width) && 
                        (alterY >= 0 && alterY < this.height && alterY < map.height)) {
                        let aTileId = alterX + (alterY * map.width);
                        let posX = x * this.tileSize;
                        let posY = y * this.tileSize;

                        if (posX < 0 && posY < 0) { break; }
                        if (posX > this.width && posY > this.height) { break; }

                        {
                            let aTile = tile.clone();
                            aTile.x = posX;
                            aTile.y = posY;

                            aTile.gotoAndStop(layers.base[aTileId] - 1);

                            if (this.state == STATE_LOADINGMAP) {
                                aTile.alpha = 0;
                            }

                            this.containerMap.addChild(aTile);
                            
                            tileTotal++;
                        }

                        if (layers.base[aTileId] != undefined && layers.fringe[aTileId] != 0) {
                            let aTile = tile.clone();
                            aTile.x = posX;
                            aTile.y = posY;

                            aTile.gotoAndStop(layers.fringe[aTileId] - 1);

                            if (this.state == STATE_LOADINGMAP) {
                                aTile.alpha = 0;
                            }

                            this.containerMap.addChild(aTile);
                            tileTotal++;
                        }

                        if (this.debugContainer.visible) {
                            var text = new createjs.Text(`${x}x${y}\n${alterX}x${alterY}`, "10px Courier New", "#000");
                            text.x = posX + 1;
                            text.y = posY + 1;

                            if (this.state == STATE_LOADINGMAP) {
                                text.alpha = 0;
                            }

                            this.containerMap.addChild(text);
                        }

                        if (this.debugContainer.visible && map.triggers[aTileId] !== undefined) {
                            var text = new createjs.Text('T', "40px Arial", "#F0F");
                            text.x = posX;
                            text.y = posY;

                            if (this.state == STATE_LOADINGMAP) {
                                text.alpha = 0;
                            }

                            this.containerMap.addChild(text);
                        }
                    }

                    if (x == centerX && y == centerY) {
                        if (this.containerPlayer.children.length === 0) {
                            this.containerPlayer.addChild(this.currentPlayer.image);
                        }

                        this.currentPlayer.image.x = x * this.tileSize;
                        this.currentPlayer.image.y = y * this.tileSize;
                    }
                }            
            }

            this.debugMessage('TILES', tileTotal);
        }
    }

    drawInterface() {
        this.hpValue.innerText = this.currentPlayer.health;
        this.hpTotal.innerText = this.currentPlayer.totalHealth;

        this.manaValue.innerText = this.currentPlayer.magic;
        this.manaTotal.innerText = this.currentPlayer.totalMagic;
    }

    clearMessages() {
        while (this.statusBar.firstChild) {
            this.statusBar.removeChild(this.statusBar.firstChild);
        }
    }

    showMessage(msg) {
        let newMsg = document.createElement('div');
        newMsg.innerText = msg;
        this.statusBar.appendChild(newMsg);
        this.statusBar.scrollTop = this.statusBar.scrollHeight;
    }

    loadMap(name) {
       if (this.maps[name] === undefined) {
           throw `MAP(${name}) ERROR: 404 Map Not Found!`;
       }

       this.mapToLoad = name;       

       this.setState(STATE_LOADINGMAP);
    }

    movePlayer(x, y) {
        let newX = this.currentPlayer.x + x;
        let newY = this.currentPlayer.y + y;
        let realId = newX + newY * this.currentMap.width;

        if (this.currentMap.triggers[realId] !== undefined) {
            eval(this.currentMap.triggers[realId]);
        }        

        if (this.currentMap.layers.fringe[realId] != 0) {
            return;
        }

        if (this.currentPlayer.x + x >= 0 && this.currentPlayer.x + x < this.currentMap.width) {
            this.currentPlayer.x += x;
        }    

        if (this.currentPlayer.y + y >= 0 && this.currentPlayer.y + y < this.currentMap.height) {
            this.currentPlayer.y += y;
        }

        this.draw();
    }

    toggleInventoryView() {
        console.log('this would\'ve triggered the inventory screen...');
    }

    toggleDebugView() {
        this.debugContainer.visible = !this.debugContainer.visible;
        this.draw();
    }

    handleTrigger(triggerName) {
        switch(triggerName) {
            default: {
                if (this.debugContainer.visible) {
                    console.log(`TRIGGER(${triggerName})`);
                }
            }
        }
    }

    handleKeyboard(keyEvent) {
        if (this.state != STATE_PLAY) {
            return;
        }

        switch(keyEvent.keyCode) {
            case 38:
            case 87:
            {
                // this.showMessage(`${this.player.name} walks North`);
                this.movePlayer(0, -1);
            }
            break;

            case 37:
            case 65:
            {
                // this.showMessage(`${this.player.name} walks West`);
                this.movePlayer(-1, 0);
            }
            break;

            case 40:
            case 83:
            {
                // this.showMessage(`${this.player.name} walks South`);
                this.movePlayer(0, 1);
            }
            break;

            case 39:
            case 68:
            {
                // this.showMessage(`${this.player.name} walks East`);
                this.movePlayer(1, 0);
            }
            break;

            case 73:
            {
                this.toggleInventoryView();
            }
            break;

            case 187:
            {
                this.toggleDebugView();
            }
            break;

            default:
            {
                if (this.debugContainer.visible) {
                    console.log(`KEYBOARD(${keyEvent.keyCode})`);
                }
            }
            break;
        }
    }

    loadTileset(tilesetUri) {
        this.tileset = new createjs.SpriteSheet({
            images: [tilesetUri],
            frames: {
                height: this.tileSize,
                width: this.tileSize
            }
        });
    }

    preloaderComplete(e) {
        this.setState(STATE_MAINMENU);
    }

    preloaderFileReady(fileLoadEvent) {
        let file = fileLoadEvent.item;
        let type = file.type

        if (type == 'json') {
            let jsonData = fileLoadEvent.result;
            if (jsonData.type !== undefined && jsonData.type === 'map') {
                let loadedMap = Map.ParseJson(jsonData);
                this.maps[loadedMap.name] = loadedMap;
            }
        }
    }

    randomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    debugMessage(who, what, extra='') {
        if (this.debugContainer.visible) {
            let newDebugMsg = `${who}(${what})${extra}`;
            if (this.oldDebugMsg !== newDebugMsg) {
                this.oldDebugMsg = newDebugMsg;
                console.info(newDebugMsg);
            }
        }
    }
}