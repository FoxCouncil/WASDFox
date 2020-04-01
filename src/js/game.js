class Game {
    constructor(tileSize = 32, frameRate = 60, canvasId = VIEW_CANVAS_TAGNAME) {
        this.tileSize = tileSize;
        this.frameRate = frameRate;
        this.canvasId = canvasId;

        this.gui = {};
        this.maps = {};
        this.smaps = {};
        this.items = [];
        this.cache = [];
        this.messages = [];
        this.activeAgents = {};

        this.firstDraw = true;
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
            this.loadCharset('art/charset.png');

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

            this.queue.loadFile('maps/test.json');
            this.queue.loadFile('maps/home.json');
            this.queue.loadFile('items.json');
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
                    for (let idx = 0; idx < tilesToAnimate; idx++) {
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
                    if (this.mapToLoad === undefined) {
                        return;
                    }
                    this.currentMap = this.mapToLoad;
                    delete this.mapToLoad;
                    let map = this.maps[this.currentMap];
                    if (map.playerPos.x == -1 && map.playerPos.y == -1) {
                        map.playerPos.x = map.startPos.x;
                        map.playerPos.y = map.startPos.y;
                    }
                    this.drawMap();
                    this.mapToShowIds = Array.from(Array(this.containerMap.numChildren).keys());
                    this.stateSet(STATE_SHOWINGMAP);
                }
            }
            break;

            case STATE_SHOWINGMAP:
            {
                let tilesToAnimate = Math.floor(this.totalDrawnTiles / tilesDivisorPerFrame);
                if (this.mapToShowIds.length > 0) {
                    for (let idx = 0; idx < tilesToAnimate; idx++) {
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
                    this.stateSet(STATE_PLAY);
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

    setGameboardVisibility(isVisible) {
        this.containerMap.visible = this.containerPlayer.visible = isVisible;
    }

    draw() {
        this.drawDbg();
        this.drawMap();
        this.drawGui();
        this.stateSave();
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
        if (this.currentMap == null || !this.containerMap.visible) {
            return;
        }

        let map = this.maps[this.currentMap];
        let layers = map.layers;

        this.containerMap.removeAllChildren();

        if (layers.base !== undefined && layers.base.length > 0) {
            let totalTilesX = this.width / this.tileSize;
            let totalTilesY = this.height / this.tileSize;

            let drawTotalTilesX = totalTilesX;
            let drawTotalTilesY = totalTilesY;

            let centerX = Math.floor(totalTilesX / 2);
            let centerY = Math.floor(totalTilesY / 2);

            let drawOffsetX = centerX - map.playerPos.x;
            let drawOffsetY = centerY - map.playerPos.y;

            let char = new createjs.Sprite(this.charset);

            // Draw Agents
            let aEnemy = new createjs.Container();

            let aChar = char.clone();
            aChar.gotoAndStop(1);
            aEnemy.addChild(aChar);

            this.activeAgents = {};
            if (map.agents.length > 0) {
                for (let idx = 0; idx < map.agents.length; idx++) {
                    let enemy = map.agents[idx];
                    if (!this.firstDraw) {
                        enemy.tick(this, map);
                    }
                    this.activeAgents[`${enemy.pos.x}x${enemy.pos.y}`] = enemy;
                }
            }

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

                        if (layers.fringe[aTileId] != undefined && layers.fringe[aTileId] != 0) {
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

                        if (layers.object[aTileId] != undefined && layers.object[aTileId] != 0) {
                            let aTile = tile.clone();
                            aTile.x = posX;
                            aTile.y = posY;

                            aTile.gotoAndStop(layers.object[aTileId] - 1);

                            if (this.state == STATE_LOADINGMAP) {
                                aTile.alpha = 0;
                            }

                            this.containerMap.addChild(aTile);
                            tileTotal++;
                        }

                        let agentId = `${alterX}x${alterY}`;
                        let agentObj = this.activeAgents[agentId];
                        if (agentObj != null) {
                            let aTile = aEnemy.clone(true);
                            aTile.width = 32;
                            aTile.height = 32;
                            aTile.x = posX;
                            aTile.y = posY;
                            this.containerMap.addChild(aTile);
                        }

                        if (this.debugContainer.visible) {
                            let textPos = new createjs.Text(`${x}x${y}\n${alterX}x${alterY}`, "10px Courier New", "#000");
                            textPos.x = posX + 1;
                            textPos.y = posY + 1;

                            if (this.state != STATE_LOADINGMAP) {
                                this.containerMap.addChild(textPos);
                            }

                            if (map.triggers[aTileId] != null) {
                                let textTrigger = new createjs.Text('T', "40px Arial", "#F0F");
                                textTrigger.x = posX;
                                textTrigger.y = posY;

                                if (this.state != STATE_LOADINGMAP) {
                                    this.containerMap.addChild(textTrigger);
                                }
                            } else if (map.layers.object[aTileId] != 0) {
                                let textTrigger = new createjs.Text('O', "32px Arial", "#F0F");
                                textTrigger.x = posX;
                                textTrigger.y = posY;

                                if (this.state != STATE_LOADINGMAP) {
                                    this.containerMap.addChild(textTrigger);
                                }
                            }
                        }
                    }

                    if (x == centerX && y == centerY) {
                        if (this.containerPlayer.children.length === 0) {
                            this.containerPlayer.addChild(char.clone());
                        }

                        let aPlayer = this.containerPlayer.children[0];
                        aPlayer.x = x * this.tileSize;
                        aPlayer.y = y * this.tileSize;
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
        this.messages = [];
    }

    showMessage(msg) {
        this.messages.push(msg);
    }

    loadMap(name) {
        if (this.state !== STATE_PLAY) {
            throw `MAP() ERROR: Cannot switch map while in state (${this.state.toString()})!`;
        }

        if (this.maps[name] === undefined) {
            throw `MAP(${name}) ERROR: 404 Map Not Found!`;
        }

        this.mapToLoad = name;

        this.stateSet(STATE_LOADINGMAP);
    }

    getItem(id) {
        return this.items.find(x => x.id === id);
    }

    enemySpawn() {
        let newEnemy = new Agent();
        let playMap = this.maps[this.currentMap];

        newEnemy.pos.x = playMap.playerPos.x + 1;
        newEnemy.pos.y = playMap.playerPos.y + 1;

        this.maps[this.currentMap].agents.push(newEnemy);
        this.draw();
    }

    agentsClear() {
        this.maps[this.currentMap].agents = [];
        this.draw();
    }

    playerAddItem(item) {
        switch (item.type) {
            case "money": {
                this.currentPlayer.money += parseInt(item.value);
                this.showMessage(`You pick up ${item.name}`);
            }
            break;

            default: {
                this.currentPlayer.inventoryAddItem(item);
                this.showMessage(`You pick up ${item.name}`);
            }
            break;
        }
    }

    playerDamage(agent) {

    }

    playerMove(x, y) {
        if (this.state != STATE_PLAY) {
            return;
        }

        let map = this.maps[this.currentMap];

        const newX = map.playerPos.x + x; // x is the direction moving on that axis
        const newY = map.playerPos.y + y; // y is the direction moving on that axis

        const realId = newX + newY * map.width;

        if (map.triggers[realId] != null) {
            let triggerStr = map.triggers[realId];
            let triggerRtn = eval(`(${triggerStr})`);
            if (triggerRtn) return;
        }

        let fringeCheck = map.layers.fringe[realId];
        if (fringeCheck !== undefined && fringeCheck != 0) {
            return;
        }

        let objectCheck = map.layers.object[realId];
        if (objectCheck !== undefined && objectCheck != 0) {
            let item = this.getItem(objectCheck);
            if (item != null) {
                map.layers.object[realId] = 0;
                this.playerAddItem(item);
            }
        }

        let enemyAgent = this.activeAgents[`${newX}x${newY}`];
        if (enemyAgent != null) {
            console.log('Curb stomped: ' + enemyAgent.name);
        } else {
            if (map.playerPos.x + x >= 0 && map.playerPos.x + x < map.width) {
                map.playerPos.x += x;
            }

            if (map.playerPos.y + y >= 0 && map.playerPos.y + y < map.height) {
                map.playerPos.y += y;
            }
        }

        this.draw();
    }

    toggleInventoryView() {
        if (this.state === STATE_PLAY) {
            this.stateSet(STATE_INVENTORY);
        } else if (this.state === STATE_INVENTORY) {
            this.stateSet(STATE_PLAY);
        }
    }

    toggleDebugView() {
        this.debugView(!this.debugContainer.visible);
    }

    debugView(state) {
        this.debugContainer.visible = state;
        if (this.debugContainer.visible) {
            this.viewDebug.classList.remove('hidden');
        } else {
            this.viewDebug.classList.add('hidden');
        }
        this.draw();
    }

    handleTrigger(triggerType, triggerArgs) {
        switch (triggerType) {
            case 'map': return game.handleTriggerMap(triggerArgs);
            case 'message': {
                alert(triggerArgs);
                return true;
            }
            case 'store': {
                console.log('WOWEEEEEEE');
                return true;
            }
            default: {
                if (this.debugContainer.visible) {
                    console.log(`TRIGGER(${triggerType}, ${triggerArgs})`);
                }
            }
            break;
        }

        return false;
    }

    handleTriggerMap(mapName) {
        switch(mapName) {
            case "test": {
                game.loadMap('test');
                return true;
            }
            case "home": {
                game.loadMap('home');
                return true;
            }
        }

        return false;
    }

    handleKeyboard(keyEvent) {
        switch (keyEvent.keyCode) {
            case 27:
            {
                if (this.state != STATE_PLAY && this.state != STATE_NEWGAME && this.state != STATE_UNINITIALIZED) {
                    this.stateSet(STATE_PLAY);
                }
            }
            break;

            case 38:
            case 87:
            {
                // this.showMessage(`${this.player.name} walks North`);
                this.playerMove(0, -1);
            }
            break;

            case 37:
            case 65:
            {
                // this.showMessage(`${this.player.name} walks West`);
                this.playerMove(-1, 0);
            }
            break;

            case 40:
            case 83:
            {
                // this.showMessage(`${this.player.name} walks South`);
                this.playerMove(0, 1);
            }
            break;

            case 39:
            case 68:
            {
                // this.showMessage(`${this.player.name} walks East`);
                this.playerMove(1, 0);
            }
            break;

            // I
            case 73:
            {
                this.toggleInventoryView();
            }
            break;

            case 32:
            {
                this.draw();
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

    stateSet(newState) {
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
                this.stateClear();

                this.setGameboardVisibility(false);

                this.containerMap.removeAllChildren();

                this.loadGui('newgame').then(function(totalbindings) {
                    for (let i = 0; i < Player.Stats.length; i++) {
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
                        self.gui.bindings.button_start.disabled = true;
                        self.stateSet(STATE_PLAY);
                        self.loadMap('home');
                    });
                });
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
                        binds.value_hp_bar.style.backgroundSize = `auto ${parseInt(self.currentPlayer.health / self.currentPlayer.totalHealth * 100)}%`;

                        binds.value_mana.innerText = self.currentPlayer.magic;
                        binds.value_total_mana.innerText = self.currentPlayer.totalMagic;
                        binds.value_mana_bar.style.backgroundSize = `auto ${parseInt(self.currentPlayer.magic / self.currentPlayer.totalMagic * 100)}%`;

                        binds.display_one_value.innerText = `₻${self.currentPlayer.totalMoney}`;
                        binds.display_two_value.innerText = `0`;
                        binds.display_three_value.innerText = '100%';

                        while (binds.console.firstChild) {
                            binds.console.removeChild(binds.console.firstChild);
                        }
                        for (let i = 0; i < self.messages.length; i++) {
                            let newMsg = document.createElement('div');
                            newMsg.innerText = self.messages[i];
                            binds.console.appendChild(newMsg);
                        }
                        binds.console.scrollTop = binds.console.scrollHeight;
                    };
                    self.gui.bindings.button_inventory.addEventListener('click', function() { self.toggleInventoryView() });
                    self.gui.bindings.button_restart.addEventListener('click', function() { if (confirm("Are you sure you want to restart your game?")) { self.stateClear(); self.stateSet(STATE_NEWGAME); } });
                    self.draw();
                    self.firstDraw = false;
                });
            }
            break;

            case STATE_INVENTORY:
            {
                this.setGameboardVisibility(false);

                this.loadGui('inventory').then(function(totalbindings) {
                    self.gui.bindings.button_close.addEventListener('click', function() { self.toggleInventoryView(); });
                    self.gui.bindings.name.innerText = self.currentPlayer.name;
                    self.gui.bindings.money.innerText = `₻${self.currentPlayer.totalMoney}`;
                    let playerInventory = self.currentPlayer.inventoryGet;
                    for (let k in playerInventory) {
                        let item = self.getItem(parseInt(k));
                        let listItem = document.createElement('li');
                        listItem.innerText = `${item.name}:${self.currentPlayer.inventoryGet[k]}`;
                        self.gui.bindings.inventory.appendChild(listItem);
                    }
                });
            }
            break;
        }
    }

    stateSave() {
        if (this.state === STATE_UNINITIALIZED) {
            return;
        }
        let stateObj = {};
        stateObj.player = this.currentPlayer;
        stateObj.maps = [];
        for (let mapName in this.maps) {
            let map = this.maps[mapName];
            let mapStr = map.serialize();
            stateObj.maps.push(mapStr);
        }
        stateObj.currentMap = this.currentMap;
        stateObj.state = this.state.toString();
        stateObj.messages = this.messages;
        stateObj.debug = this.debugContainer.visible;
        localStorage.setItem('state', JSON.stringify(stateObj));
    }

    stateLoad() {
        let ls = localStorage.getItem('state');
        if (ls === null) {
            this.stateSet(STATE_NEWGAME);
            return;
        }

        let stateObj = JSON.parse(ls);
        this.maps = {};
        for (let mapIndex = 0; mapIndex < stateObj.maps.length; mapIndex++) {
            let map = Map.Deserialize(stateObj.maps[mapIndex]);
            let mapName = map.name;
            this.maps[mapName] = map;
        }
        this.currentMap = stateObj.currentMap;
        this.currentPlayer = Player.Load(stateObj.player);
        this.messages = stateObj.messages;
        this.debugView(stateObj.debug);
        this.stateSet(Utils.StringToState(stateObj.state));

        return true;
    }

    stateClear() {
        this.currentMap = null;
        this.messages = [];
        this.maps = {};
        for (let mapName in this.smaps) {
            let mapData = JSON.parse(this.smaps[mapName]);
            this.maps[mapName] = Map.ParseJson(mapData);
        }
        localStorage.removeItem('state');
    }

    loadGui(name) {
        let self = this;
        let guiFilename = `${name}.html`;
        let cacheCheck = new Promise(function(resolve) {
            if (self.cache[guiFilename] !== undefined) { resolve(self.cache[guiFilename]); }
            else { resolve(fetch(guiFilename).then(function(http) { let data = http.text(); self.cache[guiFilename] = data; return data; })); }
        });
        return cacheCheck.then(function(html) {
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

    loadCharset(charsetUri) {
        this.charset = new createjs.SpriteSheet({
            images: [charsetUri],
            frames: {
                height: this.tileSize,
                width: this.tileSize
            }
        });
    }

    preloaderComplete(e) {
        this.stateLoad();
    }

    preloaderFileReady(fileLoadEvent) {
        let file = fileLoadEvent.item;
        let type = file.type

        if (type == 'json') {
            let jsonData = fileLoadEvent.result;
            if (jsonData.type !== undefined && jsonData.type === 'map') {
                let loadedMap = Map.ParseJson(jsonData);
                if (loadedMap === null) {
                    console.error('Unable to parse map: ' + file.src);
                    return;
                }
                this.smaps[loadedMap.name] = JSON.stringify(jsonData);
                this.maps[loadedMap.name] = loadedMap;
            } else if (jsonData.type !== undefined && jsonData.type === 'items') {
                let itemsList = jsonData.items;
                for (let i = 0; i < itemsList.length; i++) {
                    let loadedItem = Item.ParseJson(itemsList[i]);
                    this.items.push(loadedItem);
                }
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