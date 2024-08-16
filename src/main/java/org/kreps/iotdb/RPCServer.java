package org.kreps.iotdb;

import io.grpc.Grpc;
import io.grpc.InsecureServerCredentials;
import io.grpc.Server;
import io.grpc.protobuf.services.ProtoReflectionService;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class RPCServer {

    private Server server;

    public static void main(String[] args) throws IOException, InterruptedException {
        List<String> nodeUrls = Arrays.asList("192.168.0.202:6667");
        String username = "root";
        String password = "root";   
        int poolSize = 15;

        SessionManager.initializeSessionPool(nodeUrls, username, password, poolSize);

        final RPCServer senderServer = new RPCServer();

        senderServer.start();
        senderServer.blockUntilShutdown();
    }

    private void start() throws IOException {
        int port = 50051;
        server = Grpc.newServerBuilderForPort(port, InsecureServerCredentials.create())
                .addService(new SenderImpl())
                .addService(ProtoReflectionService.newInstance())
                .build()
                .start();
        Logger.logInfo("RPCServer", "Server started, listening on " + port);
        Runtime.getRuntime().addShutdownHook(new Thread() {
            @Override
            public void run() {
                Logger.logInfo("RPCServer", "Shutting down gRPC server since JVM is shutting down");
                try {
                    RPCServer.this.stop();
                } catch (InterruptedException exception) {
                    Logger.logError("RPCServer", exception.getMessage());
                }
                Logger.logInfo("RPCServer", "Server shut down");
            }
        });
    }

    private void stop() throws InterruptedException {
        if (server != null) {
            server.shutdown().awaitTermination(30, TimeUnit.SECONDS);
        }
    }

    private void blockUntilShutdown() throws InterruptedException {
        if (server != null) {
            server.awaitTermination();
        }
    }
}