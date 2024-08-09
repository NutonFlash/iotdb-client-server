package org.kreps.iotdb.compressor;

public interface Predictor {

    /**
     * Give the real value
     *
     * @param value Long / bits of Double
     */
    void update(long value);

    /**
     * Predicts the next value
     *
     * @return Predicted value
     */
    long predict();
}
