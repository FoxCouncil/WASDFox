const STATE_UNINITIALIZED = Symbol('STATE_UNINITIALIZED');
const STATE_NEWGAME = Symbol('STATE_NEWGAME');
const STATE_PLAY = Symbol('STATE_PLAY');
const STATE_INVENTORY = Symbol('STATE_INVENTORY');
const STATE_LOADINGMAP = Symbol('STATE_LOADINGMAP');
const STATE_SHOWINGMAP = Symbol('STATE_SHOWINGMAP');

const VIEW_GUI_TAGNAME = 'gui';
const VIEW_CANVAS_TAGNAME = 'gs';
const VIEW_DEBUG_TAGNAME = 'debug';

function noop(){};

Node.prototype.empty = function() {
    while(this.hasChildNodes()) {
        this.removeChild(this.lastChild);
    }
};

Object.prototype[Symbol.iterator] = function*() {
    for(let key of Object.keys(this)) {
        yield( [ key, this[key] ] );
    }
};

class Utils {
    static RandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static ShuffleArray(array) {
        let currentIndex = array.length, temporaryValue, randomIndex;
        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    }
}