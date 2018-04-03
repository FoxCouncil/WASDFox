class Agent {
    static GenId() {
        if (Agent.Id == null) Agent.Id = 0;
        return Agent.Id++;
    }

    static Deserialize(data) {
        let newEnemy = new Agent(data.name, data.tile);
        newEnemy.pos = data.pos;
        return newEnemy;
    }

    constructor(name='Scary Dave', tile='skeleton', friendly=false, agro=true, agroDistanceMax=5) {
        this.id = Agent.GenId();
        this.name = name;
        this.tile = tile;
        this.friendly = friendly;
        this.agro = agro;
        this.agroDistanceMax = agroDistanceMax;
        this.pos = { x: -1, y: -1 };
    }

    tick(game, mapData) {
        let distanceToPlayer = Math.floor(Math.hypot(mapData.playerPos.x - this.pos.x, mapData.playerPos.y - this.pos.y));
        if (distanceToPlayer == 1) {
            // 'Attack' the player
        } else if (distanceToPlayer > 1 && distanceToPlayer < 5) {
            // Move 'towards' player
            let distractRoll = Utils.RandomNumber(1, 2);
            if (distractRoll == 1) {
                if (mapData.playerPos.x > this.pos.x) {
                    this.pos.x += 1;
                } else if (mapData.playerPos.x < this.pos.x) {
                    this.pos.x -= 1;
                } else if (mapData.playerPos.y > this.pos.y) {
                    this.pos.y += 1;
                } else if (mapData.playerPos.y < this.pos.y) {
                    this.pos.y -= 1;
                }
            }
        } else {
            // Move 'Randomly'    
            let moveRoll = Utils.RandomNumber(1, 4);
            let directionRoll = Utils.RandomNumber(-1, 1);      

            if (moveRoll == 2) {
                const xChange = this.pos.x + directionRoll;
                if (xChange >= 0 && xChange < mapData.width) {
                    this.pos.x = xChange;
                }
            } else if (moveRoll == 1) {
                const yChange = this.pos.y + directionRoll;
                if (yChange >= 0 && yChange < mapData.width) {
                    this.pos.y = yChange;
                }
            }
        }

        

        console.log('Distance to player is: ' + distanceToPlayer);
    }
}