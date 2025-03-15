package tech.hirsun.project.mahjongserver.util;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import tech.hirsun.project.mahjongserver.model.Tile;
import tech.hirsun.project.mahjongserver.model.Tile.TileType;

public class TileUtil {

    /**
     * Creates a complete set of mahjong tiles (136 tiles)
     * @return List of all tiles
     */
    public static List<Tile> createFullSet() {
        List<Tile> tiles = new ArrayList<>(136);
        int id = 1;

        // Create 万子 (Characters) - 9 values, 4 copies each
        for (int i = 1; i <= 9; i++) {
            for (int j = 0; j < 4; j++) {
                tiles.add(new Tile(TileType.WAN, i, id++));
            }
        }

        // Create 筒子 (Dots) - 9 values, 4 copies each
        for (int i = 1; i <= 9; i++) {
            for (int j = 0; j < 4; j++) {
                tiles.add(new Tile(TileType.TONG, i, id++));
            }
        }

        // Create 条子 (Bamboo) - 9 values, 4 copies each
        for (int i = 1; i <= 9; i++) {
            for (int j = 0; j < 4; j++) {
                tiles.add(new Tile(TileType.TIAO, i, id++));
            }
        }

        // Create 风牌 (Winds) - 4 values (东南西北), 4 copies each
        for (int i = 1; i <= 4; i++) {
            for (int j = 0; j < 4; j++) {
                tiles.add(new Tile(TileType.FENG, i, id++));
            }
        }

        // Create 箭牌 (Dragons) - 3 values (中发白), 4 copies each
        for (int i = 1; i <= 3; i++) {
            for (int j = 0; j < 4; j++) {
                tiles.add(new Tile(TileType.JIAN, i, id++));
            }
        }

        return tiles;
    }

    /**
     * Shuffles the provided list of tiles
     * @param tiles The tiles to shuffle
     * @return Shuffled tiles
     */
    public static List<Tile> shuffle(List<Tile> tiles) {
        List<Tile> shuffled = new ArrayList<>(tiles);
        Collections.shuffle(shuffled);
        return shuffled;
    }

    /**
     * Deals initial tiles to players
     * @param tiles The deck to deal from
     * @param playerCount Number of players
     * @param dealerIndex Index of the dealer
     * @return List of hands for each player (dealer gets 14 tiles, others get 13)
     */
    public static List<List<Tile>> dealInitialTiles(List<Tile> tiles, int playerCount, int dealerIndex) {
        List<List<Tile>> playerHands = new ArrayList<>(playerCount);
        
        // Initialize empty hands for each player
        for (int i = 0; i < playerCount; i++) {
            playerHands.add(new ArrayList<>());
        }
        
        // Deal 13 tiles to each player
        for (int round = 0; round < 13; round++) {
            for (int player = 0; player < playerCount; player++) {
                if (!tiles.isEmpty()) {
                    playerHands.get(player).add(tiles.remove(0));
                }
            }
        }
        
        // Give dealer an extra tile
        if (!tiles.isEmpty() && dealerIndex >= 0 && dealerIndex < playerCount) {
            playerHands.get(dealerIndex).add(tiles.remove(0));
        }
        
        return playerHands;
    }
} 