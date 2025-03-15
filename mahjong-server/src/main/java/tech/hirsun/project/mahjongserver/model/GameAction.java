package tech.hirsun.project.mahjongserver.model;

import java.time.LocalDateTime;

public class GameAction {
    private String playerEmail;
    private ActionType type;
    private Object data;
    private LocalDateTime timestamp;

    public enum ActionType {
        DRAW,          // Draw a tile from pile
        DISCARD,       // Discard a tile
        TAKE_TILE,     // Take a tile from discard pile
        REVEAL_TILES,  // Reveal tiles
        CLAIM_WIN,     // Claim victory
        CONFIRM_WIN,   // Confirm another player's win
        DENY_WIN       // Deny another player's win
    }

    public GameAction() {
        this.timestamp = LocalDateTime.now();
    }

    public GameAction(String playerEmail, ActionType type) {
        this.playerEmail = playerEmail;
        this.type = type;
        this.timestamp = LocalDateTime.now();
    }

    public GameAction(String playerEmail, ActionType type, Object data) {
        this.playerEmail = playerEmail;
        this.type = type;
        this.data = data;
        this.timestamp = LocalDateTime.now();
    }

    public String getPlayerEmail() {
        return playerEmail;
    }

    public void setPlayerEmail(String playerEmail) {
        this.playerEmail = playerEmail;
    }

    public ActionType getType() {
        return type;
    }

    public void setType(ActionType type) {
        this.type = type;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "GameAction{" +
                "playerEmail='" + playerEmail + '\'' +
                ", type=" + type +
                ", timestamp=" + timestamp +
                '}';
    }
} 