class Game {
    constructor(tileSize=32, frameRate=60, canvasId='gs') {
        this.tileSize = tileSize;
        this.frameRate = frameRate;
        this.canvasId = canvasId;

        this.map = {
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

        this.initialized = false;
        this.drawInvalidated = false;
    }

    initialize() {
        if (!this.initialized) {
            this.stage = new createjs.Stage(this.canvasId);

            this.resize();

            createjs.Ticker.useRAF = true;
            createjs.Ticker.setFPS(this.frameRate);
            createjs.Ticker.addEventListener("tick", () => this.tick());

            window.addEventListener('resize', () => this.resize());
            window.addEventListener('keydown', (e) => this.handleKeyboard(e));            

            this.initialized = true;
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
    }

    movePlayer(x, y) {

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
}