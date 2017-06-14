const tileSize = 32; // Pixels

const smolVillage = [
    [1, 1, 1, 2, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 2, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 2, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 2, 1, 1, 3, 1, 3, 1],
    [1, 1, 1, 2, 2, 2, 2, 2, 2, 2],
    [1, 1, 1, 2, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 2, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 2, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 2, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 2, 1, 1, 1, 1, 1, 1]
]


let currentMap = undefined;

let playerX = 5;
let playerY = 5;
let player;

let tileSet;
let stage;
let map;

let debugShow = false;
let debugContainer;

function main(window) {
    //Create a stage by getting a reference to the canvas
    stage = new createjs.Stage("gs");

    createjs.Ticker.useRAF = true;
    createjs.Ticker.setFPS(60);
    createjs.Ticker.addEventListener("tick", tick);

    window.addEventListener('resize', resize);
    window.addEventListener('keydown', handleKeyboard);

    tileSet = new createjs.SpriteSheet({
        images: ["assets/art/tilesheet.png"],
        frames: {
            height: tileSize,
            width: tileSize
        }
    });
    
    map = new createjs.Container();
    stage.addChild(map);

    debugContainer = new createjs.Container();
    stage.addChild(debugContainer);

    currentMap = smolVillage;    

    resize();
}

function handleKeyboard(keyEvent) {
    switch(keyEvent.keyCode) {
        case 87:
        {
            movePlayer(0, -1);
        }
        break;

        case 65:
        {
            movePlayer(-1, 0);
        }
        break;

        case 83:
        {
            movePlayer(0, 1);
        }
        break;

        case 68:
        {
            movePlayer(1, 0);
        }
        break;

        case 77:
        {
            debugShow = !debugShow;
            buildMap();
        }
        break;

        default:
        {
            console.log(keyEvent.keyCode);
        }
        break;
    }
}

function buildMap() {
    debugContainer.removeAllChildren();
    
    if (debugShow) {
        var textPlayerPos = new createjs.Text(`Player Pos: ${playerX}x${playerY}`, "20px Courier New", "#000");
        textPlayerPos.x = 10;
        textPlayerPos.y = 10;
        debugContainer.addChild(textPlayerPos);

        var textMapSize = new createjs.Text(`Map Size: ${currentMap[0].length}x${currentMap.length}`, "20px Courier New", "#000");
        textMapSize.x = 10;
        textMapSize.y = 40;
        debugContainer.addChild(textMapSize);
    }

    map.removeAllChildren();

    if (currentMap !== undefined) {
        map.removeAllChildren();

        let rawW = stage.canvas.width / tileSize;
        let rawH = stage.canvas.height / tileSize;
        
        let calcW = rawW + 2;
        let calcH = rawH + 2;

        let centerX = Math.floor(rawW / 2);
        let centerY = Math.floor(rawH / 2);

        let drawOffsetX = centerX - playerX;
        let drawOffsetY = centerY - playerY;

        let tile = new createjs.Sprite(tileSet);    

        for (var x = 0; x < calcW; x++) {
            for (var y = 0; y < calcH; y++) {
                let alterX = x - drawOffsetX;
                let alterY = y - drawOffsetY;

                if ((alterX >= 0 && alterX < smolVillage[0].length) && (alterY >= 0 && alterY < smolVillage.length)) {
                    let aTile = tile.clone();
                    aTile.x = x * tileSize;
                    aTile.y = y * tileSize;
                    
                    aTile.gotoAndStop(smolVillage[alterY][alterX]);
                    
                    map.addChild(aTile);
                }

                if (x == centerX && y == centerY) {
                    if (player === undefined) {
                        player = new createjs.Bitmap('assets/art/spritefox-male.png');
                        stage.addChild(player);
                    }

                    player.x = x * tileSize;
                    player.y = y * tileSize;
                }
            }            
        }
    }
}

function movePlayer(x, y) {
    if (playerX + x >= 0 && playerX + x < currentMap[0].length) {
        playerX += x;
    }    

    if (playerY + y >= 0 && playerY + y < currentMap.length) {
        playerY += y;
    }

    buildMap();
}

function tick() {
    
    stage.update();
}

function resize() { 
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;

    buildMap();

    stage.update();
}