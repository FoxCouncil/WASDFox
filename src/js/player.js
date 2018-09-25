class Player {
    static get Stats() {
        const statNames = ['Strength', 'Constitution', 'Luck', 'Sexiness'];
        return statNames;
    }

    static Load(userObj) {
        let loadingPlayer = new Player();
        return Object.assign(loadingPlayer, userObj);
    }

    constructor(name='Fox', gender='male') {
        this.name = name;
        this.gender = gender;

        this.level = 1;
        this.stats = {};
        this.statsTotalPoints = 6 * Player.Stats.length;

        for (var i = 0; i < Player.Stats.length; i++) {
            this.stats[Player.Stats[i].toLowerCase()] = 5;
        }

        this.health = this.stats.constitution * 2;
        this.magic = (this.stats.luck + this.stats.sexiness) / 5;

        this.money = 0;
        this.ledger = [];
        this.inventory = {};
    }

    get statPointsUsed() {
        let acc = 0;
        for (let k in this.stats) { acc += this.stats[k]; }
        return acc;
    }

    get statPointsTotal() {
        return this.statsTotalPoints;
    }

    get statPointsRemaining() {
        return this.statPointsTotal - this.statPointsUsed;
    }

    get totalHealth() {
        return (this.stats.constitution * 2) * this.level;
    }

    get totalMagic() {
        return ((this.stats.luck + this.stats.sexiness) / 5) * this.level;
    }

    get totalMoney() {
        return (this.money / 100).toFixed(2);
    }

    get inventoryGet() {
        return JSON.parse(JSON.stringify(this.inventory));
    }

    inventoryAddItem(item, qty=1) {
        if (this.inventory[item.id] === undefined) {
            this.inventory[item.id] = qty;
        } else {
            this.inventory[item.id] += qty;
        }
    }

    inventoryRemoveItem(item, qty=1) {
        if (this.inventory[item.id] === undefined || this.inventory[item.id] < qty) {
            return false;
        } else if (this.inventory[item.id] === qty) {
            delete this.inventory[item.id];
        } else {
            this.inventory[item.id] -= qty;
        }
        return true;
    }

    setStat(name, direction=true) {
        if (this.stats[name] === undefined || (direction && this.statPointsRemaining === 0) || (!direction && this.stats[name] === 0)) {
            return false;
        }
        if (direction) { this.stats[name]++; } else { this.stats[name]--; }
        return true;
    }

    moneyDebit(amount, reason='Oh no, taxes!') {
        if (amount > this.money) {
            return false;
        }

        this.ledger.push({ type: 0, amount: amount, reason: reason, balance:this.money});
        this.money -= amount;

        return true;
    }

    moneyCredit(amount, reason='Woot, free money') {
        this.ledger.push({ type: 1, amount: amount, reason: reason, balance:this.money});
        this.money += amount;
        return this.money;
    }
}