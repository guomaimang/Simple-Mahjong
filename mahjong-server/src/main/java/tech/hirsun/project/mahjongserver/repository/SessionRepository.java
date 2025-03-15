package tech.hirsun.project.mahjongserver.repository;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;
import org.springframework.web.socket.WebSocketSession;

@Repository
public class SessionRepository {
    // Store sessions by session ID
    private final Map<String, WebSocketSession> sessionMap = new ConcurrentHashMap<>();
    
    // Map user emails to session IDs
    private final Map<String, String> userSessionMap = new ConcurrentHashMap<>();
    
    // Map session IDs to user emails
    private final Map<String, String> sessionUserMap = new ConcurrentHashMap<>();

    /**
     * Register a new session
     * @param session The WebSocket session
     * @param userEmail The user's email
     */
    public void registerSession(WebSocketSession session, String userEmail) {
        if (session != null && userEmail != null) {
            // Remove any existing session for this user
            String oldSessionId = userSessionMap.get(userEmail);
            if (oldSessionId != null) {
                sessionMap.remove(oldSessionId);
                sessionUserMap.remove(oldSessionId);
            }
            
            // Register the new session
            sessionMap.put(session.getId(), session);
            userSessionMap.put(userEmail, session.getId());
            sessionUserMap.put(session.getId(), userEmail);
        }
    }

    /**
     * Get session by user email
     * @param userEmail The user's email
     * @return The WebSocket session, or null if not found
     */
    public WebSocketSession getSessionByUser(String userEmail) {
        String sessionId = userSessionMap.get(userEmail);
        if (sessionId != null) {
            return sessionMap.get(sessionId);
        }
        return null;
    }

    /**
     * Get user email by session ID
     * @param sessionId The session ID
     * @return The user's email, or null if not found
     */
    public String getUserBySessionId(String sessionId) {
        return sessionUserMap.get(sessionId);
    }

    /**
     * Remove a session
     * @param sessionId The session ID to remove
     */
    public void removeSession(String sessionId) {
        String userEmail = sessionUserMap.get(sessionId);
        if (userEmail != null) {
            userSessionMap.remove(userEmail);
        }
        sessionUserMap.remove(sessionId);
        sessionMap.remove(sessionId);
    }

    /**
     * Get all active sessions
     * @return Map of all sessions
     */
    public Map<String, WebSocketSession> getAllSessions() {
        return new ConcurrentHashMap<>(sessionMap);
    }

    /**
     * Check if a user is connected
     * @param userEmail The user's email
     * @return true if the user has an active session, false otherwise
     */
    public boolean isUserConnected(String userEmail) {
        return userSessionMap.containsKey(userEmail);
    }
} 