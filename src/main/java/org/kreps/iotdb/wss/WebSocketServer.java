// package org.kreps.iotdb.wss;

// import org.apache.iotdb.session.pool.SessionPool;

// import jakarta.websocket.*;
// import jakarta.websocket.server.ServerEndpoint;

// import org.json.JSONObject;
// import org.kreps.iotdb.DataBatch;
// import org.kreps.iotdb.Logger;
// import org.json.JSONException;

// import java.io.IOException;
// import java.nio.charset.StandardCharsets;
// import java.util.Arrays;
// import java.util.List;
// import java.util.concurrent.BlockingQueue;
// import java.util.concurrent.ExecutorService;
// import java.util.concurrent.Executors;
// import java.util.concurrent.LinkedBlockingQueue;

// @ServerEndpoint("/wss")
// public class WebSocketServer {

//     private static final int THREAD_POOL_SIZE = 10;
//     private ExecutorService executorService = Executors.newFixedThreadPool(THREAD_POOL_SIZE);
//     private BlockingQueue<DataBatch> dataQueue = new LinkedBlockingQueue<>();

//     @OnOpen
//     public void onOpen(Session session) {
//         System.out.println("Connected: " + session.getId());
//     }

//     @OnMessage
//     public void onMessage(String message, Session session) {
//         try {
//             JSONObject jsonMessage = new JSONObject(message);
//             String type = jsonMessage.getString("type");

//             if ("fetch-points".equals(type)) {
//                 String startDate = jsonMessage.getString("startDate");
//                 String endDate = jsonMessage.getString("endDate");
//                 int batchSize = jsonMessage.getInt("batchSize");
//                 int numThreads = jsonMessage.getInt("numThreads");
//                 List<String> measurements = Arrays.asList(jsonMessage.getString("measurements").split(","));

//                 executorService
//                         .submit(() -> fetchData(session, startDate, endDate, batchSize, numThreads, measurements));
//             } else {
//                 Logger.logError("WebSocketServer", "Unknown message type: " + type);
//             }
//         } catch (JSONException e) {
//             Logger.logError("WebSocketServer", "Failed to parse message: " + e.getMessage());
//         }
//     }

//     @OnClose
//     public void onClose(Session session) {
//         System.out.println("Disconnected: " + session.getId());
//         executorService.shutdownNow();
//     }

//     private void fetchData(Session session, String startDate, String endDate, int batchSize, int numThreads,
//             List<String> measurements) {
//         // SessionPool sessionPool = SessionManager.getSessionPool();
//         // DataReader dataReader = new DataReader(sessionPool, startDate, endDate, batchSize, measurements, numThreads,
//         //         dataQueue);

//         // executorService.submit(() -> {
//         //     dataReader.startReading();
//         //     try {
//         //         session.getBasicRemote().sendText("end-reading");
//         //         Logger.logInfo("WebSocketServer",
//         //                 "Fetching data from IoTDB has been completed");
//         //     } catch (IOException e) {
//         //         Logger.logError("WebSocketServer", "Failed to send completion message: " + e.getMessage());
//         //     }
//         // });

//         while (!Thread.currentThread().isInterrupted()) {
//             try {
//                 DataBatch batch = dataQueue.take();
//                 String batchJSON = batch.toJSON();

//                 long sendStartTime = System.currentTimeMillis();
//                 session.getBasicRemote().sendText(batchJSON);
//                 long sendEndTime = System.currentTimeMillis();

//                 Logger.logInfo("WebSocketServer",
//                         "Sent DataBatch to the client, took " + (sendEndTime - sendStartTime) + " ms." + " Size of batch: " + Math.round(batchJSON.getBytes(StandardCharsets.UTF_8).length / 1024) + "kb.");
//             } catch (InterruptedException e) {
//                 Thread.currentThread().interrupt();
//                 break;
//             } 
//             catch (IOException e) {
//                 Logger.logError("WebSocketServer", "Error sending data: " + e.getMessage());
//                 break;
//             }
//         }
//     }
// }
