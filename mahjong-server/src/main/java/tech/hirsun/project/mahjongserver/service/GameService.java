package tech.hirsun.project.mahjongserver.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import tech.hirsun.project.mahjongserver.model.Game;
import tech.hirsun.project.mahjongserver.model.GameAction;
import tech.hirsun.project.mahjongserver.model.Room;
import tech.hirsun.project.mahjongserver.model.Tile;
import tech.hirsun.project.mahjongserver.repository.RoomRepository;
import tech.hirsun.project.mahjongserver.util.TileUtil;

@Service
public class GameService {

    @Autowired
    private RoomRepository roomRepository;
    
    @Autowired
    private WebSocketService webSocketService;
    
    // Store win confirmations by room ID
    private final Map<String, Map<String, Boolean>> winConfirmations = new ConcurrentHashMap<>();

    /**
     * Initialize a new game in a room
     * @param roomId Room ID
     * @return The initialized game
     */
    public Game initializeGame(String roomId) {
        Room room = roomRepository.findById(roomId);
        if (room == null || !room.canStartGame()) {
            return null;
        }
        
        List<String> playerEmails = room.getPlayerEmails();
        String dealerEmail = room.getCurrentGame() != null && room.getCurrentGame().getWinnerEmail() != null 
                ? room.getCurrentGame().getWinnerEmail() 
                : room.getCreatorEmail();
        
        // Create and initialize game
        Game game = new Game();
        game.initialize(roomId, playerEmails, dealerEmail);
        
        // Create and shuffle tiles
        List<Tile> tiles = TileUtil.shuffle(TileUtil.createFullSet());
        
        // Find dealer index
        int dealerIndex = playerEmails.indexOf(dealerEmail);
        
        // Deal tiles to players
        List<List<Tile>> playerHands = TileUtil.dealInitialTiles(tiles, playerEmails.size(), dealerIndex);
        
        // Set player hands
        for (int i = 0; i < playerEmails.size(); i++) {
            String email = playerEmails.get(i);
            List<Tile> hand = playerHands.get(i);
            for (Tile tile : hand) {
                game.addTileToPlayerHand(email, tile);
            }
        }
        
        // Set remaining tiles as draw pile
        game.setDrawPile(tiles);
        
        // Set game start time
        game.setStartTime(LocalDateTime.now());
        
        // Update room with new game
        room.setCurrentGame(game);
        room.setStatus(Room.RoomStatus.PLAYING);
        roomRepository.save(room);
        
        // Clear any previous win confirmations for this room
        winConfirmations.remove(roomId);
        
        return game;
    }

    /**
     * Draw a tile from the draw pile
     * @param roomId Room ID
     * @param userEmail User's email
     * @return The drawn tile, or null if no tiles left or user not in room
     */
    public Tile drawTile(String roomId, String userEmail) {
        Room room = roomRepository.findById(roomId);
        if (room == null || room.getStatus() != Room.RoomStatus.PLAYING || !room.getPlayerEmails().contains(userEmail)) {
            return null;
        }
        
        Game game = room.getCurrentGame();
        if (game == null || game.getStatus() != Game.GameStatus.IN_PROGRESS) {
            return null;
        }
        
        // Draw a tile
        Tile tile = game.drawTile();
        if (tile != null) {
            // Add tile to player's hand
            game.addTileToPlayerHand(userEmail, tile);
            
            // Record action
            game.addAction(new GameAction(userEmail, GameAction.ActionType.DRAW));
            
            // Check if game is over (no more tiles)
            if (game.getRemainingTilesCount() == 0) {
                endGame(roomId, null);
            }
            
            // Save room with updated game
            roomRepository.save(room);
        }
        
        return tile;
    }

    /**
     * Discard a tile from player's hand
     * @param roomId Room ID
     * @param userEmail User's email
     * @param tile Tile to discard
     * @return true if successful, false otherwise
     */
    public boolean discardTile(String roomId, String userEmail, Tile tile) {
        Room room = roomRepository.findById(roomId);
        if (room == null || room.getStatus() != Room.RoomStatus.PLAYING || !room.getPlayerEmails().contains(userEmail)) {
            return false;
        }
        
        Game game = room.getCurrentGame();
        if (game == null || game.getStatus() != Game.GameStatus.IN_PROGRESS) {
            return false;
        }
        
        // Remove tile from player's hand
        boolean removed = game.removeTileFromPlayerHand(userEmail, tile);
        if (removed) {
            // Add tile to discard pile
            game.discardTile(tile);
            
            // Record action
            game.addAction(new GameAction(userEmail, GameAction.ActionType.DISCARD, tile));
            
            // Save room with updated game
            roomRepository.save(room);
            return true;
        }
        
        return false;
    }

    /**
     * Take a tile from the discard pile
     * @param roomId Room ID
     * @param userEmail User's email
     * @param tileId ID of the tile to take
     * @return The taken tile, or null if not found or not in room
     */
    public Tile takeTile(String roomId, String userEmail, int tileId) {
        Room room = roomRepository.findById(roomId);
        if (room == null || room.getStatus() != Room.RoomStatus.PLAYING || !room.getPlayerEmails().contains(userEmail)) {
            return null;
        }
        
        Game game = room.getCurrentGame();
        if (game == null || game.getStatus() != Game.GameStatus.IN_PROGRESS) {
            return null;
        }
        
        // Find tile in discard pile - 需要在移除前找到牌对象，用于记录和添加到玩家手牌
        List<Tile> discardPile = game.getDiscardPile();
        Tile tileToTake = null;
        for (Tile tile : discardPile) {
            if (tile.getId() == tileId) {
                tileToTake = tile;
                break;
            }
        }
        
        if (tileToTake != null) {
            // Remove tile from discard pile
            boolean removed = game.removeTileFromDiscardPile(tileId);
            if (!removed) {
                return null;
            }
            
            // Add tile to player's hand
            game.addTileToPlayerHand(userEmail, tileToTake);
            
            // Record action
            game.addAction(new GameAction(userEmail, GameAction.ActionType.TAKE_TILE, tileToTake));
            
            // Save room with updated game
            roomRepository.save(room);
            return tileToTake;
        }
        
        return null;
    }

    /**
     * Reveal tiles from player's hand
     * @param roomId Room ID
     * @param userEmail User's email
     * @param tileIds IDs of tiles to reveal
     * @return true if successful, false otherwise
     */
    public boolean revealTiles(String roomId, String userEmail, List<Integer> tileIds) {
        Room room = roomRepository.findById(roomId);
        if (room == null || room.getStatus() != Room.RoomStatus.PLAYING || !room.getPlayerEmails().contains(userEmail)) {
            return false;
        }
        
        Game game = room.getCurrentGame();
        if (game == null || game.getStatus() != Game.GameStatus.IN_PROGRESS) {
            return false;
        }
        
        // Find tiles in player's hand
        List<Tile> playerHand = game.getPlayerHand(userEmail);
        List<Tile> tilesToReveal = new ArrayList<>();
        
        for (Integer tileId : tileIds) {
            for (Tile tile : playerHand) {
                if (tile.getId() == tileId) {
                    tilesToReveal.add(tile);
                    break;
                }
            }
        }
        
        if (!tilesToReveal.isEmpty()) {
            // Reveal tiles
            game.revealPlayerTiles(userEmail, tilesToReveal);
            
            // Record action
            game.addAction(new GameAction(userEmail, GameAction.ActionType.REVEAL_TILES, tilesToReveal));
            
            // Save room with updated game
            roomRepository.save(room);
            return true;
        }
        
        return false;
    }

    /**
     * Hide previously revealed tiles
     * @param roomId Room ID
     * @param userEmail User's email
     * @param tileIds IDs of tiles to hide
     * @return true if tiles hidden successfully, false otherwise
     */
    public boolean hideTiles(String roomId, String userEmail, List<Integer> tileIds) {
        Room room = roomRepository.findById(roomId);
        if (room == null || room.getStatus() != Room.RoomStatus.PLAYING || !room.getPlayerEmails().contains(userEmail)) {
            return false;
        }
        
        Game game = room.getCurrentGame();
        if (game == null || game.getStatus() != Game.GameStatus.IN_PROGRESS) {
            return false;
        }
        
        // Find tiles in player's revealed tiles
        List<Tile> revealedTiles = game.getPlayerRevealedTiles().getOrDefault(userEmail, new ArrayList<>());
        List<Tile> tilesToHide = new ArrayList<>();
        
        for (Integer tileId : tileIds) {
            for (Tile tile : revealedTiles) {
                if (tile.getId() == tileId) {
                    tilesToHide.add(tile);
                    break;
                }
            }
        }
        
        if (!tilesToHide.isEmpty()) {
            // Hide tiles
            game.hidePlayerTiles(userEmail, tilesToHide);
            
            // Record action
            game.addAction(new GameAction(userEmail, GameAction.ActionType.HIDE_TILES, tilesToHide));
            
            // Save room with updated game
            roomRepository.save(room);
            return true;
        }
        
        return false;
    }

    /**
     * Process a victory claim from a player
     * @param roomId Room ID
     * @param userEmail User's email who is claiming victory
     * @return true if claim processed successfully, false otherwise
     */
    public boolean claimVictory(String roomId, String userEmail) {
        System.out.println("Processing victory claim for room: " + roomId + ", from user: " + userEmail);
        
        // 验证房间和玩家
        Room room = roomRepository.findById(roomId);
        if (room == null) {
            System.err.println("Room not found: " + roomId);
            return false;
        }
        
        if (room.getStatus() != Room.RoomStatus.PLAYING) {
            System.err.println("Room " + roomId + " is not in PLAYING state. Current status: " + room.getStatus());
            return false;
        }
        
        if (!room.getPlayerEmails().contains(userEmail)) {
            System.err.println("User " + userEmail + " is not in room " + roomId);
            return false;
        }
        
        Game game = room.getCurrentGame();
        if (game == null) {
            System.err.println("Room " + roomId + " has no current game");
            return false;
        }
        
        if (game.getStatus() != Game.GameStatus.IN_PROGRESS) {
            System.err.println("Game in room " + roomId + " is not in progress. Current status: " + game.getStatus());
            return false;
        }
        
        // 记录胜利声明操作
        System.out.println("Recording CLAIM_WIN action for user: " + userEmail);
        game.addAction(new GameAction(userEmail, GameAction.ActionType.CLAIM_WIN));
        
        // 初始化或重置胜利确认映射
        winConfirmations.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>());
        Map<String, Boolean> confirmations = winConfirmations.get(roomId);
        confirmations.clear();
        
        // 设置所有其他玩家的确认状态为false（未确认）
        for (String playerEmail : room.getPlayerEmails()) {
            if (!playerEmail.equals(userEmail)) {
                confirmations.put(playerEmail, false);
                System.out.println("Setting confirmation status for player " + playerEmail + " to false");
            }
        }
        
        // 保存房间状态
        roomRepository.save(room);
        System.out.println("Room state saved after victory claim");
        
        // 获取宣告胜利玩家的所有牌信息（明牌和暗牌）
        List<Tile> handTiles = game.getPlayerHand(userEmail);
        List<Tile> revealedTiles = game.getPlayerRevealedTiles().getOrDefault(userEmail, new ArrayList<>());
        
        // 通知所有玩家有人声明胜利
        System.out.println("Sending WIN_CLAIM notification to all players in room " + roomId);
        Map<String, Object> claimData = new HashMap<>();
        claimData.put("claimerEmail", userEmail);
        claimData.put("timestamp", LocalDateTime.now().toString());
        
        // 添加牌信息
        claimData.put("handTiles", handTiles);
        claimData.put("revealedTiles", revealedTiles);
        
        webSocketService.sendGameMessage(roomId, "WIN_CLAIM", claimData);
        
        // 发送系统通知
        webSocketService.sendSystemNotification(roomId, userEmail + " 宣布胜利！请其他玩家确认或拒绝。");
        
        return true;
    }

    /**
     * Process a confirmation or denial of a victory claim
     * @param roomId Room ID
     * @param userEmail User's email who is confirming/denying
     * @param confirm true to confirm, false to deny
     * @return true if confirmation processed, false otherwise
     */
    public boolean confirmVictory(String roomId, String userEmail, boolean confirm) {
        System.out.println("Processing victory " + (confirm ? "confirmation" : "denial") + 
                          " for room: " + roomId + ", from user: " + userEmail);
        
        // 验证房间和玩家
        Room room = roomRepository.findById(roomId);
        if (room == null) {
            System.err.println("Room not found: " + roomId);
            return false;
        }
        
        if (room.getStatus() != Room.RoomStatus.PLAYING) {
            System.err.println("Room " + roomId + " is not in PLAYING state. Current status: " + room.getStatus());
            return false;
        }
        
        if (!room.getPlayerEmails().contains(userEmail)) {
            System.err.println("User " + userEmail + " is not in room " + roomId);
            return false;
        }
        
        Game game = room.getCurrentGame();
        if (game == null) {
            System.err.println("Room " + roomId + " has no current game");
            return false;
        }
        
        if (game.getStatus() != Game.GameStatus.IN_PROGRESS) {
            System.err.println("Game in room " + roomId + " is not in progress. Current status: " + game.getStatus());
            return false;
        }
        
        // 检查是否有等待确认的胜利声明
        Map<String, Boolean> confirmations = winConfirmations.get(roomId);
        if (confirmations == null) {
            System.err.println("No pending victory confirmations for room: " + roomId);
            return false;
        }
        
        if (!confirmations.containsKey(userEmail)) {
            System.err.println("User " + userEmail + " is not required to confirm victory in room " + roomId);
            return false;
        }
        
        // 记录确认/拒绝操作
        GameAction.ActionType actionType = confirm ? GameAction.ActionType.CONFIRM_WIN : GameAction.ActionType.DENY_WIN;
        System.out.println("Recording " + actionType + " action for user: " + userEmail);
        game.addAction(new GameAction(userEmail, actionType));
        
        // 更新确认状态
        confirmations.put(userEmail, confirm);
        System.out.println("Updated confirmation status for player " + userEmail + " to " + confirm);
        
        // 确认是否所有玩家都已确认
        boolean allConfirmed = true;
        for (Map.Entry<String, Boolean> entry : confirmations.entrySet()) {
            if (!entry.getValue()) {
                allConfirmed = false;
                System.out.println("Player " + entry.getKey() + " has not confirmed victory");
                break;
            }
        }
        
        // 查找声明胜利的玩家
        String claimerEmail = null;
        for (String playerEmail : room.getPlayerEmails()) {
            if (!confirmations.containsKey(playerEmail)) {
                claimerEmail = playerEmail;
                break;
            }
        }
        
        if (claimerEmail == null) {
            System.err.println("Unable to determine who claimed victory in room " + roomId);
            return false;
        }
        
        // 如果所有玩家都确认，游戏结束，宣布胜利者
        if (allConfirmed) {
            System.out.println("All players confirmed victory for " + claimerEmail + " in room " + roomId);
            endGame(roomId, claimerEmail);
            
            // 发送系统通知
            webSocketService.sendSystemNotification(roomId, claimerEmail + " 的胜利已被所有玩家确认！");
        } else if (!confirm) {
            // 如果任何玩家拒绝，清空确认状态，游戏继续
            System.out.println("Player " + userEmail + " denied victory for " + claimerEmail + " in room " + roomId);
            confirmations.clear();
            winConfirmations.remove(roomId);
            
            // 通知所有玩家有人拒绝确认胜利
            Map<String, Object> denyData = new HashMap<>();
            denyData.put("denier", userEmail);
            denyData.put("claimer", claimerEmail);
            denyData.put("timestamp", LocalDateTime.now().toString());
            webSocketService.sendGameMessage(roomId, "WIN_DENIED", denyData);
            
            // 发送系统通知
            webSocketService.sendSystemNotification(roomId, userEmail + " 拒绝了 " + claimerEmail + " 的胜利声明！游戏继续。");
        } else {
            // 部分玩家已确认，但还有玩家未确认
            System.out.println("Player " + userEmail + " confirmed victory for " + claimerEmail + 
                              " in room " + roomId + ", waiting for other players");
            
            // 发送系统通知
            webSocketService.sendSystemNotification(roomId, userEmail + " 确认了 " + claimerEmail + " 的胜利，等待其他玩家确认。");
        }
        
        // 保存房间状态
        roomRepository.save(room);
        System.out.println("Room state saved after processing victory confirmation");
        
        return true;
    }

    /**
     * End a game with a winner or as a draw
     * @param roomId Room ID
     * @param winnerEmail Email of the winner, or null for a draw
     */
    public void endGame(String roomId, String winnerEmail) {
        System.out.println("Ending game in room: " + roomId + ", winner: " + (winnerEmail != null ? winnerEmail : "DRAW"));
        
        Room room = roomRepository.findById(roomId);
        if (room == null) {
            System.err.println("Room not found: " + roomId);
            return;
        }
        
        if (room.getStatus() != Room.RoomStatus.PLAYING) {
            System.err.println("Room " + roomId + " is not in PLAYING state. Current status: " + room.getStatus());
            return;
        }
        
        Game game = room.getCurrentGame();
        if (game == null) {
            System.err.println("Room " + roomId + " has no current game");
            return;
        }
        
        // 设置游戏结束时间和状态
        game.setEndTime(LocalDateTime.now());
        game.setStatus(Game.GameStatus.FINISHED);
        
        // 设置胜利者（如果有）
        if (winnerEmail != null) {
            game.setWinnerEmail(winnerEmail);
            System.out.println("设置胜利者为: " + winnerEmail);
            
            // 添加胜利操作到历史记录
            game.addAction(new GameAction(winnerEmail, GameAction.ActionType.CLAIM_WIN, "游戏胜利"));
        } else {
            System.out.println("游戏以平局结束");
        }
        
        // 更新房间状态
        System.out.println("将房间状态从PLAYING更改为WAITING");
        room.setStatus(Room.RoomStatus.WAITING);
        
        // 保存房间状态
        roomRepository.save(room);
        System.out.println("游戏结束后房间状态已保存");
        
        // 确认状态已更新
        Room updatedRoom = roomRepository.findById(roomId);
        if (updatedRoom != null) {
            System.out.println("保存后的房间状态: " + updatedRoom.getStatus());
            System.out.println("保存后的游戏状态: " + 
                (updatedRoom.getCurrentGame() != null ? updatedRoom.getCurrentGame().getStatus() : "NULL"));
        } else {
            System.err.println("警告：无法在保存后找到房间");
        }
        
        // 清除该房间的胜利确认状态
        winConfirmations.remove(roomId);
        System.out.println("已清除房间 " + roomId + " 的胜利确认状态");
        
        // 通知所有玩家游戏结束
        Map<String, Object> data = new HashMap<>();
        data.put("winnerEmail", winnerEmail);
        data.put("isDraw", winnerEmail == null);
        data.put("roomId", roomId);
        data.put("timestamp", LocalDateTime.now().toString());
        webSocketService.sendGameMessage(roomId, "GAME_END", data);
        
        // 发送系统通知
        if (winnerEmail != null) {
            webSocketService.sendSystemNotification(roomId, "游戏结束！" + winnerEmail + " 获得了胜利！");
        } else {
            webSocketService.sendSystemNotification(roomId, "游戏结束！结果是平局。");
        }
        
        System.out.println("房间 " + roomId + " 的游戏结束通知已发送");
    }

    /**
     * Get recent actions in a game
     * @param roomId Room ID
     * @param count Number of recent actions to retrieve
     * @return List of recent actions
     */
    public List<GameAction> getRecentActions(String roomId, int count) {
        Room room = roomRepository.findById(roomId);
        if (room == null || room.getCurrentGame() == null) {
            return List.of();
        }
        
        return room.getCurrentGame().getRecentActions(count);
    }

    /**
     * Get game state for a player
     * @param roomId Room ID
     * @param userEmail User's email
     * @return Map containing game state information
     */
    public Map<String, Object> getGameState(String roomId, String userEmail) {
        Room room = roomRepository.findById(roomId);
        if (room == null) {
            System.out.println("GameService.getGameState: Room not found: " + roomId);
            return Map.of();
        }
        
        if (!room.getPlayerEmails().contains(userEmail)) {
            System.out.println("GameService.getGameState: User not in room: " + userEmail);
            return Map.of();
        }
        
        // 处理房间状态为PLAYING但游戏实例为null的情况
        if (room.getStatus() == Room.RoomStatus.PLAYING && room.getCurrentGame() == null) {
            System.out.println("GameService.getGameState: Room status is PLAYING but game is null, initializing game");
            Game game = initializeGame(roomId);
            if (game == null) {
                System.out.println("GameService.getGameState: Failed to initialize game");
                return Map.of();
            }
        }
        
        Game game = room.getCurrentGame();
        if (game == null) {
            // 如果游戏为null但房间状态不是PLAYING，返回空状态而不是空Map
            System.out.println("GameService.getGameState: Game is null, returning waiting state");
            Map<String, Object> waitingState = new HashMap<>();
            waitingState.put("roomId", roomId);
            waitingState.put("status", "WAITING");
            waitingState.put("playerPositions", Map.of());
            waitingState.put("hand", new ArrayList<>());
            waitingState.put("revealedTiles", Map.of());
            waitingState.put("discardPile", new ArrayList<>());
            waitingState.put("recentActions", new ArrayList<>());
            return waitingState;
        }
        
        Map<String, Object> state = new HashMap<>();
        
        try {
            // Basic game info
            state.put("roomId", roomId);
            state.put("status", game.getStatus().toString());
            state.put("remainingTiles", game.getRemainingTilesCount());
            state.put("dealerEmail", game.getDealerEmail());
            
            // Player positions
            state.put("playerPositions", game.getPlayerPositions());
            
            // Current player's hand
            state.put("hand", game.getPlayerHand(userEmail));
            
            // Revealed tiles for all players
            state.put("revealedTiles", game.getPlayerRevealedTiles());
            
            // 添加每个玩家的手牌数量信息
            Map<String, Integer> playerHandCounts = new HashMap<>();
            game.getPlayerHands().forEach((email, tiles) -> {
                playerHandCounts.put(email, tiles.size());
            });
            state.put("playerHandCounts", playerHandCounts);
            
            // Discard pile
            state.put("discardPile", game.getDiscardPile());
            
            // Recent actions
            state.put("recentActions", game.getRecentActions(20));
            
            // Win status
            if (game.getStatus() == Game.GameStatus.FINISHED) {
                state.put("winnerEmail", game.getWinnerEmail());
                state.put("isDraw", game.getWinnerEmail() == null);
            }
            
            // 添加胜利声明相关信息
            Map<String, Boolean> confirmations = winConfirmations.get(roomId);
            if (confirmations != null && !confirmations.isEmpty()) {
                // 查找声明胜利的玩家
                String claimerEmail = null;
                for (String playerEmail : room.getPlayerEmails()) {
                    if (!confirmations.containsKey(playerEmail)) {
                        claimerEmail = playerEmail;
                        break;
                    }
                }
                
                if (claimerEmail != null) {
                    state.put("pendingWinner", claimerEmail);
                    
                    // 添加确认状态
                    Map<String, Boolean> confirmationStatus = new HashMap<>(confirmations);
                    state.put("winConfirmations", confirmationStatus);
                }
            }
            
            System.out.println("GameService.getGameState: Returning state for user: " + userEmail + 
                    ", status: " + game.getStatus() + 
                    ", handSize: " + game.getPlayerHand(userEmail).size() + 
                    ", remainingTiles: " + game.getRemainingTilesCount());
        } catch (Exception e) {
            System.err.println("GameService.getGameState: Error building game state: " + e.getMessage());
            e.printStackTrace();
        }
        
        return state;
    }
} 