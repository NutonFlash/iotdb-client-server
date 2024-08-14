package org.kreps.iotdb;

import org.apache.iotdb.session.pool.SessionPool;
import org.apache.iotdb.tsfile.read.common.RowRecord;
import org.apache.iotdb.rpc.IoTDBConnectionException;
import org.apache.iotdb.rpc.StatementExecutionException;
import org.apache.iotdb.isession.pool.SessionDataSetWrapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

import java.util.*;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicLong;

import org.kreps.iotdb.compressor.LongArrayOutput;
import org.kreps.iotdb.compressor.GorillaCompressor;
import org.kreps.iotdb.protos.DataResponse;

import com.github.luben.zstd.Zstd;
import com.google.protobuf.ByteString;

public class DataReader {

    private final SessionPool sessionPool;
    private final ExecutorService executorService;
    private final AtomicLong totalReadingTime = new AtomicLong(0); // Tracks total reading time across all threads
    private final AtomicLong totalReadPoints = new AtomicLong(0); // Tracks total number of points read across all threads

    public DataReader(SessionPool sessionPool, int numThreads) {
        this.sessionPool = sessionPool;
        this.executorService = Executors.newFixedThreadPool(numThreads); // Fixed thread pool for concurrent reading
    }

    public void startReading(String measurement, String interval, String startDateStr, String endDateStr,
            BlockingQueue<DataResponse> dataQueue, int threadCount) {
        long startReadingTime = System.currentTimeMillis();

        long startDate = parseDate(startDateStr);
        long endDate = parseDate(endDateStr);

        // Split the data range into segments based on threadCount
        long segmentSize = (endDate - startDate) / threadCount;

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            final long batchStart = startDate + i * segmentSize;
            final long batchEnd = (i == threadCount - 1) ? endDate : (batchStart + segmentSize - 1); // Ensure the last segment ends at `endDate`
            final int threadIndex = i + 1;

            futures.add(executorService.submit(() -> {
                try {
                    long pointsRead = readData(measurement, interval, batchStart, batchEnd, dataQueue, threadIndex);
                    Logger.logInfo(String.valueOf(threadIndex),
                            "Read " + pointsRead + " points for measurement: " + measurement);
                } catch (IoTDBConnectionException | StatementExecutionException | InterruptedException e) {
                    Logger.logError(String.valueOf(threadIndex),
                            "Error reading data for measurement " + measurement + ": " + e.getMessage());
                }
            }));
        }

        Logger.logInfo("DataReader", "All tasks submitted.");

        try {
            for (Future<?> future : futures) {
                future.get(); // Wait for all reading tasks to complete
            }
        } catch (InterruptedException | ExecutionException e) {
            Logger.logError("DataReader", "Task execution failed: " + e.getMessage());
            Thread.currentThread().interrupt(); // Preserve interrupt status
        }

        long endReadingTime = System.currentTimeMillis();
        long totalTime = endReadingTime - startReadingTime;

        Logger.logInfo("DataReader", "Total reading time: " + totalTime + " ms");
        Logger.logInfo("DataReader",
                "Average reading time per point: " + (totalReadingTime.get() / (double) totalReadPoints.get()) + " ms");
    }

    private long readData(String measurement, String interval, long start, long end,
            BlockingQueue<DataResponse> dataQueue, int threadIndex)
            throws IoTDBConnectionException, StatementExecutionException, InterruptedException {
        long startTime = System.currentTimeMillis();

        // Build the SQL query using the interval
        String sql = buildSqlQuery(measurement, interval, start, end);

        SessionDataSetWrapper dataSet = sessionPool.executeQueryStatement(sql); // Execute the SQL query

        long pointCount = 0;
        LongArrayOutput out = new LongArrayOutput();
        GorillaCompressor compressor = new GorillaCompressor(start, out); // Initialize the Gorilla compressor

        while (dataSet.hasNext()) {
            RowRecord point = dataSet.next();
            long timestamp = point.getTimestamp();
            double value = point.getFields().get(0).getDoubleV();
            BigDecimal roundedValue = new BigDecimal(value).setScale(2, RoundingMode.HALF_UP); // Round to 2 decimal places
            compressor.addValue(timestamp, roundedValue.doubleValue()); // Compress the timestamp-value pair
            pointCount++;
        }

        compressor.close(); // Finalize the compression

        byte[] byteArr = longArrToByteArr(out.getLongArray()); // Convert the long array to byte array
        byte[] byteArrCompress = Zstd.compress(byteArr, 22); // Compress the byte array using Zstd
        ByteString byteString = ByteString.copyFrom(byteArrCompress);

        DataResponse dataResponse = DataResponse.newBuilder().setPoints(byteString).build();
        dataQueue.add(dataResponse); // Add the compressed data to the queue

        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;

        totalReadingTime.addAndGet(duration);
        totalReadPoints.addAndGet(pointCount);

        return pointCount; // Return the number of points read
    }

    private String intervalToDBSymbol(String interval) {
        // Convert the interval to the IoTDB-compatible symbol
        switch (interval.toLowerCase()) {
            case "year":
                return "1y";
            case "month":
                return "1mo";
            case "day":
                return "1d";
            case "hour":
                return "1h";
            case "minute":
                return "1m";
            case "second":
                return "1s";
            default:
                throw new IllegalArgumentException("Unsupported interval: " + interval); // Handle invalid intervals
        }
    }

    private String buildSqlQuery(String measurement, String interval, long start, long end) {
        String iotdbInterval = intervalToDBSymbol(interval);
        // Build the SQL query string using the IoTDB interval and measurement information
        return String.format(
                "SELECT AVG(%s) FROM root.kreps.djn01 WHERE time >= %d AND time <= %d GROUP BY ([%d, %d), %s)",
                measurement, start, end, start, end, iotdbInterval);
    }

    static long parseDate(String dateString) {
        try {
            ZonedDateTime zonedDateTime = ZonedDateTime.parse(dateString, DateTimeFormatter.ISO_DATE_TIME);
            return Date.from(zonedDateTime.toInstant()).getTime();
        } catch (DateTimeParseException e) {
            Logger.logError("DataReader", "Failed to parse date: " + e.getMessage());
            throw new RuntimeException(e); // Propagate the exception if date parsing fails
        }
    }

    private byte[] longArrToByteArr(long[] longArray) {
        int byteLength = longArray.length * Long.BYTES;
        byte[] byteArray = new byte[byteLength];

        // Convert each long value in the array to a byte array
        for (int i = 0; i < longArray.length; i++) {
            long value = longArray[i];
            for (int j = 0; j < Long.BYTES; j++) {
                byteArray[i * Long.BYTES + j] = (byte) (value >> (8 * (Long.BYTES - j - 1)));
            }
        }

        return byteArray;
    }
}
