package tech.hirsun.mahjong.controller;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import tech.hirsun.mahjong.model.*;
import tech.hirsun.mahjong.service.AuthService;
import tech.hirsun.mahjong.service.GameService;
import tech.hirsun.mahjong.service.RoomService;

import java.security.Principal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
public class WebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final AuthService authService;
    private final RoomService roomService;
    private final GameService gameService;

    public WebSocketController(SimpMessagingTemplate messagingTemplate,
                              AuthService authService,
                              RoomService roomService,
                              GameService gameService) {
        this.messagingTemplate = messagingTemplate;
        this.authService = authService;
        this.roomService = roomService;
        this.gameService = gameService;
    }

    /**
     * 开始游戏
     */
    @MessageMapping("/game/{roomId}/start")
    public void startGame(@DestinationVariable int roomId, Principal principal) {
        User user = authService.findByEmail(principal.getName());
        Room room = roomService.getRoomById(roomId);
        
        if (user == null || room == null) {
            sendErrorMessage(principal.getName(), "无效的用户或房间");
            return;
        }
        
        if (!room.isCreator(user)) {
            sendErrorMessage(principal.getName(), "只有房间创建者可以开始游戏");
            return;
        }
        
        if (room.getPlayers().size() < 2) {
            sendErrorMessage(principal.getName(), "至少需要2名玩家才能开始游戏");
            return;
        }
        
        Game game = gameService.startGame(roomId, user);
        
        if (game == null) {
            sendErrorMessage(principal.getName(), "开始游戏失败");
            return;
        }
        
        // 通知所有玩家游戏开始
        notifyGameStart(room, game);
    }

    /**
     * 执行游戏操作
     */
    @MessageMapping("/game/{roomId}/action")
    public void performAction(@DestinationVariable int roomId,
                             @Payload Map<String, Object> payload,
                             Principal principal) {
        User user = authService.findByEmail(principal.getName());
        Room room = roomService.getRoomById(roomId);
        
        if (user == null || room == null || !room.isGameInProgress()) {
            sendErrorMessage(principal.getName(), "无效的用户或房间，或游戏未进行");
            return;
        }
        
        if (!roomService.isUserInRoom(roomId, user)) {
            sendErrorMessage(principal.getName(), "您不在该房间中");
            return;
        }
        
        String actionType = (String) payload.get("action");
        List<Map<String, Object>> tilesData = (List<Map<String, Object>>) payload.get("tiles");
        
        if (actionType == null) {
            sendErrorMessage(principal.getName(), "操作类型不能为空");
            return;
        }
        
        // 转换操作类型
        ActionType type;
        try {
            type = ActionType.valueOf(actionType);
        } catch (IllegalArgumentException e) {
            sendErrorMessage(principal.getName(), "无效的操作类型");
            return;
        }
        
        // 转换牌数据
        List<Tile> tiles = new ArrayList<>();
        if (tilesData != null) {
            for (Map<String, Object> tileData : tilesData) {
                String tileType = (String) tileData.get("type");
                Integer value = (Integer) tileData.get("value");
                
                if (tileType == null || value == null) {
                    sendErrorMessage(principal.getName(), "牌数据格式错误");
                    return;
                }
                
                try {
                    TileType type = TileType.valueOf(tileType);
                    tiles.add(new Tile(type, value));
                } catch (IllegalArgumentException e) {
                    sendErrorMessage(principal.getName(), "无效的牌类型");
                    return;
                }
            }
        }
        
        // 创建游戏操作
        GameAction action = new GameAction(user, type, tiles);
        
        // 执行操作
        Game game = gameService.performAction(roomId, action);
        
        if (game == null) {
            sendErrorMessage(principal.getName(), "执行操作失败");
            return;
        }
        
        // 通知所有玩家游戏操作
        notifyGameAction(room, action);
        
        // 更新游戏状态
        updateGameState(room);
        
        // 如果游戏结束，通知所有玩家
        if (game.getStatus() == GameStatus.FINISHED) {
            notifyGameEnd(room, game);
        }
    }

    /**
     * 通知游戏开始
     */
    private void notifyGameStart(Room room, Game game) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "GAME_START");
        
        Map<String, Object> data = new HashMap<>();
        data.put("roomId", room.getRoomId());
        
        List<Map<String, Object>> players = new ArrayList<>();
        for (int i = 0; i < game.getPlayers().size(); i++) {
            User player = game.getPlayers().get(i);
            Map<String, Object> playerData = new HashMap<>();
            playerData.put("email", player.getEmail());
            playerData.put("nickname", player.getNickname());
            playerData.put("position", i + 1);
            players.add(playerData);
        }
        data.put("players", players);
        
        Map<String, Object> dealerData = new HashMap<>();
        dealerData.put("email", game.getDealer().getEmail());
        dealerData.put("nickname", game.getDealer().getNickname());
        data.put("dealer", dealerData);
        
        data.put("remainingTileCount", game.getRemainingTileCount());
        
        message.put("data", data);
        
        // 发送给所有玩家
        for (User player : room.getPlayers()) {
            // 为每个玩家添加其手牌信息
            Map<String, Object> playerMessage = new HashMap<>(message);
            Map<String, Object> playerData = new HashMap<>(data);
            
            List<String> tiles = new ArrayList<>();
            for (Tile tile : game.getPlayerTilesByEmail(player.getEmail())) {
                tiles.add(tile.toString());
            }
            playerData.put("tiles", tiles);
            
            playerMessage.put("data", playerData);
            
            messagingTemplate.convertAndSendToUser(
                player.getEmail(),
                "/topic/game",
                playerMessage
            );
        }
    }

    /**
     * 通知游戏操作
     */
    private void notifyGameAction(Room room, GameAction action) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "GAME_ACTION");
        
        Map<String, Object> data = new HashMap<>();
        data.put("roomId", room.getRoomId());
        
        Map<String, Object> playerData = new HashMap<>();
        playerData.put("email", action.getPlayer().getEmail());
        playerData.put("nickname", action.getPlayer().getNickname());
        data.put("player", playerData);
        
        data.put("action", action.getType().name());
        
        List<String> tiles = new ArrayList<>();
        for (Tile tile : action.getTiles()) {
            tiles.add(tile.toString());
        }
        data.put("tiles", tiles);
        
        data.put("timestamp", action.getTimestamp());
        
        message.put("data", data);
        
        // 发送给所有玩家
        for (User player : room.getPlayers()) {
            messagingTemplate.convertAndSendToUser(
                player.getEmail(),
                "/topic/game",
                message
            );
        }
    }

    /**
     * 更新游戏状态
     */
    private void updateGameState(Room room) {
        Game game = room.getCurrentGame();
        
        if (game == null) {
            return;
        }
        
        // 为每个玩家发送游戏状态
        for (User player : room.getPlayers()) {
            Map<String, Object> state = gameService.getGameState(room.getRoomId(), player);
            
            if (state != null) {
                Map<String, Object> message = new HashMap<>();
                message.put("type", "GAME_STATE");
                message.put("data", state);
                
                messagingTemplate.convertAndSendToUser(
                    player.getEmail(),
                    "/topic/game",
                    message
                );
            }
        }
    }

    /**
     * 通知游戏结束
     */
    private void notifyGameEnd(Room room, Game game) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "GAME_END");
        
        Map<String, Object> data = new HashMap<>();
        data.put("roomId", room.getRoomId());
        
        if (game.getWinner() != null) {
            Map<String, Object> winnerData = new HashMap<>();
            winnerData.put("email", game.getWinner().getEmail());
            winnerData.put("nickname", game.getWinner().getNickname());
            data.put("winner", winnerData);
        } else {
            data.put("draw", true);
        }
        
        // 所有玩家的牌
        Map<String, List<String>> allTiles = new HashMap<>();
        for (User player : game.getPlayers()) {
            List<String> tiles = new ArrayList<>();
            for (Tile tile : game.getPlayerTilesByEmail(player.getEmail())) {
                tiles.add(tile.toString());
            }
            allTiles.put(player.getEmail(), tiles);
        }
        data.put("allTiles", allTiles);
        
        message.put("data", data);
        
        // 发送给所有玩家
        for (User player : room.getPlayers()) {
            messagingTemplate.convertAndSendToUser(
                player.getEmail(),
                "/topic/game",
                message
            );
        }
    }

    /**
     * 发送错误消息
     */
    private void sendErrorMessage(String email, String errorMessage) {
        Map<String, Object> message = new HashMap<>();
        message.put("type", "ERROR");
        message.put("message", errorMessage);
        
        messagingTemplate.convertAndSendToUser(
            email,
            "/topic/error",
            message
        );
    }
} 