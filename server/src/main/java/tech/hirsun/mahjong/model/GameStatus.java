package tech.hirsun.mahjong.model;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Game {
    private Room room;                         // 所属房间
    private List<User> players;                // 参与游戏的玩家
    private Map<String, List<Tile>> playerTiles; // 玩家手牌 (key: 玩家邮箱)
    private List<Tile> discardedTiles;         // 已打出的牌
    private List<Tile> remainingTiles;         // 牌库中剩余的牌
    private User dealer;                       // 庄家
    private User winner;                       // 获胜者
    private List<GameAction> actions;          // 游戏操作记录
    private GameStatus status;                 // 游戏状态

    public Game() {
        this.players = new ArrayList<>();
        this.playerTiles = new HashMap<>();
        this.discardedTiles = new ArrayList<>();
        this.remainingTiles = new ArrayList<>();
        this.actions = new ArrayList<>();
        this.status = GameStatus.PREPARING;
    }

    public Game(Room room, List<User> players, User dealer) {
        this();
        this.room = room;
        this.players = new ArrayList<>(players);
        this.dealer = dealer;
        
        // 为每个玩家初始化手牌列表
        for (User player : players) {
            playerTiles.put(player.getEmail(), new ArrayList<>());
        }
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public List<User> getPlayers() {
        return players;
    }

    public void setPlayers(List<User> players) {
        this.players = players;
    }

    public Map<String, List<Tile>> getPlayerTiles() {
        return playerTiles;
    }

    public void setPlayerTiles(Map<String, List<Tile>> playerTiles) {
        this.playerTiles = playerTiles;
    }

    public List<Tile> getDiscardedTiles() {
        return discardedTiles;
    }

    public void setDiscardedTiles(List<Tile> discardedTiles) {
        this.discardedTiles = discardedTiles;
    }

    public List<Tile> getRemainingTiles() {
        return remainingTiles;
    }

    public void setRemainingTiles(List<Tile> remainingTiles) {
        this.remainingTiles = remainingTiles;
    }

    public User getDealer() {
        return dealer;
    }

    public void setDealer(User dealer) {
        this.dealer = dealer;
    }

    public User getWinner() {
        return winner;
    }

    public void setWinner(User winner) {
        this.winner = winner;
    }

    public List<GameAction> getActions() {
        return actions;
    }

    public void setActions(List<GameAction> actions) {
        this.actions = actions;
    }

    public GameStatus getStatus() {
        return status;
    }

    public void setStatus(GameStatus status) {
        this.status = status;
    }

    public void addAction(GameAction action) {
        this.actions.add(action);
    }

    public List<GameAction> getRecentActions(int count) {
        int size = actions.size();
        if (size <= count) {
            return new ArrayList<>(actions);
        }
        return new ArrayList<>(actions.subList(size - count, size));
    }

    public int getRemainingTileCount() {
        return remainingTiles.size();
    }

    public List<Tile> getPlayerTilesByEmail(String email) {
        return playerTiles.getOrDefault(email, new ArrayList<>());
    }

    public Map<String, List<Tile>> getRevealedTiles() {
        Map<String, List<Tile>> revealed = new HashMap<>();
        
        for (Map.Entry<String, List<Tile>> entry : playerTiles.entrySet()) {
            List<Tile> revealedTiles = new ArrayList<>();
            for (Tile tile : entry.getValue()) {
                if (tile.isRevealed()) {
                    revealedTiles.add(tile);
                }
            }
            if (!revealedTiles.isEmpty()) {
                revealed.put(entry.getKey(), revealedTiles);
            }
        }
        
        return revealed;
    }
}

public enum GameStatus {
    PREPARING,  // 准备中
    IN_PROGRESS, // 进行中
    FINISHED    // 已结束
} 