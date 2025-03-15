package tech.hirsun.project.mahjongserver.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

public class Game {
    private String roomId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String dealerEmail;
    private List<Tile> drawPile;
    private List<Tile> discardPile;
    private Map<String, List<Tile>> playerHands;
    private Map<String, List<Tile>> playerRevealedTiles;
    private Map<String, Integer> playerPositions;
    private List<GameAction> actionHistory;
    private GameStatus status;
    private String winnerEmail;

    public enum GameStatus {
        WAITING,
        IN_PROGRESS,
        FINISHED
    }

    public Game() {
        this.startTime = LocalDateTime.now();
        this.drawPile = new CopyOnWriteArrayList<>();
        this.discardPile = new CopyOnWriteArrayList<>();
        this.playerHands = new ConcurrentHashMap<>();
        this.playerRevealedTiles = new ConcurrentHashMap<>();
        this.playerPositions = new ConcurrentHashMap<>();
        this.actionHistory = new CopyOnWriteArrayList<>();
        this.status = GameStatus.WAITING;
    }

    public void initialize(String roomId, List<String> playerEmails, String dealerEmail) {
        this.roomId = roomId;
        this.dealerEmail = dealerEmail;
        this.status = GameStatus.IN_PROGRESS;
        
        // Assign positions
        for (int i = 0; i < playerEmails.size(); i++) {
            playerPositions.put(playerEmails.get(i), i);
            playerHands.put(playerEmails.get(i), new ArrayList<>());
            playerRevealedTiles.put(playerEmails.get(i), new ArrayList<>());
        }
    }

    public int getRemainingTilesCount() {
        return drawPile.size();
    }

    public List<GameAction> getRecentActions(int count) {
        if (actionHistory.size() <= count) {
            return new ArrayList<>(actionHistory);
        }
        return new ArrayList<>(actionHistory.subList(actionHistory.size() - count, actionHistory.size()));
    }

    // Add a new action to the history
    public void addAction(GameAction action) {
        actionHistory.add(action);
    }

    // Get player's hand
    public List<Tile> getPlayerHand(String playerEmail) {
        return playerHands.getOrDefault(playerEmail, new ArrayList<>());
    }

    // Add a tile to player's hand
    public void addTileToPlayerHand(String playerEmail, Tile tile) {
        playerHands.computeIfAbsent(playerEmail, k -> new ArrayList<>()).add(tile);
    }

    // Remove a tile from player's hand
    public boolean removeTileFromPlayerHand(String playerEmail, Tile tile) {
        return playerHands.getOrDefault(playerEmail, new ArrayList<>()).remove(tile);
    }

    // Draw a tile from the draw pile
    public Tile drawTile() {
        if (drawPile.isEmpty()) {
            return null;
        }
        return drawPile.remove(0);
    }

    // Discard a tile to the discard pile
    public void discardTile(Tile tile) {
        discardPile.add(tile);
    }

    // Reveal player's tiles
    public void revealPlayerTiles(String playerEmail, List<Tile> tiles) {
        playerRevealedTiles.computeIfAbsent(playerEmail, k -> new ArrayList<>()).addAll(tiles);
        playerHands.getOrDefault(playerEmail, new ArrayList<>()).removeAll(tiles);
    }

    // Getters and Setters
    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public String getDealerEmail() {
        return dealerEmail;
    }

    public void setDealerEmail(String dealerEmail) {
        this.dealerEmail = dealerEmail;
    }

    public List<Tile> getDrawPile() {
        return new ArrayList<>(drawPile);
    }

    public void setDrawPile(List<Tile> drawPile) {
        this.drawPile = new CopyOnWriteArrayList<>(drawPile);
    }

    public List<Tile> getDiscardPile() {
        return new ArrayList<>(discardPile);
    }

    public Map<String, List<Tile>> getPlayerHands() {
        Map<String, List<Tile>> result = new HashMap<>();
        playerHands.forEach((email, tiles) -> result.put(email, new ArrayList<>(tiles)));
        return result;
    }

    public Map<String, List<Tile>> getPlayerRevealedTiles() {
        Map<String, List<Tile>> result = new HashMap<>();
        playerRevealedTiles.forEach((email, tiles) -> result.put(email, new ArrayList<>(tiles)));
        return result;
    }

    public Map<String, Integer> getPlayerPositions() {
        return new HashMap<>(playerPositions);
    }

    public void setPlayerPositions(Map<String, Integer> playerPositions) {
        this.playerPositions = new ConcurrentHashMap<>(playerPositions);
    }

    public GameStatus getStatus() {
        return status;
    }

    public void setStatus(GameStatus status) {
        this.status = status;
    }

    public String getWinnerEmail() {
        return winnerEmail;
    }

    public void setWinnerEmail(String winnerEmail) {
        this.winnerEmail = winnerEmail;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Game game = (Game) o;
        return Objects.equals(roomId, game.roomId) && Objects.equals(startTime, game.startTime);
    }

    @Override
    public int hashCode() {
        return Objects.hash(roomId, startTime);
    }
} 