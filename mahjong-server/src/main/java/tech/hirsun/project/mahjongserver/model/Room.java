package tech.hirsun.project.mahjongserver.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CopyOnWriteArrayList;

import lombok.Data;

@Data
public class Room {
    private String roomId;
    private String password;
    private LocalDateTime creationTime;
    private String creatorEmail;
    private List<String> playerEmails;
    private Game currentGame;
    private RoomStatus status;

    public enum RoomStatus {
        WAITING, // Waiting for players to join
        PLAYING, // Game in progress
        FINISHED // Game ended
    }

    public Room() {
        this.playerEmails = new CopyOnWriteArrayList<>();
        this.creationTime = LocalDateTime.now();
        this.status = RoomStatus.WAITING;
    }

    public Room(String roomId, String password, String creatorEmail) {
        this.roomId = roomId;
        this.password = password;
        this.creatorEmail = creatorEmail;
        this.playerEmails = new CopyOnWriteArrayList<>();
        this.playerEmails.add(creatorEmail);
        this.creationTime = LocalDateTime.now();
        this.status = RoomStatus.WAITING;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(creationTime.plusHours(24));
    }

    public boolean canStartGame() {
        return playerEmails.size() >= 2 && status == RoomStatus.WAITING;
    }

    public boolean canJoin() {
        return playerEmails.size() < 4 && status == RoomStatus.WAITING && !isExpired();
    }

    public List<String> getPlayerEmails() {
        return new ArrayList<>(playerEmails);
    }

    public void addPlayer(String playerEmail) {
        if (!playerEmails.contains(playerEmail)) {
            playerEmails.add(playerEmail);
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Room room = (Room) o;
        return Objects.equals(roomId, room.roomId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(roomId);
    }

    @Override
    public String toString() {
        return "Room{" +
                "roomId='" + roomId + '\'' +
                ", creationTime=" + creationTime +
                ", playerCount=" + playerEmails.size() +
                ", status=" + status +
                '}';
    }
} 