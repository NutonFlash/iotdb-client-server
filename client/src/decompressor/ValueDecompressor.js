import LastValuePredictor from './predictors/LastValuePredictor';

/**
 * Class to decompress values using Gorilla compression.
 */
class ValueDecompressor {
    /**
     * Constructor to initialize the decompressor.
     * @param {LongArrayInput} input - The input source containing compressed data.
     * @param {Predictor} [predictor=new LastValuePredictor()] - The predictor to use for decompression.
     */
    constructor(input, predictor = new LastValuePredictor()) {
        this.in = input;
        this.predictor = predictor;
        this.storedLeadingZeros = 32;
        this.storedTrailingZeros = 0;
    }

    /**
     * Reads the first value from the compressed data.
     * @returns {number} - The first decompressed value.
     */
    readFirst() {
        const value = this.in.getLong(64);
        this.predictor.update(value);
        return value;
    }

    /**
     * Reads the next value from the compressed data.
     * @returns {number} - The next decompressed value.
     */
    nextValue() {
        const val = this.in.nextClearBit(2);

        switch (val) {
            case 3:
                // Read new leading and trailing zeros
                this.storedLeadingZeros = this.in.getLong(6);
                let significantBits = this.in.getLong(6);
                significantBits++;

                this.storedTrailingZeros = 64 - significantBits - this.storedLeadingZeros;

            case 2:
                // Read the significant bits of the value
                let value = this.in.getLong(64 - this.storedLeadingZeros - this.storedTrailingZeros);
                value = value << this.storedTrailingZeros;

                // XOR with the predicted value to get the actual value
                value = this.predictor.predict() ^ value;
                this.predictor.update(value);
                return value;
        }
        return this.predictor.predict();
    }
}

export default ValueDecompressor;
