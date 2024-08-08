import Long from 'long';

const MASK_ARRAY = [];
const BIT_SET_MASK = [];

let mask = Long.ONE;
let value = Long.ZERO;

for (let i = 0; i < 64; i++) {
    value = value.or(mask);
    MASK_ARRAY[i] = value;
    mask = mask.shiftLeft(1);
}

for (let i = 0; i < 64; i++) {
    BIT_SET_MASK[i] = Long.ONE.shiftLeft(i);
}

class LongArrayInput {
    constructor(array) {
        this.longArray = array;
        this.position = 0;
        this.bitsLeft = 0;
        this.flipByte();
    }

    readBit() {
        const bit = this.lB.and(BIT_SET_MASK[this.bitsLeft - 1]).notEquals(Long.ZERO);
        this.bitsLeft--;
        this.checkAndFlipByte();
        return bit;
    }

    flipByte() {
      if (this.position < this.longArray.length) {
        this.lB = this.longArray[this.position++];
        this.bitsLeft = 64;
      } else {
        this.lB = undefined;
      }
    }

    checkAndFlipByte() {
        if (this.bitsLeft === 0) {
            this.flipByte();
        }
    }

    getLong(bits) {
        let value;
        if (bits <= this.bitsLeft) {
            value = this.lB.shiftRight(this.bitsLeft - bits).and(MASK_ARRAY[bits - 1]);
            this.bitsLeft -= bits;
            this.checkAndFlipByte();
        } else {
            value = this.lB.and(MASK_ARRAY[this.bitsLeft - 1]);
            bits -= this.bitsLeft;
            this.flipByte();
            value = value.shiftLeft(bits).or(this.lB.shiftRightUnsigned(this.bitsLeft - bits));
            this.bitsLeft -= bits;
        }
        return value;
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

    static uint8ArrToLongArr(byteArray) {
        if (byteArray.length % 8 !== 0) {
            throw new Error("The byte array length must be a multiple of 8");
        }

        const longArray = [];
        for (let i = 0; i < byteArray.length; i += 8) {
            let high = 0;
            let low = 0;
            for (let j = 0; j < 4; j++) {
                high = (high << 8) | (byteArray[i + j] & 0xFF);
            }
            for (let j = 4; j < 8; j++) {
                low = (low << 8) | (byteArray[i + j] & 0xFF);
            }
            longArray.push(new Long(low, high));
        }
        return longArray;
    }
}

export default LongArrayInput;