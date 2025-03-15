package tech.hirsun.project.mahjongserver.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.ObjectMapper;

import tech.hirsun.project.mahjongserver.model.Room;
import tech.hirsun.project.mahjongserver.repository.RoomRepository;
import tech.hirsun.project.mahjongserver.repository.SessionRepository;

@Service
public class WebSocketService {

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private RoomRepository roomRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Send a message to a specific user
     * @param userEmail User's email
     * @param type Message type
     * @param data Message data
     * @return true if message sent, false otherwise
     */
    public boolean sendMessage(String userEmail, String type, Object data) {
        WebSocketSession session = sessionRepository.getSessionByUser(userEmail);
        if (session != null && session.isOpen()) {
            try {
                Map<String, Object> message = new HashMap<>();
                message.put("type", type);
                message.put("data", data);
                message.put("timestamp", System.currentTimeMillis());
                
                String payload = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(payload));
                return true;
            } catch (IOException e) {
                // Log error
                return false;
            }
        }
        return false;
    }

    /**
     * Send a message to all users in a room
     * @param roomId Room ID
     * @param type Message type
     * @param data Message data
     */
    public void sendRoomMessage(String roomId, String type, Object data) {
        Room room = roomRepository.findById(roomId);
        if (room != null) {
            for (String userEmail : room.getPlayerEmails()) {
                sendMessage(userEmail, type, data);
            }
        }
    }

    /**
     * Send a game-related message to all users in a room
     * @param roomId Room ID
     * @param type Message type
     * @param data Message data
     */
    public void sendGameMessage(String roomId, String type, Object data) {
        Map<String, Object> gameData = new HashMap<>();
        gameData.put("roomId", roomId);
        gameData.put("gameData", data);
        sendRoomMessage(roomId, type, gameData);
    }

    /**
     * Send an error message to a user
     * @param userEmail User's email
     * @param code Error code
     * @param message Error message
     */
    public void sendErrorMessage(String userEmail, String code, String message) {
        Map<String, Object> errorData = new HashMap<>();
        errorData.put("code", code);
        errorData.put("message", message);
        sendMessage(userEmail, "ERROR", errorData);
    }

    /**
     * Send a system notification to all users in a room
     * @param roomId Room ID
     * @param message Notification message
     */
    public void sendSystemNotification(String roomId, String message) {
        Map<String, Object> notificationData = new HashMap<>();
        notificationData.put("message", message);
        notificationData.put("time", LocalDateTime.now().toString());
        sendRoomMessage(roomId, "SYSTEM_NOTIFICATION", notificationData);
    }

    /**
     * Send room state update to all users in a room
     * @param roomId Room ID
     */
    public void sendRoomStateUpdate(String roomId) {
        Room room = roomRepository.findById(roomId);
        if (room != null) {
            Map<String, Object> roomData = new HashMap<>();
            roomData.put("roomId", room.getRoomId());
            roomData.put("status", room.getStatus().toString());
            roomData.put("playerCount", room.getPlayerEmails().size());
            roomData.put("creationTime", room.getCreationTime().toString());
            roomData.put("isExpired", room.isExpired());
            
            sendRoomMessage(roomId, "ROOM_STATE_UPDATE", roomData);
        }
    }
} 