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

    private static final int THREAD_POOL_SIZE = 5;
    private static final int DATA_READER_THREAD_NUM = 5;
    private final ExecutorService executorService = Executors.newFixedThreadPool(THREAD_POOL_SIZE);

    @Override
    public void getData(DataRequest request, StreamObserver<DataResponse> responseObserver) {
        CompletionService<Void> completionService = new ExecutorCompletionService<>(executorService);

        String measurement = request.getMeasurement();
        String startDate = request.getStartDate();
        String endDate = request.getEndDate();

        BlockingQueue<DataBatch> dataQueue = new LinkedBlockingQueue<>();

        // Submit the data reading task
        completionService.submit(() -> {
            SessionPool sessionPool = SessionManager.getSessionPool();
            DataReader dataReader = new DataReader(sessionPool, DATA_READER_THREAD_NUM, dataQueue);
            dataReader.startReading(measurement, startDate, endDate);
            return null;
        });

        boolean isReading = true;

        while (isReading || !dataQueue.isEmpty()) {
            try {
                if (isReading) {
                    Future<Void> future = completionService.poll(100, TimeUnit.MILLISECONDS);
                    if (future != null) {
                        future.get(); // This will throw an exception if the reading task failed
                        isReading = false; // Mark reading as completed
                    }
                }

                DataBatch batch = dataQueue.poll(100, TimeUnit.MILLISECONDS);
                if (batch != null) {
                    // Assuming batch.getPoints() returns byte array
                    DataResponse response = DataResponse.newBuilder().setPoints(null).build();
                    responseObserver.onNext(response);
                }
            } catch (InterruptedException exception) {
                System.err.println(exception.getMessage());
                Thread.currentThread().interrupt(); // Preserve interrupt status
                break;
            } catch (ExecutionException exception) {
                System.err.println("Data reading task failed: " + exception.getCause().getMessage());
                break;  
            }
        }
        responseObserver.onCompleted();

    }
}