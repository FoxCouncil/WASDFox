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

        this.tileset = this.tileset = new createjs.SpriteSheet({
            images: ['art/tileset.png'],
            frames: {
                height: this.tileSize,
                width: this.tileSize
            }
        });

        this.map = new createjs.Container();
        this.playerIcon = new createjs.Container();

        // Views
        this.viewNewPlayer = document.getElementById('newplayer');

        this.state = STATE_UNINITIALIZED;
    }

    initialize() {
        if (this.state == STATE_UNINITIALIZED) {
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

    buildDebugView() {
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
        
        this.buildDebugView();
        this.drawMap();
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
                this.viewNewPlayer.classList.remove('hidden');
                if (document.getElementsByName('startgamebutton')[0].onclick == null) {
                    var self = this;
                    document.getElementsByName('startgamebutton')[0].onclick = function() {
                        self.player = new Player();
                        self.player.x = 50;
                        self.player.y = 50;
                        self.setState(STATE_PLAY);
                    }
                }
            }
            break;

            case STATE_PLAY: {
                this.viewNewPlayer.classList.add('hidden');
                this.drawMap();
            }
            break;
        }
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

            for (let x = 0; x < drawTotalTilesX; x++) {
                for (let y = 0; y < drawTotalTilesY; y++) {
                    let alterX = x - drawOffsetX;
                    let alterY = y - drawOffsetY;

                    if ((alterX >= 0 && alterX < this.gameMap.width) && 
                        (alterY >= 0 && alterY < this.gameMap.height)) {

                        let aTile = tile.clone();
                        aTile.x = x * this.tileSize;
                        aTile.y = y * this.tileSize;

                        let aTileId = alterX + (alterY * this.gameMap.width);

                        aTile.gotoAndStop(this.gameMap.base[aTileId] - 1);

                        this.map.addChild(aTile);
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
        }
    }

    movePlayer(x, y) {
        if (this.player.x + x >= 0 && this.player.x + x < this.gameMap.width) {
            this.player.x += x;
        }    

        if (this.player.y + y >= 0 && this.player.y + y < this.gameMap.height) {
            this.player.y += y;
        }

        this.drawMap();
    }

    toggleDebugView() {
        this.debugContainer.visible = !this.debugContainer.visible;
    }

    handleKeyboard(keyEvent) {
        switch(keyEvent.keyCode) {
            case 87:
            {
                this.movePlayer(0, -1);
            }
            break;

            case 65:
            {
                this.movePlayer(-1, 0);
            }
            break;

            case 83:
            {
                this.movePlayer(0, 1);
            }
            break;

            case 68:
            {
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
                // TODO: more layers!
            }
        }
    }
}