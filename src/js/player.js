class Player {
    static get Stats() {
        const statNames = ['Strength', 'Constitution', 'Luck', 'Sexiness'];
        return statNames;
    }
    
    constructor(name='Fox', gender='male') {
        this.name = name;
        this.gender = gender;

        this.image = new createjs.Bitmap(`art/spritefox-male.png`);

        this.x = 0;
        this.y = 0;

        this.level = 1;
        this.stats = {};
        this.statsTotalPoints = 6 * Player.Stats.length;

        for (var i = 0; i < Player.Stats.length; i++) {
            this.stats[Player.Stats[i].toLowerCase()] = 5;            
        }

        this.health = this.stats.constitution * 2;
        this.magic = (this.stats.luck + this.stats.sexiness) / 5;
    }


    get statPointsUsed() {
        let acc = 0;
        for (let k in this.stats) { acc += this.stats[k]; }
        return acc;
    }

    get statPointsTotal() {
        return this.statsTotalPoints;
    }

    get statPointsRemaining () {
        return this.statPointsTotal - this.statPointsUsed;
    }

    get totalHealth() {
        return (this.stats.constitution * 2) * this.level;
    }

    get totalMagic() {
        return ((this.stats.luck + this.stats.sexiness) / 5) * this.level;
    }

    setStat(name, direction=true) {
        if (this.stats[name] === undefined || (direction && this.statPointsRemaining === 0) || (!direction && this.stats[name] === 0)) {
            return false;
        }
        if (direction) { this.stats[name]++; } else { this.stats[name]--; }
        return true;
    }
}