package tech.hirsun.project.mahjongserver.model;

import java.util.Objects;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
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