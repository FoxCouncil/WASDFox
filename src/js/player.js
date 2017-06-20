class Player {
    static get StatNames() {
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

        for (var idx = 0; idx < Player.StatNames.length; idx++) {
            this.stats[Player.StatNames[idx].toLowerCase()] = 5;            
        }

        this.health = this.stats.constitution * 2;
        this.magic = (this.stats.luck + this.stats.sexiness) / 5;
    }

    get totalHealth() {
        return (this.stats.constitution * 2) * this.level;
    }

    get totalMagic() {
        return ((this.stats.luck + this.stats.sexiness) / 5) * this.level;
    }
}