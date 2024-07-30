class DifferentialFCM {
    /**
     * Constructs a DifferentialFCM instance.
     * @param {number} size - The size of the prediction table, must be positive.
     */
    constructor(size) {
        if (size <= 0) {
            throw new Error("Size must be positive");
        }

        size--;
        const leadingZeros = Math.clz32(size);
        const newSize = 1 << (32 - leadingZeros);

        this.table = Array(newSize).fill(0);
        this.mask = newSize - 1;
        this.lastValue = 0;
        this.lastHash = 0;
    }

    /**
     * Updates the predictor with a new value.
     * @param {number} value - The new value to update.
     */
    update(value) {
        const diff = value - this.lastValue;
        this.table[this.lastHash] = diff;
        this.lastHash = ((this.lastHash << 5) ^ (diff >>> 50)) & this.mask;
        this.lastValue = value;
    }

    /**
     * Predicts the next value.
     * @returns {number} - The predicted next value.
     */
    predict() {
        return this.table[this.lastHash] + this.lastValue;
    }
}

export default DifferentialFCM;
