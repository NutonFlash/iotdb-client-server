package org.kreps.iotdb.spring;

import java.util.Arrays;
import java.util.List;

import org.kreps.iotdb.SessionManager;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SpringServer {
    public static void main(String[] args) {
        List<String> nodeUrls = Arrays.asList("192.168.56.107:6667");
        String username = "root";
        String password = "root";
        int poolSize = 10;

        SessionManager.initializeSessionPool(nodeUrls, username, password, poolSize);
        
        SpringApplication.run(SpringServer.class, args);
    }
}
