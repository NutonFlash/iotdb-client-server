package org.kreps.iotdb;

import org.apache.iotdb.session.Session;
import org.apache.iotdb.session.pool.SessionPool;

import java.util.List;

public class SessionManager {

    private static SessionPool sessionPool;
    private static Session session;

    public static void initializeSessionPool(List<String> nodeUrls, String username, String password, int poolSize) {
        if (sessionPool == null) {
            sessionPool = new SessionPool.Builder()
                    .nodeUrls(nodeUrls)
                    .user(username)
                    .password(password)
                    .maxSize(poolSize)
                    .build();
            Logger.logInfo("SessionManager", "Session pool initialized with nodes: " + String.join(", ", nodeUrls));
        }
    }

    public static void initializeSession(String host, int port, String username, String password) {
        if (session == null) {
            session = new Session(host, port, username, password);
            try {
                session.open();
                Logger.logInfo("SessionManager", "Session initialized and opened.");
            } catch (Exception e) {
                Logger.logError("SessionManager", "Error initializing session: " + e.getMessage());
            }
        }
    }

    public static SessionPool getSessionPool() {
        return sessionPool;
    }

    public static Session getSession() {
        return session;
    }

    public static void closeSessionPool() {
        if (sessionPool != null) {
            sessionPool.close();
            Logger.logInfo("SessionManager", "Session pool closed.");
        }
    }

    public static void closeSession() {
        if (session != null) {
            try {
                session.close();
                Logger.logInfo("SessionManager", "Session closed.");
            } catch (Exception e) {
                Logger.logError("SessionManager", "Error closing session: " + e.getMessage());
            }
        }
    }
}
