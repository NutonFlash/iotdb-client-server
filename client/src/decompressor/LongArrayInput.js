/**
 * Class to read bits from an array of Numbers (simulating 64-bit values).
 */
class LongArrayInput {
    /**
     * Constructs a LongArrayInput instance.
     * @param {number[]} array - Array of numbers to read from.
     */
    constructor(array) {
        this.longArray = array; // Array of numbers
        this.lB = 0; // Current long being read
        this.position = 0; // Position in the array
        this.bitsLeft = 0; // Bits left to read in the current long
        this.flipByte(); // Initialize the first long
    }

    /**
     * Reads a single bit from the current long.
     * @returns {boolean} - The bit read (true or false).
     */
    readBit() {
        const bit = (this.lB & (1 << (this.bitsLeft - 1))) !== 0;
        this.bitsLeft--;
        this.checkAndFlipByte();
        return bit;
    }

    /**
     * Moves to the next long in the array and resets bitsLeft.
     */
    flipByte() {
        this.lB = this.longArray[this.position++];
        this.bitsLeft = 64;
    }

    /**
     * Checks if all bits are read from the current long and flips to the next if needed.
     */
    checkAndFlipByte() {
        if (this.bitsLeft === 0) {
            this.flipByte();
        }
    }

    /**
     * Reads a specified number of bits from the array.
     * @param {number} bits - Number of bits to read.
     * @returns {number} - The value read.
     */
    getLong(bits) {
        let value;
        if (bits <= this.bitsLeft) {
            value = (this.lB >>> (this.bitsLeft - bits)) & ((1 << bits) - 1);
            this.bitsLeft -= bits;
            this.checkAndFlipByte();
        } else {
            value = this.lB & ((1 << this.bitsLeft) - 1);
            bits -= this.bitsLeft;
            this.flipByte();
            value = (value << bits) | (this.lB >>> (64 - bits));
            this.bitsLeft -= bits;
        }
        return value;
    }

    /**
     * Finds the next clear bit up to a maximum number of bits.
     * @param {number} maxBits - Maximum number of bits to search.
     * @returns {number} - The position of the next clear bit.
     */
    nextClearBit(maxBits) {
        let val = 0x00;
        for (let i = 0; i < maxBits; i++) {
            val <<= 1;
            const bit = this.readBit();
            if (bit) {
                val |= 0x01;
            } else {
                break;
            }
        }
        return val;
    }

    /**
     * Converts a Uint8Array to an array of Numbers representing the long values.
     * @param {Uint8Array} byteArray - The input byte array.
     * @returns {number[]} - The output array of long values.
     */
    static uint8ArrayToLongArray(byteArray) {
        const longArray = [];
        for (let i = 0; i < byteArray.length; i += 8) {
            const part1 = (byteArray[i] << 24) | (byteArray[i + 1] << 16) | (byteArray[i + 2] << 8) | byteArray[i + 3];
            const part2 = (byteArray[i + 4] << 24) | (byteArray[i + 5] << 16) | (byteArray[i + 6] << 8) | byteArray[i + 7];
            const longValue = (BigInt(part1) << 32n) | BigInt(part2); // Use BigInt for precise 64-bit integer operations
            longArray.push(Number(longValue)); // Convert BigInt to Number
        }
        return longArray;
    }
}

export default LongArrayInput;
