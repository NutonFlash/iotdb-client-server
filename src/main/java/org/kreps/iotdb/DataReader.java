package org.kreps.iotdb;

import org.apache.iotdb.session.pool.SessionPool;
import org.apache.iotdb.tsfile.read.common.RowRecord;
import org.apache.iotdb.rpc.IoTDBConnectionException;
import org.apache.iotdb.rpc.StatementExecutionException;
import org.apache.iotdb.isession.pool.SessionDataSetWrapper;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

import java.util.*;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

public class DataReader {

    private final SessionPool sessionPool;
    private final ExecutorService executorService;
    private final AtomicLong totalReadingTime = new AtomicLong(0);
    private final AtomicLong totalReadPoints = new AtomicLong(0);
    private final BlockingQueue<DataBatch> dataQueue;

    private final int READING_BATCH_SIZE = 1000000;
    private final int WRITING_BATCH_SIZE = 100000;

    private final List<DataPoint> buffer = new ArrayList<>();

    public DataReader(SessionPool sessionPool, int numThreads, BlockingQueue<DataBatch> dataQueue) {
        this.sessionPool = sessionPool;
        this.executorService = Executors.newFixedThreadPool(numThreads);
        this.dataQueue = dataQueue;
    }

    private long parseDate(String dateString) {
        try {
            ZonedDateTime zonedDateTime = ZonedDateTime.parse(dateString, DateTimeFormatter.ISO_DATE_TIME);
            return Date.from(zonedDateTime.toInstant()).getTime();
        } catch (DateTimeParseException e) {
            Logger.logError("DataReader", "Failed to parse date: " + e.getMessage());
            throw new RuntimeException(e);
        }
    }

    public void startReading(String measurement, String startDateStr, String endDateStr) {
        long startReadingTime = System.currentTimeMillis();

        long startDate = parseDate(startDateStr);
        long endDate = parseDate(endDateStr);

        List<Future<?>> futures = new ArrayList<>();

        long period = endDate - startDate;
        long batchDuration = READING_BATCH_SIZE * 1000L;
        long batchCount = (period + batchDuration - 1) / batchDuration;
        for (int i = 0; i < batchCount; i++) {
            final long batchStart = startDate + i * batchDuration;
            final long batchEnd = Math.min(batchStart + batchDuration - 1, endDate);
            final int threadIndex = i + 1;
            futures.add(executorService.submit(() -> {
                try {
                    long pointsRead = readData(measurement, batchStart, batchEnd, threadIndex);
                    Logger.logInfo(String.valueOf(threadIndex),
                            "Read " + pointsRead + " points for measurement: " + measurement);
                } catch (IoTDBConnectionException | StatementExecutionException | InterruptedException e) {
                    Logger.logError(String.valueOf(threadIndex),
                            "Error reading data for measurement " + measurement + ": " + e.getMessage());
                }
            }));
        }

        Logger.logInfo("DataReader", "All tasks submitted.");
        executorService.shutdown();

        try {
            for (Future<?> future : futures) {
                future.get();
            }
            Logger.logInfo("DataReader", "Awaiting termination.");
            if (!executorService.awaitTermination(1, TimeUnit.HOURS)) {
                executorService.shutdownNow();
                if (!executorService.awaitTermination(1, TimeUnit.MINUTES)) {
                    Logger.logError("DataReader", "ExecutorService did not terminate");
                }
            }
        } catch (InterruptedException | ExecutionException e) {
            Logger.logError("DataReader", e.getMessage());
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }

        if (!buffer.isEmpty()) {
            try {
                flushBufferToQueue();
            } catch (InterruptedException e) {
                System.out.println(e.getMessage());
            }
        }

        long endReadingTime = System.currentTimeMillis();
        long totalTime = endReadingTime - startReadingTime;

        Logger.logInfo("DataReader", "Total reading time: " + totalTime + " ms");
        Logger.logInfo("DataReader",
                "Average reading time per point: " + (totalReadingTime.get() / (double) totalReadPoints.get()) + " ms");
    }

    private long readData(String measurement, long start, long end, int threadIndex)
            throws IoTDBConnectionException, StatementExecutionException, InterruptedException {
        long startTime = System.currentTimeMillis();
        String sql = String.format("SELECT %s FROM root.kreps.djn01 WHERE time >= %d AND time <= %d", measurement,
                start, end);

        SessionDataSetWrapper dataSet = sessionPool.executeQueryStatement(sql);

        long pointCount = 0;

        while (dataSet.hasNext()) {
            RowRecord point = dataSet.next();
            long timestamp = point.getTimestamp();
            float value = point.getFields().get(0).getFloatV();
            addToBuffer(new DataPoint(measurement, timestamp, value));
            pointCount++;
        }

        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;

        totalReadingTime.addAndGet(duration);
        totalReadPoints.addAndGet(pointCount);

        return pointCount;
    }

    private synchronized void addToBuffer(DataPoint dataPoint) throws InterruptedException {
        buffer.add(dataPoint);

        if (buffer.size() >= WRITING_BATCH_SIZE) {
            flushBufferToQueue();
        }
    }

    private void flushBufferToQueue() throws InterruptedException {
        Map<String, List<Long>> measurementTimestamps = new HashMap<>();
        Map<String, List<Float>> measurementValues = new HashMap<>();

        for (DataPoint point : buffer) {
            measurementTimestamps.putIfAbsent(point.getMeasurement(), new ArrayList<>());
            measurementValues.putIfAbsent(point.getMeasurement(), new ArrayList<>());
            measurementTimestamps.get(point.getMeasurement()).add(point.getTimestamp());
            measurementValues.get(point.getMeasurement()).add(point.getValue());
        }

        for (String measurement : measurementTimestamps.keySet()) {
            List<Long> timestampsList = measurementTimestamps.get(measurement);
            List<Float> valuesList = measurementValues.get(measurement);

            long[] timestamps = timestampsList.stream().mapToLong(Long::longValue).toArray();
            float[] values = new float[valuesList.size()];
            for (int i = 0; i < valuesList.size(); i++) {
                values[i] = valuesList.get(i);
            }

            DataBatch dataBatch = new DataBatch(measurement, timestamps, values);
            dataQueue.put(dataBatch);
        }

        buffer.clear();
    }
}
