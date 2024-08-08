import Long from 'long';

class LastValuePredictor {
    constructor() {
        this.storedVal = Long.ZERO;
    }

    update(value) {
        this.storedVal = value;
    }

    predict() {
        return this.storedVal;
    }
}   

export default LastValuePredictor;