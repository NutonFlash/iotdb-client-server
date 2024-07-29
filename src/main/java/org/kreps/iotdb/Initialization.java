package org.kreps.iotdb;

import org.apache.iotdb.rpc.IoTDBConnectionException;
import org.apache.iotdb.rpc.StatementExecutionException;
import org.apache.iotdb.session.Session;
import org.apache.iotdb.tsfile.file.metadata.enums.TSDataType;
import org.apache.iotdb.tsfile.file.metadata.enums.TSEncoding;
import org.apache.iotdb.tsfile.file.metadata.enums.CompressionType;

import java.util.Map;

public class Initialization {

    private final Session session;
    private final String storageGroup;
    private final String device;
    private final Map<String, TimeSeriesConfig> timeSeriesConfigMap;

    public Initialization(Session session, String storageGroup, String device, Map<String, TimeSeriesConfig> timeSeriesConfigMap) {
        this.session = session;
        this.storageGroup = storageGroup;
        this.device = device;
        this.timeSeriesConfigMap = timeSeriesConfigMap;
    }

    public void setupDatabase() throws IoTDBConnectionException, StatementExecutionException {
        try {
            dropStorageGroup(storageGroup);
        } catch (StatementExecutionException e) {
            Logger.logInfo("Initialization", "Storage group " + storageGroup + " does not exist, skipping drop.");
        }
        try {
            createStorageGroup(storageGroup);
        } catch (StatementExecutionException e) {
            if (e.getMessage().contains("some children of " + storageGroup + " have already been created as database")) {
                Logger.logInfo("Initialization", "Storage group " + storageGroup + " already exists, cleaning up.");
                cleanupChildren(storageGroup);
                createStorageGroup(storageGroup);
            } else {
                throw e;
            }
        }
        for (Map.Entry<String, TimeSeriesConfig> entry : timeSeriesConfigMap.entrySet()) {
            createTimeSeries(device + "." + entry.getKey(), entry.getValue());
        }
        Logger.logInfo("Initialization", "Database setup completed.");
    }

    private void cleanupChildren(String storageGroup) throws IoTDBConnectionException, StatementExecutionException {
        try {
            session.executeNonQueryStatement("DELETE TIMESERIES " + storageGroup + ".*");
            Logger.logInfo("Initialization", "Cleaned up children of storage group: " + storageGroup);
        } catch (StatementExecutionException e) {
            Logger.logError("Initialization", "Error cleaning up children of storage group: " + e.getMessage());
            throw e;
        }
    }

    private void dropStorageGroup(String storageGroup) throws IoTDBConnectionException, StatementExecutionException {
        session.executeNonQueryStatement("DELETE STORAGE GROUP " + storageGroup);
        Logger.logInfo("Initialization", "Dropped storage group: " + storageGroup);
    }

    private void createStorageGroup(String storageGroup) throws IoTDBConnectionException, StatementExecutionException {
        session.setStorageGroup(storageGroup);
        Logger.logInfo("Initialization", "Created storage group: " + storageGroup);
    }

    private void createTimeSeries(String path, TimeSeriesConfig config) {
        try {
            session.createTimeseries(path, config.dataType, config.encoding, config.compression);
            Logger.logInfo("Initialization", "Created time series: " + path);
        } catch (StatementExecutionException e) {
            if (e.getMessage().contains("Path [" + path + "] already exists")) {
                Logger.logInfo("Initialization", "Time series " + path + " already exists, skipping creation.");
            } else {
                Logger.logError("Initialization", "Error creating time series: " + e.getMessage());
            }
        } catch (IoTDBConnectionException e) {
            Logger.logError("Initialization", "Connection error while creating time series: " + e.getMessage());
        }
    }

    public static class TimeSeriesConfig {
        public final TSDataType dataType;
        public final TSEncoding encoding;
        public final CompressionType compression;

        public TimeSeriesConfig(TSDataType dataType, TSEncoding encoding, CompressionType compression) {
            this.dataType = dataType;
            this.encoding = encoding;
            this.compression = compression;
        }
    }
}
