package tech.hirsun.project.mahjongserver.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import tech.hirsun.project.mahjongserver.model.Game;
import tech.hirsun.project.mahjongserver.model.Room;
import tech.hirsun.project.mahjongserver.model.Tile;
import tech.hirsun.project.mahjongserver.repository.RoomRepository;
import tech.hirsun.project.mahjongserver.repository.SessionRepository;
import tech.hirsun.project.mahjongserver.service.GameService;
import tech.hirsun.project.mahjongserver.service.RoomService;
import tech.hirsun.project.mahjongserver.service.WebSocketService;

@Component
public class WebSocketController extends TextWebSocketHandler {

    private static final Logger LOGGER = Logger.getLogger(WebSocketController.class.getName());

    @Autowired
    private SessionRepository sessionRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private RoomService roomService;

    @Autowired
    private GameService gameService;

    @Autowired
    private WebSocketService webSocketService;

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule());

    // 存储正在处理GET_GAME_STATE请求的用户
    private final Set<String> processingGameStateRequests = ConcurrentHashMap.newKeySet();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String userEmail = (String) session.getAttributes().get("userEmail");
        if (userEmail != null) {
            LOGGER.info("WebSocket connection established for user: " + userEmail);
            sessionRepository.registerSession(session, userEmail);
            
            // Send welcome message
            webSocketService.sendMessage(userEmail, "CONNECTED", Map.of("message", "Connected to game server"));
        } else {
            LOGGER.warning("WebSocket connection attempt without valid user email");
            session.close(CloseStatus.POLICY_VIOLATION);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String userEmail = sessionRepository.getUserBySessionId(session.getId());
        if (userEmail == null) {
            LOGGER.warning("Message received from unregistered session");
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }
        
        try {
            JsonNode jsonNode = objectMapper.readTree(message.getPayload());
            String type = jsonNode.get("type").asText();
            JsonNode data = jsonNode.get("data");
            
            LOGGER.info("Received message of type: " + type + " from user: " + userEmail);
            
            switch (type) {
                case "JOIN_ROOM":
                    handleJoinRoom(userEmail, data);
                    break;
                case "LEAVE_ROOM":
                    handleLeaveRoom(userEmail, data);
                    break;
                case "START_GAME":
                    handleStartGame(userEmail, data);
                    break;
                case "DRAW_TILE":
                    handleDrawTile(userEmail, data);
                    break;
                case "DISCARD_TILE":
                    handleDiscardTile(userEmail, data);
                    break;
                case "TAKE_TILE":
                    handleTakeTile(userEmail, data);
                    break;
                case "REVEAL_TILES":
                    handleRevealTiles(userEmail, data);
                    break;
                case "HIDE_TILES":
                    handleHideTiles(userEmail, data);
                    break;
                case "CLAIM_WIN":
                    handleClaimWin(userEmail, data);
                    break;
                case "CONFIRM_WIN":
                    handleConfirmWin(userEmail, data);
                    break;
                case "GET_GAME_STATE":
                    handleGetGameState(userEmail, data);
                    break;
                default:
                    LOGGER.warning("Unknown message type: " + type);
                    webSocketService.sendErrorMessage(userEmail, "UNKNOWN_TYPE", "Unknown message type: " + type);
            }
        } catch (Exception e) {
            LOGGER.severe("Error handling message: " + e.getMessage());
            webSocketService.sendErrorMessage(userEmail, "ERROR", "Error processing message: " + e.getMessage());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userEmail = sessionRepository.getUserBySessionId(session.getId());
        if (userEmail != null) {
            LOGGER.info("WebSocket connection closed for user: " + userEmail);
            sessionRepository.removeSession(session.getId());
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        String userEmail = sessionRepository.getUserBySessionId(session.getId());
        LOGGER.severe("Transport error for user: " + userEmail + ", error: " + exception.getMessage());
        
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    /**
     * Handle join room message
     */
    private void handleJoinRoom(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        
        // Check if user is in the room
        if (!roomService.isUserInRoom(roomId, userEmail)) {
            webSocketService.sendErrorMessage(userEmail, "NOT_IN_ROOM", "You are not a member of this room");
            return;
        }
        
        // Send room state to the user
        webSocketService.sendRoomStateUpdate(roomId);
        
        // Notify other users
        Room room = roomService.getRoomById(roomId);
        if (room != null) {
            for (String playerEmail : room.getPlayerEmails()) {
                if (!playerEmail.equals(userEmail)) {
                    webSocketService.sendMessage(playerEmail, "USER_JOINED", Map.of("userEmail", userEmail));
                }
            }
        }
    }

    /**
     * Handle leave room message
     */
    private void handleLeaveRoom(String userEmail, JsonNode data) {
        // Currently, users cannot leave a room once they've joined
        webSocketService.sendErrorMessage(userEmail, "CANNOT_LEAVE", "You cannot leave a room once you've joined");
    }

    /**
     * Handle start game message
     */
    private void handleStartGame(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        
        LOGGER.info("Handling START_GAME request for room: " + roomId + " from user: " + userEmail);
        
        // Check if user is the room creator
        Room room = roomRepository.findById(roomId);
        if (room == null) {
            LOGGER.warning("Room not found: " + roomId);
            webSocketService.sendErrorMessage(userEmail, "ROOM_NOT_FOUND", "Room not found");
            return;
        }
        
        // 增加详细日志
        LOGGER.info("Room status: " + room.getStatus());
        LOGGER.info("Room creator: " + room.getCreatorEmail());
        LOGGER.info("Player count: " + room.getPlayerEmails().size());
        LOGGER.info("Current game: " + (room.getCurrentGame() != null ? "present" : "null"));
        if (room.getCurrentGame() != null) {
            LOGGER.info("Game status: " + room.getCurrentGame().getStatus());
        }
        
        if (!room.getCreatorEmail().equals(userEmail)) {
            LOGGER.warning("User " + userEmail + " is not the creator of room " + roomId);
            webSocketService.sendErrorMessage(userEmail, "NOT_CREATOR", "Only the room creator can start the game");
            return;
        }
        
        // 如果游戏已经结束但房间状态不是WAITING，修复它
        if (room.getCurrentGame() != null && 
            room.getCurrentGame().getStatus() == Game.GameStatus.FINISHED && 
            room.getStatus() != Room.RoomStatus.WAITING) {
            
            LOGGER.info("Room has finished game but status is not WAITING. Fixing status...");
            room.setStatus(Room.RoomStatus.WAITING);
            roomRepository.save(room);
            
            // 重新获取房间，以确保状态已更新
            room = roomRepository.findById(roomId);
        }
        
        // Check if game can be started
        if (room.getStatus() == Room.RoomStatus.PLAYING) {
            LOGGER.warning("Game is already in progress in room " + roomId);
            
            // 如果游戏已经在进行中，直接发送当前游戏状态
            if (room.getCurrentGame() != null) {
                LOGGER.info("Game already in progress, sending game state");
                // 向所有玩家发送游戏状态
                for (String playerEmail : room.getPlayerEmails()) {
                    Map<String, Object> gameState = gameService.getGameState(roomId, playerEmail);
                    webSocketService.sendMessage(playerEmail, "GAME_STATE", gameState);
                }
                return;
            } else {
                // 如果状态是PLAYING但游戏实例为null，重置房间状态
                LOGGER.info("Room status is PLAYING but game is null, resetting room status");
                room.setStatus(Room.RoomStatus.WAITING);
                roomRepository.save(room);
            }
        }
        
        if (!room.canStartGame()) {
            LOGGER.warning("Cannot start game in room " + roomId + ". Need at least 2 players and room must be in waiting state");
            webSocketService.sendErrorMessage(userEmail, "CANNOT_START", "Cannot start game. Need at least 2 players and room must be in waiting state");
            return;
        }
        
        // Initialize game
        LOGGER.info("Initializing game in room " + roomId);
        Game game = gameService.initializeGame(roomId);
        if (game == null) {
            LOGGER.severe("Failed to initialize game in room " + roomId);
            webSocketService.sendErrorMessage(userEmail, "GAME_INIT_FAILED", "Failed to initialize game");
            return;
        }
        
        // Notify all players
        LOGGER.info("Game started in room " + roomId + " with dealer: " + game.getDealerEmail());
        webSocketService.sendGameMessage(roomId, "GAME_STARTED", Map.of(
            "dealerEmail", game.getDealerEmail(),
            "playerCount", room.getPlayerEmails().size()
        ));
        
        // Send game state to each player
        for (String playerEmail : room.getPlayerEmails()) {
            Map<String, Object> gameState = gameService.getGameState(roomId, playerEmail);
            if (gameState.isEmpty()) {
                LOGGER.warning("Empty game state for user " + playerEmail + " in room " + roomId);
            }
            webSocketService.sendMessage(playerEmail, "GAME_STATE", gameState);
        }
    }

    /**
     * Handle draw tile message
     */
    private void handleDrawTile(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        
        // Draw tile
        Tile tile = gameService.drawTile(roomId, userEmail);
        if (tile == null) {
            webSocketService.sendErrorMessage(userEmail, "DRAW_FAILED", "Failed to draw tile");
            return;
        }
        
        // Send tile to the player
        webSocketService.sendMessage(userEmail, "TILE_DRAWN", Map.of("tile", tile));
        
        // Notify all players about the action
        Room room = roomService.getRoomById(roomId);
        if (room != null) {
            webSocketService.sendGameMessage(roomId, "ACTION", Map.of(
                "type", "DRAW",
                "playerEmail", userEmail,
                "remainingTiles", room.getCurrentGame().getRemainingTilesCount()
            ));
            
            // Send updated game state to each player
            for (String playerEmail : room.getPlayerEmails()) {
                Map<String, Object> gameState = gameService.getGameState(roomId, playerEmail);
                webSocketService.sendMessage(playerEmail, "GAME_STATE", gameState);
            }
        }
    }

    /**
     * Handle discard tile message
     */
    private void handleDiscardTile(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        JsonNode tileNode = data.get("tile");
        
        // Create tile object from JSON
        Tile tile = new Tile();
        tile.setType(Tile.TileType.valueOf(tileNode.get("type").asText()));
        tile.setValue(tileNode.get("value").asInt());
        tile.setId(tileNode.get("id").asInt());
        
        // Discard tile
        boolean discarded = gameService.discardTile(roomId, userEmail, tile);
        if (!discarded) {
            webSocketService.sendErrorMessage(userEmail, "DISCARD_FAILED", "Failed to discard tile");
            return;
        }
        
        // Notify all players about the action
        Room room = roomService.getRoomById(roomId);
        if (room != null) {
            webSocketService.sendGameMessage(roomId, "ACTION", Map.of(
                "type", "DISCARD",
                "playerEmail", userEmail,
                "tile", tile
            ));
            
            // Send updated game state to each player
            for (String playerEmail : room.getPlayerEmails()) {
                Map<String, Object> gameState = gameService.getGameState(roomId, playerEmail);
                webSocketService.sendMessage(playerEmail, "GAME_STATE", gameState);
            }
        }
    }

    /**
     * Handle take tile message
     */
    private void handleTakeTile(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        int tileId = data.get("tileId").asInt();
        
        // Take tile
        Tile takenTile = gameService.takeTile(roomId, userEmail, tileId);
        if (takenTile == null) {
            webSocketService.sendErrorMessage(userEmail, "TAKE_FAILED", "Failed to take tile");
            return;
        }
        
        // Notify all players about the action
        Room room = roomService.getRoomById(roomId);
        if (room != null) {
            webSocketService.sendGameMessage(roomId, "ACTION", Map.of(
                "type", "TAKE_TILE",
                "playerEmail", userEmail,
                "tileId", tileId,
                "tile", takenTile
            ));
            
            // Send updated game state to each player
            for (String playerEmail : room.getPlayerEmails()) {
                Map<String, Object> gameState = gameService.getGameState(roomId, playerEmail);
                webSocketService.sendMessage(playerEmail, "GAME_STATE", gameState);
            }
        }
    }

    /**
     * Handle reveal tiles message
     */
    private void handleRevealTiles(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        JsonNode tileIdsNode = data.get("tileIds");
        
        // Convert JSON array to List
        List<Integer> tileIds = new ArrayList<>();
        for (JsonNode idNode : tileIdsNode) {
            tileIds.add(idNode.asInt());
        }
        
        // Reveal tiles
        boolean revealed = gameService.revealTiles(roomId, userEmail, tileIds);
        if (!revealed) {
            webSocketService.sendErrorMessage(userEmail, "REVEAL_FAILED", "Failed to reveal tiles");
            return;
        }
        
        // Notify all players about the action
        Room room = roomService.getRoomById(roomId);
        if (room != null) {
            webSocketService.sendGameMessage(roomId, "ACTION", Map.of(
                "type", "REVEAL_TILES",
                "playerEmail", userEmail,
                "tileIds", tileIds
            ));
            
            // Send updated game state to each player
            for (String playerEmail : room.getPlayerEmails()) {
                Map<String, Object> gameState = gameService.getGameState(roomId, playerEmail);
                webSocketService.sendMessage(playerEmail, "GAME_STATE", gameState);
            }
        }
    }

    /**
     * Handle hide tiles message
     */
    private void handleHideTiles(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        JsonNode tileIdsNode = data.get("tileIds");
        
        // Convert JSON array to List
        List<Integer> tileIds = new ArrayList<>();
        for (JsonNode idNode : tileIdsNode) {
            tileIds.add(idNode.asInt());
        }
        
        // Hide tiles
        boolean hidden = gameService.hideTiles(roomId, userEmail, tileIds);
        if (!hidden) {
            webSocketService.sendErrorMessage(userEmail, "HIDE_FAILED", "Failed to hide tiles");
            return;
        }
        
        // Notify all players about the action
        Room room = roomService.getRoomById(roomId);
        if (room != null) {
            webSocketService.sendGameMessage(roomId, "ACTION", Map.of(
                "type", "HIDE_TILES",
                "playerEmail", userEmail,
                "tileIds", tileIds
            ));
            
            // Send updated game state to each player
            for (String playerEmail : room.getPlayerEmails()) {
                Map<String, Object> gameState = gameService.getGameState(roomId, playerEmail);
                webSocketService.sendMessage(playerEmail, "GAME_STATE", gameState);
            }
        }
    }

    /**
     * Handle claim win message
     */
    private void handleClaimWin(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        LOGGER.info("Handling CLAIM_WIN message from user: " + userEmail + " for room: " + roomId);
        
        // 检查房间是否存在
        Room room = roomService.getRoomById(roomId);
        if (room == null) {
            LOGGER.warning("Room not found: " + roomId);
            webSocketService.sendErrorMessage(userEmail, "CLAIM_FAILED", "房间不存在");
            return;
        }
        
        // 验证用户是否在房间中
        if (!room.getPlayerEmails().contains(userEmail)) {
            LOGGER.warning("User " + userEmail + " is not in room " + roomId);
            webSocketService.sendErrorMessage(userEmail, "CLAIM_FAILED", "您不在此房间中");
            return;
        }
        
        // 验证房间是否在游戏中
        if (room.getStatus() != Room.RoomStatus.PLAYING) {
            LOGGER.warning("Room " + roomId + " is not in playing state: " + room.getStatus());
            webSocketService.sendErrorMessage(userEmail, "CLAIM_FAILED", "房间不在游戏中");
            return;
        }
        
        // 声明胜利
        boolean claimed = gameService.claimVictory(roomId, userEmail);
        if (!claimed) {
            LOGGER.warning("Failed to claim victory for user: " + userEmail + " in room: " + roomId);
            webSocketService.sendErrorMessage(userEmail, "CLAIM_FAILED", "胜利声明失败");
            return;
        }
        
        LOGGER.info("Victory claim successful for user: " + userEmail + " in room: " + roomId);
        
        // 通知所有玩家有关操作
        webSocketService.sendGameMessage(roomId, "ACTION", Map.of(
            "type", "CLAIM_WIN",
            "playerEmail", userEmail
        ));
        
        // 向每个玩家发送更新的游戏状态
        for (String playerEmail : room.getPlayerEmails()) {
            Map<String, Object> gameState = gameService.getGameState(roomId, playerEmail);
            webSocketService.sendMessage(playerEmail, "GAME_STATE", gameState);
        }
    }

    /**
     * Handle confirm win message
     */
    private void handleConfirmWin(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        boolean confirm = data.get("confirm").asBoolean();
        
        // winnerEmail参数是可选的，前端可能不提供
        // 在这种情况下，我们依赖后端的winConfirmations映射来确定谁是声明胜利的玩家
        String winnerEmail = data.has("winnerEmail") ? data.get("winnerEmail").asText() : null;
        
        LOGGER.info("Handling CONFIRM_WIN message from user: " + userEmail + 
                   " for room: " + roomId + ", confirm: " + confirm + 
                   (winnerEmail != null ? ", winner: " + winnerEmail : ""));
        
        // 检查房间是否存在
        Room room = roomService.getRoomById(roomId);
        if (room == null) {
            LOGGER.warning("Room not found: " + roomId);
            webSocketService.sendErrorMessage(userEmail, "CONFIRM_FAILED", "房间不存在");
            return;
        }
        
        // 验证用户是否在房间中
        if (!room.getPlayerEmails().contains(userEmail)) {
            LOGGER.warning("User " + userEmail + " is not in room " + roomId);
            webSocketService.sendErrorMessage(userEmail, "CONFIRM_FAILED", "您不在此房间中");
            return;
        }
        
        // 验证房间是否在游戏中
        if (room.getStatus() != Room.RoomStatus.PLAYING) {
            LOGGER.warning("Room " + roomId + " is not in playing state: " + room.getStatus());
            webSocketService.sendErrorMessage(userEmail, "CONFIRM_FAILED", "房间不在游戏中");
            return;
        }
        
        // 确认或拒绝胜利
        boolean processed = gameService.confirmVictory(roomId, userEmail, confirm);
        if (!processed) {
            LOGGER.warning("Failed to process victory confirmation for user: " + userEmail + 
                          " in room: " + roomId + ", confirm: " + confirm);
            webSocketService.sendErrorMessage(userEmail, "CONFIRM_FAILED", 
                                             confirm ? "确认胜利失败" : "拒绝胜利失败");
            return;
        }
        
        LOGGER.info("Victory " + (confirm ? "confirmation" : "denial") + 
                   " successful for user: " + userEmail + " in room: " + roomId);
        
        // 通知所有玩家有关操作
        webSocketService.sendGameMessage(roomId, "ACTION", Map.of(
            "type", confirm ? "CONFIRM_WIN" : "DENY_WIN",
            "playerEmail", userEmail
        ));
        
        // 向每个玩家发送更新的游戏状态
        for (String playerEmail : room.getPlayerEmails()) {
            Map<String, Object> gameState = gameService.getGameState(roomId, playerEmail);
            webSocketService.sendMessage(playerEmail, "GAME_STATE", gameState);
        }
    }

    /**
     * Handle get game state message
     */
    private void handleGetGameState(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        String requestId = data.has("requestId") ? data.get("requestId").asText() : "unknown";
        
        LOGGER.info("Handling GET_GAME_STATE request for room: " + roomId + " from user: " + userEmail + ", requestId: " + requestId);
        
        // 检查这个用户是否已经在处理游戏状态请求
        String requestKey = userEmail + ":" + roomId;
        if (processingGameStateRequests.contains(requestKey)) {
            LOGGER.info("Already processing GET_GAME_STATE for user: " + userEmail + " in room: " + roomId + ", skipping");
            return;
        }
        
        // 标记用户正在处理游戏状态请求
        processingGameStateRequests.add(requestKey);
        
        try {
            // 重新检查用户会话是否仍然有效
            WebSocketSession session = sessionRepository.getSessionByUser(userEmail);
            if (session == null || !session.isOpen()) {
                LOGGER.warning("User session invalid or closed for: " + userEmail);
                return;
            }
            
            // Get game state
            Map<String, Object> gameState = gameService.getGameState(roomId, userEmail);
            if (gameState.isEmpty()) {
                LOGGER.warning("Failed to get game state for user: " + userEmail);
                webSocketService.sendErrorMessage(userEmail, "STATE_FAILED", "Failed to get game state");
                return;
            }
            
            // 确保包含房间ID
            if (!gameState.containsKey("roomId")) {
                gameState.put("roomId", roomId);
            }
            
            // 添加请求ID以便前端能够匹配请求和响应
            if (data.has("requestId")) {
                gameState.put("requestId", data.get("requestId").asText());
            }
            
            // Send game state to the player
            LOGGER.info("Sending game state to user: " + userEmail + ", state size: " + gameState.size() + " entries, requestId: " + requestId);
            boolean sent = webSocketService.sendMessage(userEmail, "GAME_STATE", gameState);
            
            if (!sent) {
                LOGGER.warning("Failed to send game state to user: " + userEmail + ", session may be invalid");
                // 尝试重新发送一次
                session = sessionRepository.getSessionByUser(userEmail);
                if (session != null && session.isOpen()) {
                    LOGGER.info("Retrying to send game state...");
                    webSocketService.sendMessage(userEmail, "GAME_STATE", gameState);
                }
            }
        } catch (Exception e) {
            LOGGER.severe("Error handling GET_GAME_STATE: " + e.getMessage());
            e.printStackTrace();
            webSocketService.sendErrorMessage(userEmail, "STATE_ERROR", "Error processing game state: " + e.getMessage());
        } finally {
            // 移除处理标记
            processingGameStateRequests.remove(requestKey);
        }
    }
} 