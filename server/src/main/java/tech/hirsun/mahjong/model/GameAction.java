package tech.hirsun.mahjong.model;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class GameAction {
    private User player;           // 执行操作的玩家
    private ActionType type;       // 操作类型
    private List<Tile> tiles;      // 相关的牌
    private Date timestamp;        // 操作时间戳

    public GameAction() {
        this.tiles = new ArrayList<>();
        this.timestamp = new Date();
    }

    public GameAction(User player, ActionType type) {
        this();
        this.player = player;
        this.type = type;
    }

    public GameAction(User player, ActionType type, List<Tile> tiles) {
        this(player, type);
        if (tiles != null) {
            this.tiles.addAll(tiles);
        }
    }

    public User getPlayer() {
        return player;
    }

    public void setPlayer(User player) {
        this.player = player;
    }

    public ActionType getType() {
        return type;
    }

    public void setType(ActionType type) {
        this.type = type;
    }

    public List<Tile> getTiles() {
        return tiles;
    }

    public void setTiles(List<Tile> tiles) {
        this.tiles = tiles;
    }

    public Date getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Date timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append(player.getNickname()).append(" ");
        
        switch (type) {
            case DRAW:
                sb.append("抽了").append(tiles.size()).append("张牌");
                break;
            case DISCARD:
                sb.append("打出了");
                for (Tile tile : tiles) {
                    sb.append(tile.toString()).append(" ");
                }
                break;
            case TAKE:
                sb.append("拿取了");
                for (Tile tile : tiles) {
                    sb.append(tile.toString()).append(" ");
                }
                break;
            case REVEAL:
                sb.append("明牌了");
                for (Tile tile : tiles) {
                    sb.append(tile.toString()).append(" ");
                }
                break;
            case DECLARE_WIN:
                sb.append("宣布胜利");
                break;
            case CONFIRM_WIN:
                sb.append("确认了胜利");
                break;
            case REJECT_WIN:
                sb.append("拒绝了胜利宣言");
                break;
            default:
                sb.append("执行了未知操作");
        }
        
        return sb.toString();
    }
} 