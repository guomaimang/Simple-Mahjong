package tech.hirsun.project.mahjongserver.model;

import java.util.Objects;

public class Tile {
    private TileType type;
    private int value;
    private int id;

    public enum TileType {
        WAN,    // 万子
        TONG,   // 筒子
        TIAO,   // 条子
        FENG,   // 风牌 (东南西北)
        JIAN    // 箭牌 (中发白)
    }

    public Tile() {
    }

    public Tile(TileType type, int value, int id) {
        this.type = type;
        this.value = value;
        this.id = id;
    }

    public TileType getType() {
        return type;
    }

    public void setType(TileType type) {
        this.type = type;
    }

    public int getValue() {
        return value;
    }

    public void setValue(int value) {
        this.value = value;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getDisplayName() {
        StringBuilder name = new StringBuilder();
        
        switch (type) {
            case WAN:
                name.append(value).append("万");
                break;
            case TONG:
                name.append(value).append("筒");
                break;
            case TIAO:
                name.append(value).append("条");
                break;
            case FENG:
                switch (value) {
                    case 1: name.append("东风"); break;
                    case 2: name.append("南风"); break;
                    case 3: name.append("西风"); break;
                    case 4: name.append("北风"); break;
                }
                break;
            case JIAN:
                switch (value) {
                    case 1: name.append("红中"); break;
                    case 2: name.append("发财"); break;
                    case 3: name.append("白板"); break;
                }
                break;
        }
        
        return name.toString();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Tile tile = (Tile) o;
        return value == tile.value && id == tile.id && type == tile.type;
    }

    @Override
    public int hashCode() {
        return Objects.hash(type, value, id);
    }

    @Override
    public String toString() {
        return getDisplayName() + "(" + id + ")";
    }
} 