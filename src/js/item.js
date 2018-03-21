class Item {
    static ParseJson(data) {
        if (typeof(data) !== 'object' || data.name === undefined || data.name == "" || data.id === undefined) {
            return null;
        }

        let newItem = new Item(data.name, parseInt(data.id));
        
        delete data.name;
        delete data.id;

        newItem = Object.assign(newItem, data);

        return newItem;
    }
    
    constructor(name='Item', id=-1) {
        this.name = name;
        this.id = id;
    }
}