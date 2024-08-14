package org.kreps.iotdb;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletionService;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorCompletionService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import org.apache.iotdb.session.pool.SessionPool;
import org.kreps.iotdb.protos.DataRequest;
import org.kreps.iotdb.protos.DataResponse;
import org.kreps.iotdb.protos.SenderGrpc;

import io.grpc.stub.StreamObserver;

public class SenderImpl extends SenderGrpc.SenderImplBase {

    private static final int RPC_THREAD_POOL_SIZE = 15;
    private static final int READER_THREAD_POOL_SIZE = 15;
    private static final int BASE_POINTS_THRESHOLD = 1000000;
    private static final ExecutorService executorService = Executors.newFixedThreadPool(RPC_THREAD_POOL_SIZE);

    private final DataReader dataReader;

    public SenderImpl() {
        SessionPool sessionPool = SessionManager.getSessionPool();
        dataReader = new DataReader(sessionPool, READER_THREAD_POOL_SIZE); // Initialize DataReader with session pool
    }

    @Override
    public void getData(DataRequest request, StreamObserver<DataResponse> responseObserver) {
        String measurement = request.getMeasurement();
        String interval = request.getInterval();
        String startDate = request.getStartDate();
        String endDate = request.getEndDate();
        int dataSize = estimateDataSize(interval, startDate, endDate); // Estimate the amount of data to be read

        // Determine the number of threads to use based on data size
        int threadCount = dataSize <= BASE_POINTS_THRESHOLD ? 1 : Math.min(READER_THREAD_POOL_SIZE, dataSize / BASE_POINTS_THRESHOLD);

        BlockingQueue<DataResponse> dataQueue = new LinkedBlockingQueue<>();

        // Submit the data reading task with the calculated thread count
        CompletionService<Void> completionService = new ExecutorCompletionService<>(executorService);
        completionService.submit(() -> {
            dataReader.startReading(measurement, interval, startDate, endDate, dataQueue, threadCount);
            return null;
        });

        boolean isReading = true;

        while (isReading || !dataQueue.isEmpty()) {
            try {
                if (isReading) {
                    // Poll for completion of the data reading task
                    Future<Void> future = completionService.poll(100, TimeUnit.MILLISECONDS);
                    if (future != null) {
                        future.get();  // This will throw an exception if the reading task failed
                        isReading = false;  // Mark reading as completed
                    }
                }

                // Retrieve data from the queue to send to the client
                DataResponse dataResponse = dataQueue.poll(100, TimeUnit.MILLISECONDS);

                if (dataResponse != null) {
                    long startTime = System.currentTimeMillis();
                    responseObserver.onNext(dataResponse); // Send data to the client
                    long endTime = System.currentTimeMillis();
                    Logger.logInfo("SenderImpl", String.format("Send points for %dms for measurement: %s", (endTime-startTime), measurement));
                }
            } catch (InterruptedException exception) {
                Logger.logError("SenderImpl", exception.getMessage());
                Thread.currentThread().interrupt();  // Preserve interrupt status in case of interruption
                break;
            } catch (ExecutionException exception) {
                Logger.logError("SenderImpl", "Data reading task failed: " + exception.getCause().getMessage());
                break; // Exit loop if data reading task fails
            }
        }
        responseObserver.onCompleted(); // Signal completion of the data stream to the client
    }

    private int estimateDataSize(String interval, String startDateStr, String endDateStr) {
        long startDate = DataReader.parseDate(startDateStr);
        long endDate = DataReader.parseDate(endDateStr);
    
        // Calculate the total duration in seconds
        long durationInSeconds = (endDate - startDate) / 1000;
    
        long dataSize;
        
        // Adjust dataSize based on the interval
        switch (interval.toLowerCase()) {
            case "month":
                dataSize = durationInSeconds / (31 * 24 * 60 * 60);
                break;
            case "day":
                dataSize = durationInSeconds / (24 * 60 * 60);
                break;
            case "hour":
                dataSize = durationInSeconds / (60 * 60);
                break;
            case "minute":
                dataSize = durationInSeconds / 60;
                break;
            case "second":
                dataSize = durationInSeconds; 
                break;
            default:
                throw new IllegalArgumentException("Invalid interval: " + interval); // Handle unexpected interval values
        }
    
        return (int) dataSize;
    }
}
