class LastValuePredictor {
    constructor() {
        this.storedVal = 0;
    }

    update(value) {
        this.storedVal = value;
    }

    predict() {
        return this.storedVal;
    }
}

export default LastValuePredictor;
