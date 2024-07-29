package org.kreps.iotdb;

public class DataPoint {
    private final String measurement;
    private final long timestamp;
    private final float value;

    public DataPoint(String measurement, long timestamp, float value) {
        this.measurement = measurement;
        this.timestamp = timestamp;
        this.value = value;
    }

    public String getMeasurement() {
        return measurement;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public float getValue() {
        return value;
    }
}