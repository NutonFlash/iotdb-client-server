class ValueDecompressor {
    constructor(input, predictor = new LastValuePredictor()) {
        this.in = input;
        this.predictor = predictor;
        this.storedLeadingZeros = Number.MAX_SAFE_INTEGER;
        this.storedTrailingZeros = 0;
    }

    readFirst() {
        const value = this.in.getLong(64);
        this.predictor.update(value);
        return value;
    }

    nextValue() {
        const val = this.in.nextClearBit(2);
        switch (val) {
            case 3:
                this.storedLeadingZeros = this.in.getLong(6).toInt();
                let significantBits = this.in.getLong(6).toInt() + 1;
                this.storedTrailingZeros = 64 - significantBits - this.storedLeadingZeros;
            case 2:
                let value = this.in.getLong(64 - this.storedLeadingZeros - this.storedTrailingZeros);
                const check1 = value.toString();
                value = value.shiftLeft(this.storedTrailingZeros);
                value = this.predictor.predict().xor(value);
                const check2 = value.toString();
                this.predictor.update(value);
                return value;
        }
        return this.predictor.predict();
    }
}

export default ValueDecompressor;