class Player {
    static get StatNames() {
        const statNames = ['Strength', 'Const', 'Luck', 'Sexiness'];
        return statNames;
    }
    
    constructor(name='Fox', gender='male') {
        this.name = name;
        this.gender = gender;

        this.image = new createjs.Bitmap(`art/spritefox-male.png`);

        this.x = 0;
        this.y = 0;
    }
}