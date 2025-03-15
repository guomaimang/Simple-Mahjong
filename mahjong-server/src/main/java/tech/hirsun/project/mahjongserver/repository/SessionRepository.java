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
            // 检查是否已经有相同的会话ID
            if (sessionMap.containsKey(session.getId())) {
                System.out.println("Session already registered with ID: " + session.getId() + " for user: " + sessionUserMap.get(session.getId()));
                // 如果已注册的会话属于不同用户，则先清理旧数据
                String existingUser = sessionUserMap.get(session.getId());
                if (!userEmail.equals(existingUser)) {
                    System.out.println("Replacing existing session mapping from user " + existingUser + " to " + userEmail);
                    if (existingUser != null) {
                        userSessionMap.remove(existingUser);
                    }
                    sessionUserMap.put(session.getId(), userEmail);
                }
                // 更新会话和用户映射
                sessionMap.put(session.getId(), session);
                userSessionMap.put(userEmail, session.getId());
                return;
            }

            // 检查该用户是否已有其他会话
            String oldSessionId = userSessionMap.get(userEmail);
            if (oldSessionId != null) {
                System.out.println("User already has a session, replacing old session: " + oldSessionId + " with new session: " + session.getId());
                
                // 尝试关闭旧会话
                WebSocketSession oldSession = sessionMap.get(oldSessionId);
                if (oldSession != null && oldSession.isOpen()) {
                    try {
                        System.out.println("Closing old session: " + oldSessionId);
                        oldSession.close();
                    } catch (Exception e) {
                        System.err.println("Error closing old session: " + e.getMessage());
                    }
                }
                
                // 移除旧会话映射
                sessionMap.remove(oldSessionId);
                sessionUserMap.remove(oldSessionId);
            }
            
            // 注册新会话
            System.out.println("Registering new session: " + session.getId() + " for user: " + userEmail);
            sessionMap.put(session.getId(), session);
            userSessionMap.put(userEmail, session.getId());
            sessionUserMap.put(session.getId(), userEmail);
        } else {
            System.err.println("Cannot register null session or user email");
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