package tech.hirsun.project.mahjongserver.model;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class GameAction {
    private String playerEmail;
    private ActionType type;
    private Object data;
    private LocalDateTime timestamp = LocalDateTime.now();

    public enum ActionType {
        DRAW,          // Draw a tile from pile
        DISCARD,       // Discard a tile
        TAKE_TILE,     // Take a tile from discard pile
        REVEAL_TILES,  // Reveal tiles
        HIDE_TILES,    // Hide previously revealed tiles
        CLAIM_WIN,     // Claim victory
        CONFIRM_WIN,   // Confirm another player's win
        DENY_WIN       // Deny another player's win
    }

    public GameAction(String playerEmail, ActionType type) {
        this.playerEmail = playerEmail;
        this.type = type;
    }

    public GameAction(String playerEmail, ActionType type, Object data) {
        this.playerEmail = playerEmail;
        this.type = type;
        this.data = data;
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