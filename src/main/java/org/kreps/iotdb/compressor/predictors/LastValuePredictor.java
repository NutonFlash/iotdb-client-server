package org.kreps.iotdb.compressor.predictors;

import org.kreps.iotdb.compressor.Predictor;

public class LastValuePredictor implements Predictor {
    private long storedVal = 0;

    public LastValuePredictor() {}

    public void update(long value) {
        this.storedVal = value;
    }

    public long predict() {
        return storedVal;
    }
}
