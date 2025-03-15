package tech.hirsun.mahjong.model;

import java.util.Objects;

public class Tile {
    private TileType type;         // 牌类型(万子、筒子、条子、风牌、箭牌)
    private int value;             // 牌值(1-9或东南西北中发白)
    private boolean revealed;      // 是否明牌

    public Tile() {
    }

    public Tile(TileType type, int value) {
        this.type = type;
        this.value = value;
        this.revealed = false;
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

    public boolean isRevealed() {
        return revealed;
    }

    public void setRevealed(boolean revealed) {
        this.revealed = revealed;
    }

    @Override
    public String toString() {
        String valueStr;
        if (type == TileType.FENG) {
            switch (value) {
                case 1: valueStr = "东"; break;
                case 2: valueStr = "南"; break;
                case 3: valueStr = "西"; break;
                case 4: valueStr = "北"; break;
                default: valueStr = String.valueOf(value);
            }
        } else if (type == TileType.JIAN) {
            switch (value) {
                case 1: valueStr = "中"; break;
                case 2: valueStr = "发"; break;
                case 3: valueStr = "白"; break;
                default: valueStr = String.valueOf(value);
            }
        } else {
            valueStr = String.valueOf(value);
        }

        String typeStr;
        switch (type) {
            case WAN: typeStr = "万"; break;
            case TONG: typeStr = "筒"; break;
            case TIAO: typeStr = "条"; break;
            case FENG: typeStr = ""; break;
            case JIAN: typeStr = ""; break;
            default: typeStr = "";
        }

        return valueStr + typeStr;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Tile tile = (Tile) o;
        return value == tile.value && type == tile.type;
    }

    @Override
    public int hashCode() {
        return Objects.hash(type, value);
    }
} 