class Map {
    static ParseJson(data) {
        if (typeof(data) !== 'object' || data.properties === undefined) {
            return null;
        }
        
        let mapName = "";
        let startPos = "";

        if (data.version < 1.2) {
            mapName = data.properties.map_name;
            startPos = data.properties.start_pos;
        } else {
            mapName = data.properties.find(function(el) { return el.name == "map_name" }).value;
            startPos = data.properties.find(function(el) { return el.name == "start_pos" }).value;
        }

        let newMap = new Map(mapName, data.width, data.height);
        if (startPos !== "" && startPos.includes(',')) {
            let startPosData = startPos.split(',');
            newMap.startPos.x = parseInt(startPosData[0]);
            newMap.startPos.y = parseInt(startPosData[1]);
            if (newMap.startPos.x === NaN || newMap.startPos.y === NaN) {
                newMap.startPos.x = 0;
                newMap.startPos.y = 0;
                game.debugMessage('map', 'Invalid start_pos in map file.');
            }
        }
        for (let idx = 0; idx < data.layers.length; idx++) {
            let layer = data.layers[idx];
            if (layer.type == 'tilelayer') {
                newMap.layers[layer.name.toLowerCase()] = layer.data;
            } else if (layer.type == 'objectgroup') {
                for (var t = 0; t < layer.objects.length; t++) {
                    let tObj = layer.objects[t];
                    let tW = Math.ceil(tObj.height / game.tileSize);
                    let tH = Math.ceil(tObj.width / game.tileSize);
                    let tX = Math.ceil(tObj.x / game.tileSize);
                    let tY = Math.ceil(tObj.y / game.tileSize);
                    let tCallbackStr = `game.handleTrigger('${tObj.type}', '${tObj.name}')`;

                    for (var tWIdx = 0; tWIdx < tW; tWIdx++) {
                         for (var tHIdx = 0; tHIdx < tH; tHIdx++) {
                            let realId = (tX + tWIdx) + (tY + tHIdx) * newMap.width;
                            newMap.triggers[realId] = tCallbackStr;
                         }
                    }               
                }
            }
        }  
        return newMap;
    }

    static Deserialize(data) {
        const mapObj = JSON.parse(data);
        let newMapObj = new Map(mapObj.name, mapObj.width, mapObj.height);
        newMapObj.startPos = mapObj.startPos;
        newMapObj.playerPos = mapObj.playerPos;
        newMapObj.layers = mapObj.layers;
        newMapObj.triggers = mapObj.triggers;
        for (let idx = 0; idx < mapObj.agents.length; idx++) {
            newMapObj.agents.push(Agent.Deserialize(mapObj.agents[idx]));
        }
        return newMapObj;
    }
    
    constructor(name='Map', width=1, height=1) {
        this.name = name;
        this.width = width;
        this.height = height;
        this.startPos = { x: -1, y: -1 };
        this.playerPos = { x: -1, y: -1 };

        this.layers = {
            base: [],
            fringe: [],
            object: []
        };

        this.triggers = [];
        this.agents = [];
    }

    serialize() {
        // start with an empty object (see other alternatives below) 
        let jsonObj = {};

        // add all properties
        const proto = Object.getPrototypeOf(this);
        for (const key of Object.keys(proto)) {
            const desc = Object.getOwnPropertyDescriptor(proto, key);
            const hasGetter = desc && typeof desc.get === 'function';
            if (hasGetter) {
                jsonObj[key] = desc.get();
            }
        }

        jsonObj = Object.assign(jsonObj, this);

        return JSON.stringify(jsonObj);
    }
}