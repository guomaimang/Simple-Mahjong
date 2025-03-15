package tech.hirsun.project.mahjongserver.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

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

    private final ObjectMapper objectMapper = new ObjectMapper();

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
        Room room = roomService.getRoomById(roomId);
        if (room == null) {
            LOGGER.warning("Room not found: " + roomId);
            webSocketService.sendErrorMessage(userEmail, "ROOM_NOT_FOUND", "Room not found");
            return;
        }
        
        if (!room.getCreatorEmail().equals(userEmail)) {
            LOGGER.warning("User " + userEmail + " is not the creator of room " + roomId);
            webSocketService.sendErrorMessage(userEmail, "NOT_CREATOR", "Only the room creator can start the game");
            return;
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
        boolean taken = gameService.takeTile(roomId, userEmail, tileId);
        if (!taken) {
            webSocketService.sendErrorMessage(userEmail, "TAKE_FAILED", "Failed to take tile");
            return;
        }
        
        // Notify all players about the action
        Room room = roomService.getRoomById(roomId);
        if (room != null) {
            webSocketService.sendGameMessage(roomId, "ACTION", Map.of(
                "type", "TAKE_TILE",
                "playerEmail", userEmail,
                "tileId", tileId
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
     * Handle claim win message
     */
    private void handleClaimWin(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        
        // Claim victory
        boolean claimed = gameService.claimVictory(roomId, userEmail);
        if (!claimed) {
            webSocketService.sendErrorMessage(userEmail, "CLAIM_FAILED", "Failed to claim victory");
            return;
        }
        
        // Notify all players about the action
        Room room = roomService.getRoomById(roomId);
        if (room != null) {
            webSocketService.sendGameMessage(roomId, "ACTION", Map.of(
                "type", "CLAIM_WIN",
                "playerEmail", userEmail
            ));
            
            // Send updated game state to each player
            for (String playerEmail : room.getPlayerEmails()) {
                Map<String, Object> gameState = gameService.getGameState(roomId, playerEmail);
                webSocketService.sendMessage(playerEmail, "GAME_STATE", gameState);
            }
        }
    }

    /**
     * Handle confirm win message
     */
    private void handleConfirmWin(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        boolean confirm = data.get("confirm").asBoolean();
        
        // Confirm or deny victory
        boolean processed = gameService.confirmVictory(roomId, userEmail, confirm);
        if (!processed) {
            webSocketService.sendErrorMessage(userEmail, "CONFIRM_FAILED", "Failed to process confirmation");
            return;
        }
        
        // Notify all players about the action
        Room room = roomService.getRoomById(roomId);
        if (room != null) {
            webSocketService.sendGameMessage(roomId, "ACTION", Map.of(
                "type", confirm ? "CONFIRM_WIN" : "DENY_WIN",
                "playerEmail", userEmail
            ));
            
            // Send updated game state to each player
            for (String playerEmail : room.getPlayerEmails()) {
                Map<String, Object> gameState = gameService.getGameState(roomId, playerEmail);
                webSocketService.sendMessage(playerEmail, "GAME_STATE", gameState);
            }
        }
    }

    /**
     * Handle get game state message
     */
    private void handleGetGameState(String userEmail, JsonNode data) {
        String roomId = data.get("roomId").asText();
        
        // Get game state
        Map<String, Object> gameState = gameService.getGameState(roomId, userEmail);
        if (gameState.isEmpty()) {
            webSocketService.sendErrorMessage(userEmail, "STATE_FAILED", "Failed to get game state");
            return;
        }
        
        // 确保包含房间ID
        if (!gameState.containsKey("roomId")) {
            gameState.put("roomId", roomId);
        }
        
        // Send game state to the player
        webSocketService.sendMessage(userEmail, "GAME_STATE", gameState);
    }
} 