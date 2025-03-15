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
     * @return true if successful, false otherwise
     */
    public boolean takeTile(String roomId, String userEmail, int tileId) {
        Room room = roomRepository.findById(roomId);
        if (room == null || room.getStatus() != Room.RoomStatus.PLAYING || !room.getPlayerEmails().contains(userEmail)) {
            return false;
        }
        
        Game game = room.getCurrentGame();
        if (game == null || game.getStatus() != Game.GameStatus.IN_PROGRESS) {
            return false;
        }
        
        // Find tile in discard pile
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
            discardPile.remove(tileToTake);
            
            // Add tile to player's hand
            game.addTileToPlayerHand(userEmail, tileToTake);
            
            // Record action
            game.addAction(new GameAction(userEmail, GameAction.ActionType.TAKE_TILE, tileToTake));
            
            // Save room with updated game
            roomRepository.save(room);
            return true;
        }
        
        return false;
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
     * Claim victory
     * @param roomId Room ID
     * @param userEmail User's email
     * @return true if claim registered, false otherwise
     */
    public boolean claimVictory(String roomId, String userEmail) {
        Room room = roomRepository.findById(roomId);
        if (room == null || room.getStatus() != Room.RoomStatus.PLAYING || !room.getPlayerEmails().contains(userEmail)) {
            return false;
        }
        
        Game game = room.getCurrentGame();
        if (game == null || game.getStatus() != Game.GameStatus.IN_PROGRESS) {
            return false;
        }
        
        // Record action
        game.addAction(new GameAction(userEmail, GameAction.ActionType.CLAIM_WIN));
        
        // Initialize win confirmations for this room if not exists
        winConfirmations.computeIfAbsent(roomId, k -> new ConcurrentHashMap<>());
        
        // Reset all confirmations
        Map<String, Boolean> confirmations = winConfirmations.get(roomId);
        confirmations.clear();
        
        // Set all players to unconfirmed except the claimer
        for (String playerEmail : room.getPlayerEmails()) {
            if (!playerEmail.equals(userEmail)) {
                confirmations.put(playerEmail, false);
            }
        }
        
        // Save room with updated game
        roomRepository.save(room);
        
        // Notify all players about the claim
        webSocketService.sendGameMessage(roomId, "CLAIM_WIN", Map.of("playerEmail", userEmail));
        
        return true;
    }

    /**
     * Confirm or deny a victory claim
     * @param roomId Room ID
     * @param userEmail User's email
     * @param confirm true to confirm, false to deny
     * @return true if confirmation processed, false otherwise
     */
    public boolean confirmVictory(String roomId, String userEmail, boolean confirm) {
        Room room = roomRepository.findById(roomId);
        if (room == null || room.getStatus() != Room.RoomStatus.PLAYING || !room.getPlayerEmails().contains(userEmail)) {
            return false;
        }
        
        Game game = room.getCurrentGame();
        if (game == null || game.getStatus() != Game.GameStatus.IN_PROGRESS) {
            return false;
        }
        
        // Check if there are pending confirmations
        Map<String, Boolean> confirmations = winConfirmations.get(roomId);
        if (confirmations == null || !confirmations.containsKey(userEmail)) {
            return false;
        }
        
        // Record action
        GameAction.ActionType actionType = confirm ? GameAction.ActionType.CONFIRM_WIN : GameAction.ActionType.DENY_WIN;
        game.addAction(new GameAction(userEmail, actionType));
        
        // Update confirmation status
        confirmations.put(userEmail, confirm);
        
        // Check if all players have confirmed
        boolean allConfirmed = true;
        for (Boolean status : confirmations.values()) {
            if (!status) {
                allConfirmed = false;
                break;
            }
        }
        
        // If all confirmed, end the game with winner
        if (allConfirmed) {
            // Find the player who claimed victory (not in confirmations map)
            String winnerEmail = null;
            for (String playerEmail : room.getPlayerEmails()) {
                if (!confirmations.containsKey(playerEmail)) {
                    winnerEmail = playerEmail;
                    break;
                }
            }
            
            if (winnerEmail != null) {
                endGame(roomId, winnerEmail);
            }
        } else if (!confirm) {
            // If any player denies, clear confirmations
            confirmations.clear();
            winConfirmations.remove(roomId);
            
            // Notify all players about the denial
            webSocketService.sendGameMessage(roomId, "WIN_DENIED", Map.of("denier", userEmail));
        }
        
        // Save room with updated game
        roomRepository.save(room);
        
        return true;
    }

    /**
     * End a game
     * @param roomId Room ID
     * @param winnerEmail Email of the winner, or null for a draw
     */
    public void endGame(String roomId, String winnerEmail) {
        Room room = roomRepository.findById(roomId);
        if (room == null || room.getStatus() != Room.RoomStatus.PLAYING) {
            return;
        }
        
        Game game = room.getCurrentGame();
        if (game == null) {
            return;
        }
        
        // Set game end time and status
        game.setEndTime(LocalDateTime.now());
        game.setStatus(Game.GameStatus.FINISHED);
        
        // Set winner if provided
        if (winnerEmail != null) {
            game.setWinnerEmail(winnerEmail);
        }
        
        // Update room status
        room.setStatus(Room.RoomStatus.WAITING);
        
        // Save room with updated game
        roomRepository.save(room);
        
        // Clear win confirmations for this room
        winConfirmations.remove(roomId);
        
        // Notify all players about the game end
        Map<String, Object> data = new HashMap<>();
        data.put("winner", winnerEmail);
        data.put("isDraw", winnerEmail == null);
        webSocketService.sendGameMessage(roomId, "GAME_END", data);
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
            System.out.println("GameService.getGameState: Game is null");
            return Map.of();
        }
        
        Map<String, Object> state = new HashMap<>();
        
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
        
        // Discard pile
        state.put("discardPile", game.getDiscardPile());
        
        // Recent actions
        state.put("recentActions", game.getRecentActions(2));
        
        // Win status
        if (game.getStatus() == Game.GameStatus.FINISHED) {
            state.put("winner", game.getWinnerEmail());
            state.put("isDraw", game.getWinnerEmail() == null);
        }
        
        System.out.println("GameService.getGameState: Returning state for user: " + userEmail);
        return state;
    }
} 