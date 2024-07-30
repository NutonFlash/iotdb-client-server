// package org.kreps.iotdb.spring;

// import org.kreps.iotdb.Logger;
// import org.apache.iotdb.session.pool.SessionPool;
// import org.kreps.iotdb.DataBatch;
// import org.kreps.iotdb.DataReader;
// import org.kreps.iotdb.SessionManager;
// import org.springframework.web.bind.annotation.GetMapping;
// import org.springframework.web.bind.annotation.RequestParam;
// import org.springframework.web.bind.annotation.RestController;

// import jakarta.servlet.http.HttpServletResponse;

// import java.io.IOException;
// import java.io.OutputStreamWriter;
// import java.io.Writer;
// import java.nio.charset.StandardCharsets;
// import java.util.concurrent.BlockingQueue;
// import java.util.concurrent.CountDownLatch;
// import java.util.concurrent.ExecutorService;
// import java.util.concurrent.Executors;
// import java.util.concurrent.LinkedBlockingQueue;
// import java.util.concurrent.TimeUnit;
// import java.util.concurrent.atomic.AtomicBoolean;
// import java.util.zip.GZIPOutputStream;

// @RestController
// public class DataController {

//     private static final int THREAD_POOL_SIZE = 25;
//     private static final int DATA_READER_THREAD_NUM = 5;
//     private final ExecutorService executorService = Executors.newFixedThreadPool(THREAD_POOL_SIZE);
//     private final BlockingQueue<DataBatch> dataQueue = new LinkedBlockingQueue<>();
//     private final AtomicBoolean isReadingComplete = new AtomicBoolean(false);

//     @GetMapping("/data")
//     public void getChunkedData(@RequestParam("measurement") String measurement,
//                                @RequestParam("startDate") String startDate,
//                                @RequestParam("endDate") String endDate,
//                                HttpServletResponse response) throws IOException {

//         response.setContentType("application/json");
//         response.setHeader("Transfer-Encoding", "chunked");
//         response.setHeader("Content-Encoding", "gzip");

//         GZIPOutputStream gzipOutputStream = new GZIPOutputStream(response.getOutputStream());
//         Writer writer = new OutputStreamWriter(gzipOutputStream, StandardCharsets.UTF_8);

//         CountDownLatch latch = new CountDownLatch(1);

//         // Submit the data reading task
//         executorService.submit(() -> {
//             SessionPool sessionPool = SessionManager.getSessionPool();
//             DataReader dataReader = new DataReader(sessionPool, DATA_READER_THREAD_NUM, dataQueue);
//             dataReader.startReading(measurement, startDate, endDate);
//             isReadingComplete.set(true);
//         });

//         // Single thread to handle writing to the stream
//         executorService.submit(() -> {
//             boolean firstBatch = true;
//             try {
//                 while (!isReadingComplete.get() || !dataQueue.isEmpty()) {
//                     DataBatch batch = dataQueue.poll(100, TimeUnit.MILLISECONDS);
//                     if (batch != null) {
//                         String batchJSON = batch.toJSON();

//                         synchronized (writer) {
//                             if (!firstBatch) {
//                                 writer.write(",");
//                             } else {
//                                 writer.write("["); // Start the JSON array
//                                 firstBatch = false;
//                             }

//                             writer.write(batchJSON);
//                             writer.flush();

//                             int batchSizeInBytes = batchJSON.getBytes(StandardCharsets.UTF_8).length;
//                             Logger.logInfo("DataController", String.format("Sent chunk of %dkb for %s measurment", (batchSizeInBytes / 1024), measurement));
//                         }
//                     }
//                 }
//                 synchronized (writer) {
//                     writer.write("]"); // End the JSON array
//                 }
//             } catch (InterruptedException e) {
//                 Thread.currentThread().interrupt();
//                 Logger.logError("DataController", "Error writing data: " + e.getMessage());
//             } catch (IOException e) {
//                 Logger.logError("DataController", "Error writing data: " + e.getMessage());
//             } finally {
//                 latch.countDown();
//             }
//         });

//         // Wait for the writing task to complete before closing the writer
//         try {
//             latch.await();
//         } catch (InterruptedException e) {
//             Thread.currentThread().interrupt();
//         } finally {
//             try {
//                 writer.close();
//             } catch (IOException e) {
//                 Logger.logError("DataController", "Error closing writer: " + e.getMessage());
//             }
//         }
//     }
// }
