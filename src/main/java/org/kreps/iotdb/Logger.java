package org.kreps.iotdb;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class Logger {

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public static void log(String type, String threadId, String message) {
        String timestamp = LocalDateTime.now().format(formatter);
        System.out.println(String.format("[%s]\tThread-%s\t%s: %s", timestamp, threadId, type, message));
    }

    public static void logInfo(String threadId, String message) {
        log("Info", threadId, message);
    }

    public static void logError(String threadId, String message) {
        log("Error", threadId, message);
    }
}