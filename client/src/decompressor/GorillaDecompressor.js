import Long from "long";
import LastValuePredictor from "./LastValuePredictor";
import ValueDecompressor from "./ValueDecompressor";

class GorillaDecompressor {
  constructor(input, predictor = new LastValuePredictor()) {
    this.in = input;
    this.readHeader();
    this.decompressor = new ValueDecompressor(input, predictor);
    this.storedTimestamp = Long.ZERO;
    this.storedDelta = Long.ZERO;
    this.endOfStream = false;
  }

  readHeader() {
    this.blockTimestamp = this.in.getLong(64);
  }

  readPair() {
    this.next();
    if (this.endOfStream) {
      return null;
    }
    const valueDouble = GorillaDecompressor.longBitsToDouble(this.storedVal);
    return {
      timestamp: this.storedTimestamp,
      value: valueDouble,
    };
  }

  next() {
    if (this.storedTimestamp.equals(Long.ZERO)) {
      this.first();
      return;
    }
    this.nextTimestamp();
  }

  first() {
    this.storedDelta = this.in.getLong(27);
    if (this.storedDelta.equals(Long.fromBits(0x07ffffff, 0))) {
      this.endOfStream = true;
      return;
    }
    this.storedVal = this.decompressor.readFirst();
    this.storedTimestamp = this.blockTimestamp.add(this.storedDelta);
  }

  nextTimestamp() {
    const readInstruction = this.in.nextClearBit(4);
    let deltaDelta = Long.ZERO;

    switch (readInstruction) {
      case 0x00:
        this.storedTimestamp = this.storedDelta.add(this.storedTimestamp);
        this.storedVal = this.decompressor.nextValue();
        return;
      case 0x02:
        deltaDelta = this.in.getLong(7);
        break;
      case 0x06:
        deltaDelta = this.in.getLong(9);
        break;
      case 0x0e:
        deltaDelta = this.in.getLong(12);
        break;
      case 0x0f:
        deltaDelta = this.in.getLong(32);
        if (deltaDelta.equals(Long.fromBits(0xffffffff, 0))) {
          this.endOfStream = true;
          return;
        }
        break;
      default:
        return;
    }

    deltaDelta = deltaDelta.add(1);
    deltaDelta = this.decodeZigZag32(deltaDelta.toInt());
    this.storedDelta = this.storedDelta.add(deltaDelta);

    this.storedTimestamp = this.storedDelta.add(this.storedTimestamp);
    this.storedVal = this.decompressor.nextValue();
  }

  decodeZigZag32(n) {
    return (n >>> 1) ^ -(n & 1);
  }

  static longBitsToDouble(long) {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);

    // Set the low and high bits in the DataView
    view.setUint32(0, long.getLowBitsUnsigned(), true); // little-endian
    view.setUint32(4, long.getHighBits(), true); // little-endian

    return view.getFloat64(0, true); // little-endian
  }
}

export default GorillaDecompressor;
