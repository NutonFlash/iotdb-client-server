import LastValuePredictor from './predictors/LastValuePredictor';
import ValueDecompressor from './ValueDecompressor'

class GorillaDecompressor {
    constructor(input, predictor = new LastValuePredictor()) {
        this.in = input;
        this.decompressor = new ValueDecompressor(input, predictor);
        this.storedTimestamp = 0;
        this.storedDelta = 0;
        this.blockTimestamp = 0;
        this.storedVal = 0;
        this.endOfStream = false;
        this.readHeader();
    }

    readHeader() {
        this.blockTimestamp = this.in.getLong(64);
        console.log('Header read, blockTimestamp:', this.blockTimestamp);
    }

    readPair() {
        this.next();
        if (this.endOfStream) {
            return null;
        }
        console.log('Read pair:', { timestamp: this.storedTimestamp, value: this.storedVal });
        return { timestamp: this.storedTimestamp, value: this.storedVal };
    }

    next() {
        if (this.storedTimestamp === 0) {
            this.first();
        } else {
            this.nextTimestamp();
        }
    }

    first() {
        this.storedDelta = this.in.getLong(27);
        if (this.storedDelta === (1 << 27) - 1) {
            this.endOfStream = true;
            return;
        }
        this.storedVal = this.decompressor.readFirst();
        this.storedTimestamp = this.blockTimestamp + this.storedDelta;
    }

    nextTimestamp() {
        const readInstruction = this.in.nextClearBit(4);
        let deltaDelta;

        switch (readInstruction) {
            case 0x00:
                this.storedTimestamp += this.storedDelta;
                this.storedVal = this.decompressor.nextValue();
                return;
            case 0x02:
                deltaDelta = this.in.getLong(7);
                break;
            case 0x06:
                deltaDelta = this.in.getLong(9);
                break;
            case 0x0E:
                deltaDelta = this.in.getLong(12);
                break;
            case 0x0F:
                deltaDelta = this.in.getLong(32);
                if (deltaDelta === 0xFFFFFFFF) {
                    this.endOfStream = true;
                    return;
                }
                break;
            default:
                return;
        }

        deltaDelta++;
        deltaDelta = GorillaDecompressor.decodeZigZag32(deltaDelta);
        this.storedDelta += deltaDelta;
        this.storedTimestamp += this.storedDelta;
        this.storedVal = this.decompressor.nextValue();
    }

    static decodeZigZag32(n) {
        return (n >>> 1) ^ -(n & 1);
    }
}


export default GorillaDecompressor;
