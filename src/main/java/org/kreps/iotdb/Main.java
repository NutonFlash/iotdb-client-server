package org.kreps.iotdb;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.Iterator;

import org.apache.iotdb.tsfile.file.metadata.enums.CompressionType;
import org.apache.iotdb.tsfile.file.metadata.enums.TSDataType;
import org.apache.iotdb.tsfile.file.metadata.enums.TSEncoding;

import org.kreps.iotdb.protos.DataResponse;

public class Main {
    public static void main(String[] args) {
        // Configuration parameters
        List<String> nodeUrls = Arrays.asList(
            "192.168.0.202:6667"
            // "192.168.56.104:6667",
            // "192.168.56.105:6667"
        );
        String username = "root";
        String password = "root";

        int poolSize = 50;
        String startDateString = "2023-07-06 00:00:00"; 
        String endDateString = "2024-07-04 23:59:59"; 
        int batchSize = 500000;
        int numPoints = 31536000;
        int numThreads = 5;
        
        String storageGroup = "root.kreps";
        String device = "root.kreps.djn01";
        List<String> measurements = Arrays.asList("temperature", "light", "pressure", "humidity", "frequency");

        BlockingQueue<DataResponse> dataQueue = new LinkedBlockingQueue<>();

        Map<String, Initialization.TimeSeriesConfig> timeSeriesConfigMap = new HashMap<>();
        timeSeriesConfigMap.put("temperature", new Initialization.TimeSeriesConfig(TSDataType.FLOAT, TSEncoding.RLE, CompressionType.SNAPPY));
        timeSeriesConfigMap.put("pressure", new Initialization.TimeSeriesConfig(TSDataType.FLOAT, TSEncoding.RLE, CompressionType.SNAPPY));
        timeSeriesConfigMap.put("light", new Initialization.TimeSeriesConfig(TSDataType.FLOAT, TSEncoding.RLE, CompressionType.SNAPPY));
        timeSeriesConfigMap.put("frequency", new Initialization.TimeSeriesConfig(TSDataType.FLOAT, TSEncoding.RLE, CompressionType.SNAPPY));
        timeSeriesConfigMap.put("humidity", new Initialization.TimeSeriesConfig(TSDataType.FLOAT, TSEncoding.RLE, CompressionType.SNAPPY));

        try {
            long initStartTime = System.currentTimeMillis();

            // Initialize SessionManager
            SessionManager.initializeSessionPool(nodeUrls, username, password, poolSize);
            SessionManager.initializeSession("192.168.0.202", 6667, username, password); // Initialize a single session for setup

            // Setup Database
            Initialization initialization = new Initialization(SessionManager.getSession(), storageGroup, device, timeSeriesConfigMap);
            initialization.setupDatabase();

            long initEndTime = System.currentTimeMillis();
            long initTime = initEndTime - initStartTime;
            Logger.logInfo("Main", "Database initialization time: " + initTime + " ms");

            DataWriter dataWriter = new DataWriter(SessionManager.getSessionPool(), startDateString, batchSize, numPoints, measurements, numThreads);
            dataWriter.startWriting();

            // DataReader dataReader = new DataReader(SessionManager.getSessionPool(), startDateString, endDateString, batchSize, measurements, numThreads, dataQueue);
            // dataReader.startReading();

            // Close SessionPool after data writing is done
            SessionManager.closeSessionPool();
            SessionManager.closeSession();
        } catch (Exception e) {
            Logger.logError("Main", "Error during data writing process: " + e.getMessage());
        }
    }
}