package tech.hirsun.project.mahjongserver.controller;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.Data;
import tech.hirsun.project.mahjongserver.model.Room;
import tech.hirsun.project.mahjongserver.model.User;
import tech.hirsun.project.mahjongserver.service.AuthService;
import tech.hirsun.project.mahjongserver.service.RoomService;
import tech.hirsun.project.mahjongserver.service.WebSocketService;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {

    @Autowired
    private RoomService roomService;

    @Autowired
    private AuthService authService;

    @Autowired
    private WebSocketService webSocketService;

    /**
     * Create a new room
     * @param token JWT token
     * @return Created room
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createRoom(@RequestHeader("Authorization") String token) {
        User user = validateToken(token);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }
        
        Room room = roomService.createRoom(user.getEmail());
        
        Map<String, Object> response = new HashMap<>();
        response.put("room", room);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get all active rooms
     * @param token JWT token
     * @return List of active rooms
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllRooms(@RequestHeader("Authorization") String token) {
        User user = validateToken(token);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }
        
        Collection<Room> rooms = roomService.getAllActiveRooms();
        
        Map<String, Object> response = new HashMap<>();
        response.put("rooms", rooms);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Get a room by ID
     * @param roomId Room ID
     * @param token JWT token
     * @return Room details
     */
    @GetMapping("/{roomId}")
    public ResponseEntity<Map<String, Object>> getRoomById(@PathVariable String roomId, 
                                                          @RequestHeader("Authorization") String token) {
        User user = validateToken(token);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }
        
        Room room = roomService.getRoomById(roomId);
        if (room == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Room not found"));
        }
        
        List<User> players = roomService.getPlayersInRoom(roomId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("room", room);
        response.put("players", players);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Join a room
     * @param roomId Room ID
     * @param request Join request containing password
     * @param token JWT token
     * @return Room details
     */
    @PostMapping("/{roomId}/join")
    public ResponseEntity<Map<String, Object>> joinRoom(@PathVariable String roomId, 
                                                       @RequestBody JoinRoomRequest request,
                                                       @RequestHeader("Authorization") String token) {
        User user = validateToken(token);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }
        
        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
        }
        
        Room room = roomService.joinRoom(roomId, request.getPassword(), user.getEmail());
        if (room == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to join room. Check room ID, password, and room capacity."));
        }
        
        // Notify all players in the room
        webSocketService.sendSystemNotification(roomId, user.getNickname() + " has joined the room.");
        webSocketService.sendRoomStateUpdate(roomId);
        
        List<User> players = roomService.getPlayersInRoom(roomId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("room", room);
        response.put("players", players);
        
        return ResponseEntity.ok(response);
    }

    /**
     * Start a game in a room
     * @param roomId Room ID
     * @param token JWT token
     * @return Success status
     */
    @PostMapping("/{roomId}/start")
    public ResponseEntity<Map<String, Object>> startGame(@PathVariable String roomId, 
                                                        @RequestHeader("Authorization") String token) {
        User user = validateToken(token);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        }
        
        boolean started = roomService.startGame(roomId, user.getEmail());
        if (!started) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to start game. Check if you are the room creator and there are enough players."));
        }
        
        // Notify all players in the room
        webSocketService.sendSystemNotification(roomId, "Game started by " + user.getNickname() + ".");
        webSocketService.sendRoomStateUpdate(roomId);
        
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Helper method to validate JWT token
     * @param token JWT token
     * @return User if token is valid, null otherwise
     */
    private User validateToken(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            return null;
        }
        
        String jwtToken = token.substring(7);
        if (!authService.validateToken(jwtToken)) {
            return null;
        }
        
        return authService.getUserFromToken(jwtToken);
    }

    // Request classes
    @Data
    public static class JoinRoomRequest {
        private String password;
    }
} 