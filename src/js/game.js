class Game {
    constructor(tileSize = 32, frameRate = 60, canvasId = VIEW_CANVAS_TAGNAME) {
        this.tileSize = tileSize;
        this.frameRate = frameRate;
        this.canvasId = canvasId;

        this.gui = {};
        this.maps = [];
        this.messages = [];

        this.currentMap = null;
        this.currentPlayer = null;

        this.containerMap = new createjs.Container();
        this.containerPlayer = new createjs.Container();

        this.viewDebug = document.createElement('div');
        this.viewDebug.setAttribute('id', VIEW_DEBUG_TAGNAME);
        this.viewGui = document.createElement('div');
        this.viewGui.setAttribute('id', VIEW_GUI_TAGNAME);

        this.statsView = new Stats();

        this.state = STATE_UNINITIALIZED;
    }

    initialize() {
        if (this.state == STATE_UNINITIALIZED) {
            this.viewDebug.classList.add('hidden');
            this.viewDebug.appendChild(this.statsView.dom);
            document.body.appendChild(this.viewDebug);

            document.body.appendChild(this.viewGui);

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
            console.error('GAME() ERROR: Game object already initialized!');
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

        this.tickAnimations();

        this.stage.update();

        if (this.gui !== undefined && this.gui.needsUpdate) {
            this.gui.update();
            this.gui.needsUpdate = false;
        }

        this.statsView.end();
    }

    tickAnimations() {
        const tilesDivisorPerFrame = 15;
        switch(this.state) {
            case STATE_LOADINGMAP:
            {
                this.containerPlayer.visible = false;
                let tilesToAnimate = Math.floor(this.totalDrawnTiles / tilesDivisorPerFrame);
                if (this.containerMap.numChildren > 0) {
                    for (var idx = 0; idx < tilesToAnimate; idx++) {
                        let rndTile = this.containerMap.getChildAt(Utils.RandomNumber(0, this.containerMap.numChildren));
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
                    this.drawMap();
                    this.mapToShowIds = Array.from(Array(this.containerMap.numChildren).keys());
                    this.setState(STATE_SHOWINGMAP);
                }
            }
            break;

            case STATE_SHOWINGMAP:
            {
                let tilesToAnimate = Math.floor(this.totalDrawnTiles / tilesDivisorPerFrame);
                if (this.mapToShowIds.length > 0) {
                    for (var idx = 0; idx < tilesToAnimate; idx++) {
                        let rndId = Utils.RandomNumber(0, this.mapToShowIds.length);
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
                    this.containerPlayer.visible = true;
                    this.setState(STATE_PLAY);
                }
            }
            break;
        }
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
        let self = this;

        switch (newState) {
            case STATE_NEWGAME:
            {
                this.setGameboardVisibility(false);
                this.loadGui('newgame').then(function(totalbindings) {
                    for (var i = 0; i < Player.Stats.length; i++) {
                        let statName = Player.Stats[i];
                        let statLabel = document.createElement('label');
                        let statSpan = document.createElement('span');
                        statSpan.innerText = statName;
                        statLabel.appendChild(statSpan);
                        let statInput = document.createElement('input');
                        statInput.setAttribute('type', 'number');
                        statInput.setAttribute('max', '10');
                        statInput.setAttribute('value', '5');
                        statInput.setAttribute('min', '1');
                        statLabel.appendChild(statInput);
                        self.gui.bindings[statName.toLowerCase()] = statInput;
                        self.gui.bindings.stats.appendChild(statLabel);
                    }

                    self.currentPlayer = new Player();

                    self.gui.bindings.pointsleft.value = self.currentPlayer.statPointsRemaining;

                    for (let k in self.currentPlayer.stats) {
                        const callbackFunc = function(e) {
                            if (e.target.value == self.currentPlayer.stats[k]) { return; }
                            self.currentPlayer.setStat(k, e.target.value > self.currentPlayer.stats[k]);
                            self.gui.bindings.pointsleft.value = self.currentPlayer.statPointsRemaining;
                            for (let k in self.currentPlayer.stats) {
                                self.gui.bindings[k].value = self.currentPlayer.stats[k];
                            }
                        };
                        self.gui.bindings[k].addEventListener('keyup', callbackFunc);
                        self.gui.bindings[k].addEventListener('keydown', callbackFunc);
                        self.gui.bindings[k].addEventListener('mouseup', callbackFunc);
                    }

                    self.gui.bindings.button_start.addEventListener('click', function() {
                        self.loadMap('home');
                    });
                });

                // DEV ONLY
                // self.gui.bindings.button_start.click();
            }
            break;

            case STATE_PLAY:
            {
                this.setGameboardVisibility(true);

                this.loadGui('gamebar').then(function(totalbindings) {
                    self.gui.update = function() {
                        let binds = self.gui.bindings;
                        binds.value_hp.innerText = self.currentPlayer.health;
                        binds.value_total_hp.innerText = self.currentPlayer.totalHealth;
                        
                        binds.value_mana.innerText = self.currentPlayer.magic;
                        binds.value_total_mana.innerText = self.currentPlayer.totalMagic;
                    };
                    self.draw();
                });
            }
            break;

            case STATE_INVENTORY:
            {
                this.setGameboardVisibility(false);

                this.loadGui('inventory').then(function(totalbindings) {
                    self.gui.bindings.name.innerText = self.currentPlayer.name;
                    let playerInventory = self.currentPlayer.inventoryGet;
                    for (let k in playerInventory) {
                        let listItem = document.createElement('li');
                        listItem.innerText = `${k}:${self.currentPlayer.inventoryGet[k]}`;
                        console.log(self.gui.bindings.inventory);
                        self.gui.bindings.inventory.appendChild(listItem);
                    }
                });
            }
            break;
        }
    }

    setGameboardVisibility(isVisible) {
        this.containerMap.visible = this.containerPlayer.visible = isVisible;
    }

    draw() {
        this.drawDbg();
        this.drawMap();
        this.drawGui();
    }

    drawDbg() {
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
        if (this.currentMap === null || this.currentMap === undefined || !this.containerMap.visible) {
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

            this.totalDrawnTiles = tileTotal;
            this.debugMessage('TILES', this.totalDrawnTiles);
        }
    }

    drawGui() {
        if (this.gui !== undefined && typeof(this.gui.update) === 'function') {
            this.gui.update();
        }
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

        console.log(this.currentMap);

        this.mapToLoad = name;

        this.setState(STATE_LOADINGMAP);
    }

    movePlayer(x, y) {
        if (this.state != STATE_PLAY) {
            return;
        }

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
        if (this.state === STATE_PLAY) {
            this.setState(STATE_INVENTORY);
        } else if (this.state === STATE_INVENTORY) {
            this.setState(STATE_PLAY);
        }
    }

    toggleDebugView() {
        this.debugContainer.visible = !this.debugContainer.visible;
        if (this.debugContainer.visible) {
            this.viewDebug.classList.remove('hidden');
        } else {
            this.viewDebug.classList.add('hidden');
        }
        this.draw();
    }

    handleTrigger(triggerName) {
        switch (triggerName) {
            default: {
                if (this.debugContainer.visible) {
                    console.log(`TRIGGER(${triggerName})`);
                }
            }
        }
    }

    handleKeyboard(keyEvent) {
        switch (keyEvent.keyCode) {
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

    loadGui(name) {
        let self = this;
        return fetch(`${name}.html`).then(function(http) {
            return http.text();
        }).then(function(html) {
            self.gui = Object.assign({
                name: name,
                fragment: document.createRange().createContextualFragment(html),
                tick: noop(),
                update: noop(),
                needsUpdate: false,
                bindings: {}
            });
            let ids = self.gui.fragment.querySelectorAll('*[id]:not([id=""])');
            for (let i = 0; i < ids.length; i++) {
                let node = ids[i];
                self.gui.bindings[node.id.replace('-', '_')] = node;
            }
            self.viewGui.empty();
            self.viewGui.appendChild(self.gui.fragment);
            return ids.length;
        }).catch(function(err) {
            throw err;
        });
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
        this.setState(STATE_NEWGAME);
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

    debugMessage(who, what, extra = '') {
        if (this.debugContainer.visible) {
            let newDebugMsg = `${who}(${what})${extra}`;
            if (this.oldDebugMsg !== newDebugMsg) {
                this.oldDebugMsg = newDebugMsg;
                console.info(newDebugMsg);
            }
        }
    }
}