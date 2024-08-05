import LastValuePredictor from './predictors/LastValuePredictor';

/**
 * Class to decompress values using Gorilla compression.
 */
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
        console.log('Read first value:', value);
        return value;
    }

    nextValue() {
        const val = this.in.nextClearBit(2);

        switch (val) {
            case 3:
                // New leading and trailing zeros
                this.storedLeadingZeros = Number(this.in.getLong(6));
                let significantBits = Number(this.in.getLong(6));
                significantBits++;
                this.storedTrailingZeros = 64 - significantBits - this.storedLeadingZeros;
                // No break here, fall through to case 2
            case 2:
                // Read the significant bits of the value
                let value = BigInt(this.in.getLong(64 - this.storedLeadingZeros - this.storedTrailingZeros));
                value = value << BigInt(this.storedTrailingZeros);
    
                // XOR with the predicted value to get the actual value
                value = BigInt(this.predictor.predict()) ^ value;
                this.predictor.update(Number(value));
                console.log('Read next value:', value);
                return Number(value);
        }
        return this.predictor.predict();
    }
}


export default ValueDecompressor;
