package tech.hirsun.mahjong.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import tech.hirsun.mahjong.model.Room;
import tech.hirsun.mahjong.model.User;
import tech.hirsun.mahjong.service.AuthService;
import tech.hirsun.mahjong.service.RoomService;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;
    private final AuthService authService;

    public RoomController(RoomService roomService, AuthService authService) {
        this.roomService = roomService;
        this.authService = authService;
    }

    /**
     * 创建房间
     */
    @PostMapping
    public ResponseEntity<?> createRoom(@RequestHeader("Authorization") String token) {
        User user = authService.getUserByToken(token);
        
        if (user == null) {
            return ResponseEntity.status(401).body(createErrorResponse("无效的令牌"));
        }
        
        Room room = roomService.createRoom(user);
        
        return ResponseEntity.ok(createRoomResponse(room, true));
    }

    /**
     * 获取房间列表
     */
    @GetMapping
    public ResponseEntity<?> getRooms(@RequestHeader("Authorization") String token) {
        User user = authService.getUserByToken(token);
        
        if (user == null) {
            return ResponseEntity.status(401).body(createErrorResponse("无效的令牌"));
        }
        
        List<Room> rooms = roomService.getAllRooms();
        List<Map<String, Object>> roomResponses = rooms.stream()
                .map(room -> createRoomListResponse(room))
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(roomResponses);
    }

    /**
     * 加入房间
     */
    @PostMapping("/{roomId}/join")
    public ResponseEntity<?> joinRoom(@PathVariable int roomId,
                                     @RequestBody Map<String, String> request,
                                     @RequestHeader("Authorization") String token) {
        String password = request.get("password");
        
        if (password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(createErrorResponse("密码不能为空"));
        }
        
        User user = authService.getUserByToken(token);
        
        if (user == null) {
            return ResponseEntity.status(401).body(createErrorResponse("无效的令牌"));
        }
        
        Room room = roomService.joinRoom(roomId, password, user);
        
        if (room == null) {
            return ResponseEntity.badRequest().body(createErrorResponse("加入房间失败，请检查房间号和密码"));
        }
        
        return ResponseEntity.ok(createRoomResponse(room, true));
    }

    /**
     * 获取房间详情
     */
    @GetMapping("/{roomId}")
    public ResponseEntity<?> getRoomDetail(@PathVariable int roomId,
                                          @RequestHeader("Authorization") String token) {
        User user = authService.getUserByToken(token);
        
        if (user == null) {
            return ResponseEntity.status(401).body(createErrorResponse("无效的令牌"));
        }
        
        Room room = roomService.getRoomById(roomId);
        
        if (room == null) {
            return ResponseEntity.notFound().build();
        }
        
        if (!roomService.isUserInRoom(roomId, user)) {
            return ResponseEntity.status(403).body(createErrorResponse("您不在该房间中"));
        }
        
        return ResponseEntity.ok(createRoomResponse(room, true));
    }

    /**
     * 离开房间
     */
    @PostMapping("/{roomId}/leave")
    public ResponseEntity<?> leaveRoom(@PathVariable int roomId,
                                      @RequestHeader("Authorization") String token) {
        User user = authService.getUserByToken(token);
        
        if (user == null) {
            return ResponseEntity.status(401).body(createErrorResponse("无效的令牌"));
        }
        
        boolean success = roomService.leaveRoom(roomId, user);
        
        if (!success) {
            return ResponseEntity.badRequest().body(createErrorResponse("离开房间失败"));
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "已成功离开房间");
        
        return ResponseEntity.ok(response);
    }

    /**
     * 创建房间列表响应数据
     */
    private Map<String, Object> createRoomListResponse(Room room) {
        Map<String, Object> response = new HashMap<>();
        response.put("roomId", room.getRoomId());
        response.put("creator", createUserResponse(room.getCreator()));
        response.put("playerCount", room.getPlayerCount());
        response.put("gameInProgress", room.isGameInProgress());
        return response;
    }

    /**
     * 创建房间详情响应数据
     */
    private Map<String, Object> createRoomResponse(Room room, boolean includePassword) {
        Map<String, Object> response = new HashMap<>();
        response.put("roomId", room.getRoomId());
        if (includePassword) {
            response.put("password", room.getPassword());
        }
        response.put("creator", createUserResponse(room.getCreator()));
        
        List<Map<String, String>> players = new ArrayList<>();
        for (User player : room.getPlayers()) {
            players.add(createUserResponse(player));
        }
        response.put("players", players);
        
        response.put("expiryTime", room.getExpiryTime());
        response.put("gameInProgress", room.isGameInProgress());
        
        return response;
    }

    /**
     * 创建用户响应数据
     */
    private Map<String, String> createUserResponse(User user) {
        Map<String, String> userResponse = new HashMap<>();
        userResponse.put("email", user.getEmail());
        userResponse.put("nickname", user.getNickname());
        return userResponse;
    }

    /**
     * 创建错误响应数据
     */
    private Map<String, String> createErrorResponse(String message) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", message);
        return errorResponse;
    }
} 