package org.kreps.iotdb;

import io.grpc.Server;
import io.grpc.ServerBuilder;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

public class RPCServer {

    private Server server;

    public static void main(String[] args) throws IOException, InterruptedException {
        List<String> nodeUrls = Arrays.asList("192.168.56.107:6667");
        String username = "root";
        String password = "root";
        int poolSize = 10;

        SessionManager.initializeSessionPool(nodeUrls, username, password, poolSize);

        final RPCServer senderServer = new RPCServer();

        senderServer.start();
        senderServer.blockUntilShutdown();
    }

    private void start() throws IOException {
        int port = 50051;
        server = ServerBuilder.forPort(port)
                .addService(new SenderImpl())
                .build()
                .start();
        Logger.logInfo("RPCServer", "Server started, listening on " + port);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            Logger.logInfo("RPCServer", "Shutting down gRPC server since JVM is shutting down");
            RPCServer.this.stop();
            Logger.logInfo("RPCServer", "Server shut down");
        }));
    }

    private void stop() {
        if (server != null) {
            server.shutdown();
        }
    }

    private void blockUntilShutdown() throws InterruptedException {
        if (server != null) {
            server.awaitTermination();
        }
    }
}