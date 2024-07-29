package org.kreps.iotdb;

import org.json.JSONArray;
import org.json.JSONObject;

public class DataBatch {
    private final String measurement;
    private final long[] timestamps;
    private final float[] values;

    public DataBatch(String measurement, long[] timestamps, float[] values) {
        this.measurement = measurement;
        this.timestamps = timestamps;
        this.values = values;
    }

    public String getMeasurement() {
        return measurement;
    }

    public long[] getTimestamps() {
        return timestamps;
    }

    public float[] getValues() {
        return values;
    }

    public int size() {
        return timestamps.length;
    }

    public String toJSON() {
        JSONObject jsonObj = new JSONObject();
        
        jsonObj.put("measurement", measurement);
        jsonObj.put("timestamps", new JSONArray(timestamps));
        jsonObj.put("values", new JSONArray(values));
        
        return jsonObj.toString();
    }
}
