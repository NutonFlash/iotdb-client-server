/**
 * Class to read bits from an array of Numbers (simulating 64-bit values).
 */
class LongArrayInput {
    constructor(array) {
        this.longArray = array;
        this.lB = 0;
        this.position = 0;
        this.bitsLeft = 0;
        this.flipByte();
    }

    readBit() {
        const bit = (this.lB & (1n << BigInt(this.bitsLeft - 1))) !== 0n;
        this.bitsLeft--;
        this.checkAndFlipByte();
        return bit;
    }

    flipByte() {
        this.lB = BigInt(this.longArray[this.position++]);
        this.bitsLeft = 64;
    }

    checkAndFlipByte() {
        if (this.bitsLeft === 0) {
            this.flipByte();
        }
    }

    getLong(bits) {
        let value;
        if (bits <= this.bitsLeft) {
            value = (this.lB >> BigInt(this.bitsLeft - bits)) & ((1n << BigInt(bits)) - 1n);
            this.bitsLeft -= bits;
            this.checkAndFlipByte();
        } else {
            value = this.lB & ((1n << BigInt(this.bitsLeft)) - 1n);
            bits -= this.bitsLeft;
            this.flipByte();
            value = (value << BigInt(bits)) | (this.lB >> BigInt(64 - bits));
            this.bitsLeft -= bits;
        }
        return Number(value);
    }

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

    static uint8ArrayToLongArr(byteArray) {
        if (byteArray.length % 8 !== 0) {
            throw new Error("The byte array length must be a multiple of 8");
        }
    
        const longArray = [];
        for (let i = 0; i < byteArray.length; i += 8) {
            let value = 0n;
            for (let j = 0; j < 8; j++) {
                value = (value << 8n) | BigInt(byteArray[i + j] & 0xFF);
            }
            longArray.push(Number(value));
        }
        return longArray;
    }
}


export default LongArrayInput;
