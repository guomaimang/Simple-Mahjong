package tech.hirsun.mahjong.util;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import tech.hirsun.mahjong.model.Tile;
import tech.hirsun.mahjong.model.TileType;

public class TileUtil {

    /**
     * 生成一副完整的麻将牌（136张）
     * @return 洗好的麻将牌列表
     */
    public static List<Tile> generateTiles() {
        List<Tile> tiles = new ArrayList<>();
        
        // 添加万子牌 (1-9万，每种4张)
        for (int i = 1; i <= 9; i++) {
            for (int j = 0; j < 4; j++) {
                tiles.add(new Tile(TileType.WAN, i));
            }
        }
        
        // 添加筒子牌 (1-9筒，每种4张)
        for (int i = 1; i <= 9; i++) {
            for (int j = 0; j < 4; j++) {
                tiles.add(new Tile(TileType.TONG, i));
            }
        }
        
        // 添加条子牌 (1-9条，每种4张)
        for (int i = 1; i <= 9; i++) {
            for (int j = 0; j < 4; j++) {
                tiles.add(new Tile(TileType.TIAO, i));
            }
        }
        
        // 添加风牌 (东南西北，每种4张)
        for (int i = 1; i <= 4; i++) {
            for (int j = 0; j < 4; j++) {
                tiles.add(new Tile(TileType.FENG, i));
            }
        }
        
        // 添加箭牌 (中发白，每种4张)
        for (int i = 1; i <= 3; i++) {
            for (int j = 0; j < 4; j++) {
                tiles.add(new Tile(TileType.JIAN, i));
            }
        }
        
        // 洗牌
        Collections.shuffle(tiles);
        
        return tiles;
    }
    
    /**
     * 将牌转换为字符串表示
     * @param tile 麻将牌
     * @return 牌的字符串表示
     */
    public static String tileToString(Tile tile) {
        return tile.toString();
    }
    
    /**
     * 将牌列表转换为字符串表示列表
     * @param tiles 麻将牌列表
     * @return 牌的字符串表示列表
     */
    public static List<String> tilesToStringList(List<Tile> tiles) {
        List<String> stringList = new ArrayList<>();
        for (Tile tile : tiles) {
            stringList.add(tileToString(tile));
        }
        return stringList;
    }
} 