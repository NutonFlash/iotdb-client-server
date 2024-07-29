package org.kreps.iotdb;

import java.util.concurrent.atomic.AtomicLong;

import org.apache.iotdb.session.pool.SessionPool;
import org.apache.iotdb.rpc.IoTDBConnectionException;
import org.apache.iotdb.rpc.StatementExecutionException;
import org.apache.iotdb.tsfile.file.metadata.enums.TSDataType;
import org.apache.iotdb.tsfile.file.metadata.enums.TSEncoding;
import org.apache.iotdb.tsfile.file.metadata.enums.CompressionType;
import org.apache.iotdb.tsfile.write.record.Tablet;
import org.apache.iotdb.tsfile.write.schema.MeasurementSchema;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class DataWriter {

    private final SessionPool sessionPool;
    private final long startDate;
    private final int batchSize;
    private final int numPoints;
    private final List<String> measurements;
    private final ExecutorService executorService;
    private final Map<String, double[]> ranges;
    private final String device = "root.kreps.djn01"; 
    private final AtomicLong totalWritingTime = new AtomicLong(0);
    private final AtomicLong totalWriteOperations = new AtomicLong(0);

    public DataWriter(SessionPool sessionPool, String startDateString, int batchSize, int numPoints, List<String> measurements, int numThreads) {
        this.sessionPool = sessionPool;
        this.startDate = parseDate(startDateString);
        this.batchSize = batchSize;
        this.numPoints = numPoints;
        this.measurements = measurements;
        this.executorService = Executors.newFixedThreadPool(numThreads);
        this.ranges = new HashMap<>();
        this.ranges.put("light", new double[]{0, 1});
        this.ranges.put("temperature", new double[]{1, 2});
        this.ranges.put("humidity", new double[]{2, 3});
        this.ranges.put("pressure", new double[]{3, 4});
        this.ranges.put("frequency", new double[]{4, 5});
    }

    private long parseDate(String startDateString) {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        try {
            return dateFormat.parse(startDateString).getTime();
        } catch (ParseException e) {
            Logger.logError("DataWriter", "Failed to parse start date: " + e.getMessage());
            throw new RuntimeException(e);
        }
    }

    public void startWriting() {
        long startWritingTime = System.currentTimeMillis();

        List<Runnable> tasks = new ArrayList<>();
        for (String measurement : measurements) {
            for (int i = 0; i < numPoints; i += batchSize) {
                int threadIndex = i / batchSize + 1;
                int start = i;
                int end = Math.min(i + batchSize, numPoints);
                tasks.add(() -> {
                    try {
                        if (start != 0 && start % 1000000 == 0) {
                            Logger.logInfo(String.valueOf(threadIndex), "Wrote 1000000 points for measurement: " + measurement);
                        }
                        
                        writeData(measurement, start, end, threadIndex);
                    } catch (IoTDBConnectionException | StatementExecutionException e) {
                        Logger.logError(String.valueOf(threadIndex), "Error writing data for measurement " + measurement + ": " + e.getMessage());
                    }
                });
            }
        }

        tasks.forEach(executorService::submit);
        Logger.logInfo("DataWriter", "All tasks submitted.");
        executorService.shutdown();
        try {
            Logger.logInfo("DataWriter", "Awaiting termination.");
            if (!executorService.awaitTermination(1, TimeUnit.HOURS)) {
                executorService.shutdownNow();
                if (!executorService.awaitTermination(1, TimeUnit.MINUTES)) {
                    Logger.logError("DataWriter", "ExecutorService did not terminate");
                }
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }

        long endWritingTime = System.currentTimeMillis();
        long totalTime = endWritingTime - startWritingTime;

        Logger.logInfo("DataWriter", "Total writing time: " + totalTime + " ms");
        Logger.logInfo("DataWriter", "Average writing time per point: " + (totalWritingTime.get() / (double) numPoints) + " ms");
    }

    private void writeData(String measurement, int start, int end, int threadIndex) throws IoTDBConnectionException, StatementExecutionException {
        long timestamp = startDate + start * 1000L;

        List<Long> timestamps = new ArrayList<>();
        List<Object> values = new ArrayList<>();

        for (int i = start; i < end; i++) {
            timestamps.add(timestamp);
            values.add(generateMockValue(measurement));
            timestamp += 1000L; // Increment by 1 second
        }

        writeBatch(measurement, timestamps, values, threadIndex);
    }

    private void writeBatch(String measurement, List<Long> timestamps, List<Object> values, int threadIndex) throws IoTDBConnectionException, StatementExecutionException {
        try {
            List<MeasurementSchema> schemaList = Collections.singletonList(new MeasurementSchema(measurement, TSDataType.FLOAT, TSEncoding.RLE, CompressionType.SNAPPY));

            long[] timeArray = new long[timestamps.size()];
            for (int i = 0; i < timestamps.size(); i++) {
                timeArray[i] = timestamps.get(i);
            }

            float[] valueArray = new float[values.size()];
            for (int i = 0; i < values.size(); i++) {
                valueArray[i] = (Float) values.get(i);
            }

            Tablet tablet = new Tablet(device, schemaList, batchSize);
            System.arraycopy(timeArray, 0, tablet.timestamps, 0, timeArray.length);
            System.arraycopy(valueArray, 0, ((float[]) tablet.values[0]), 0, valueArray.length);
            tablet.rowSize = timeArray.length;

            long startTime = System.currentTimeMillis();

            sessionPool.insertTablet(tablet);

            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;

            totalWritingTime.addAndGet(duration);
            totalWriteOperations.incrementAndGet();
        } catch (Exception e) {
            Logger.logError(String.valueOf(threadIndex), "Error in writeBatch for measurement " + measurement + ": " + e.getMessage());
            throw e;
        }
    }

    private float generateMockValue(String measurement) {
        double[] range = ranges.get(measurement);
        return (float) (range[0] + Math.random() * (range[1] - range[0]));
    }
}
