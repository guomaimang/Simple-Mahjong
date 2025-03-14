package tech.hirsun.mahjong.model;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class Room {
    private int roomId;            // 房间号(1-999)
    private String password;       // 房间密码(4位数字)
    private User creator;          // 房间创建者
    private List<User> players;    // 房间内的玩家
    private Date createdTime;      // 创建时间
    private Date expiryTime;       // 过期时间(创建后24小时)
    private Game currentGame;      // 当前游戏
    private boolean gameInProgress; // 游戏是否进行中

    public Room() {
        this.players = new ArrayList<>();
        this.createdTime = new Date();
        // 设置过期时间为创建时间后24小时
        this.expiryTime = new Date(createdTime.getTime() + 24 * 60 * 60 * 1000);
        this.gameInProgress = false;
    }

    public Room(int roomId, String password, User creator) {
        this();
        this.roomId = roomId;
        this.password = password;
        this.creator = creator;
        this.players.add(creator);
    }

    public int getRoomId() {
        return roomId;
    }

    public void setRoomId(int roomId) {
        this.roomId = roomId;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public User getCreator() {
        return creator;
    }

    public void setCreator(User creator) {
        this.creator = creator;
    }

    public List<User> getPlayers() {
        return players;
    }

    public void setPlayers(List<User> players) {
        this.players = players;
    }

    public Date getCreatedTime() {
        return createdTime;
    }

    public void setCreatedTime(Date createdTime) {
        this.createdTime = createdTime;
    }

    public Date getExpiryTime() {
        return expiryTime;
    }

    public void setExpiryTime(Date expiryTime) {
        this.expiryTime = expiryTime;
    }

    public Game getCurrentGame() {
        return currentGame;
    }

    public void setCurrentGame(Game currentGame) {
        this.currentGame = currentGame;
    }

    public boolean isGameInProgress() {
        return gameInProgress;
    }

    public void setGameInProgress(boolean gameInProgress) {
        this.gameInProgress = gameInProgress;
    }

    public boolean addPlayer(User player) {
        // 如果房间已满或玩家已在房间中，则返回false
        if (players.size() >= 4 || players.contains(player)) {
            return false;
        }
        players.add(player);
        return true;
    }

    public boolean removePlayer(User player) {
        return players.remove(player);
    }

    public boolean isExpired() {
        return new Date().after(expiryTime);
    }

    public boolean isCreator(User user) {
        return creator.equals(user);
    }

    public int getPlayerCount() {
        return players.size();
    }
} 