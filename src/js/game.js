const STATE_UNINITIALIZED = Symbol('STATE_UNINITIALIZED');
const STATE_MAINMENU = Symbol('STATE_MAINMENU');
const STATE_PLAY = Symbol('STATE_PLAY');

class Game {
    constructor(tileSize=32, frameRate=60, canvasId='gs') {
        this.tileSize = tileSize;
        this.frameRate = frameRate;
        this.canvasId = canvasId;

        this.player = null;

        this.gameMap = {
            width: 0,
            height: 0,
            base: [],
            fringe: [],
            object: []
        };

        this.map = new createjs.Container();
        this.playerIcon = new createjs.Container();

        // Views
        this.viewNewPlayer = document.getElementById('newplayer');
        this.viewNewPlayerStats = document.getElementById('newplayer-statlist');

        this.viewGameBar = document.getElementById('gamebar');

        this.hpValue = document.getElementById('value-hp');
        this.hpTotal = document.getElementById('value-total-hp');

        this.manaValue = document.getElementById('value-mana');
        this.manaTotal = document.getElementById('value-total-mana');

        this.statusBar = document.getElementById('gamebar-right');

        this.state = STATE_UNINITIALIZED;
    }

    initialize() {
        if (this.state == STATE_UNINITIALIZED) {
            this.loadTileset('art/tileset.png');
            
            this.stage = new createjs.Stage(this.canvasId);
            this.stage.addChild(this.map);
            this.stage.addChild(this.playerIcon);

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
        this.stage.update();
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
                        self.player = new Player();
                        self.player.x = 50;
                        self.player.y = 50;
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

                this.showMessage('You awake, dazed and confused.');

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
        if (this.state != STATE_PLAY) {
            return;
        }

        let gameMap = this.gameMap;
        
        this.map.removeAllChildren();

        if (gameMap.base !== undefined && gameMap.base.length > 0) {
            let totalTilesX = this.width / this.tileSize;
            let totalTilesY = this.height / this.tileSize;

            let drawTotalTilesX = totalTilesX + 2;
            let drawTotalTilesY = totalTilesY + 2;

            let centerX = Math.floor(totalTilesX / 2);
            let centerY = Math.floor(totalTilesY / 2);

            let drawOffsetX = centerX - this.player.x;
            let drawOffsetY = centerY - this.player.y;

            let tile = new createjs.Sprite(this.tileset);

            let tileTotal = 0;

            for (let x = 0; x < drawTotalTilesX; x++) {
                for (let y = 0; y < drawTotalTilesY; y++) {
                    let alterX = x - drawOffsetX;
                    let alterY = y - drawOffsetY;

                    if ((alterX >= 0 && alterX < this.width && alterX < this.gameMap.width) && 
                        (alterY >= 0 && alterY < this.height && alterY < this.gameMap.height)) {
                        let aTileId = alterX + (alterY * this.gameMap.width);
                        let posX = x * this.tileSize;
                        let posY = y * this.tileSize;

                        if (posX < 0 && posY < 0) { break; }
                        if (posX > this.width && posY > this.height) { break; }

                        {
                            let aTile = tile.clone();
                            aTile.x = posX;
                            aTile.y = posY;

                            aTile.gotoAndStop(this.gameMap.base[aTileId] - 1);

                            this.map.addChild(aTile);
                            tileTotal++;
                        }

                        if (this.gameMap.base[aTileId] != undefined && this.gameMap.fringe[aTileId] != 0) {
                            let aTile = tile.clone();
                            aTile.x = posX;
                            aTile.y = posY;

                            aTile.gotoAndStop(this.gameMap.fringe[aTileId] - 1);

                            this.map.addChild(aTile);
                            tileTotal++;
                        }
                    }

                    if (x == centerX && y == centerY) {
                        if (this.playerIcon.children.length === 0) {
                            this.playerIcon.addChild(this.player.image);
                        }

                        this.player.image.x = x * this.tileSize;
                        this.player.image.y = y * this.tileSize;
                    }
                }            
            }

            console.log(`${tileTotal} rendered!`);
        }
    }

    drawInterface() {
        this.hpValue.innerText = this.player.health;
        this.hpTotal.innerText = this.player.totalHealth;

        this.manaValue.innerText = this.player.magic;
        this.manaTotal.innerText = this.player.totalMagic;
    }

    showMessage(msg) {
        let newMsg = document.createElement('div');
        newMsg.innerText = msg;
        this.statusBar.appendChild(newMsg);
        this.statusBar.scrollTop = this.statusBar.scrollHeight;
    }

    movePlayer(x, y) {
        if (this.player.x + x >= 0 && this.player.x + x < this.gameMap.width) {
            this.player.x += x;
        }    

        if (this.player.y + y >= 0 && this.player.y + y < this.gameMap.height) {
            this.player.y += y;
        }

        this.draw();
    }

    toggleDebugView() {
        this.debugContainer.visible = !this.debugContainer.visible;
    }

    handleKeyboard(keyEvent) {
        if (this.state != STATE_PLAY) {
            return;
        }

        switch(keyEvent.keyCode) {
            case 87:
            {
                // this.showMessage(`${this.player.name} walks North`);
                this.movePlayer(0, -1);
            }
            break;

            case 65:
            {
                // this.showMessage(`${this.player.name} walks West`);
                this.movePlayer(-1, 0);
            }
            break;

            case 83:
            {
                // this.showMessage(`${this.player.name} walks South`);
                this.movePlayer(0, 1);
            }
            break;

            case 68:
            {
                // this.showMessage(`${this.player.name} walks East`);
                this.movePlayer(1, 0);
            }
            break;

            case 187:
            {
                this.toggleDebugView();
            }
            break;

            default:
            {
                console.log(keyEvent.keyCode);
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
                this.gameMap.width = jsonData.width;
                this.gameMap.height = jsonData.height;
                this.gameMap.base = jsonData.layers[0].data;
                this.gameMap.fringe = jsonData.layers[1].data;
                // TODO: more layers!
            }
        }
    }
}