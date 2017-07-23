class Map {
    static ParseJson(data) {
        if (typeof(data) !== 'object' || data.properties === undefined || data.properties.map_name === undefined) {
            return null;
        }
        let newMap = new Map(data.properties.map_name, data.width, data.height);
        if (data.properties.start_pos !== undefined && data.properties.start_pos.includes(',')) {
            let data = data.properties.start_pos.split(',');
            newMap.startPos.x = data[0];
            newMap.startPos.y = data[1];
        }
        for (let idx = 0; idx < data.layers.length; idx++) {
            let layer = data.layers[idx];
            if (layer.type == 'tilelayer') {
                newMap.layers[layer.name.toLowerCase()] = layer.data;
            } else if (layer.type == 'objectgroup') {
                for (var t = 0; t < layer.objects.length; t++) {
                    let tObj = layer.objects[t];
                    let tW = tObj.height / game.tileSize;
                    let tH = tObj.width / game.tileSize;
                    let tX = tObj.x / game.tileSize;
                    let tY = tObj.y / game.tileSize;
                    let tCallbackStr = `game.handleTrigger('${tObj.name}')`;

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
    
    constructor(name='Map', width=1, height=1) {
        this.name = name;
        this.width = width;
        this.height = height;
        this.startPos = { x: -1, y: -1 };

        this.layers = {
            base: [],
            fringe: [],
            object: []
        };

        this.triggers = [];
    }
}