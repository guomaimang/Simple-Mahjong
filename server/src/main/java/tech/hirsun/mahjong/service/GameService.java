package tech.hirsun.mahjong.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import tech.hirsun.mahjong.model.ActionType;
import tech.hirsun.mahjong.model.Game;
import tech.hirsun.mahjong.model.GameAction;
import tech.hirsun.mahjong.model.GameStatus;
import tech.hirsun.mahjong.model.Room;
import tech.hirsun.mahjong.model.Tile;
import tech.hirsun.mahjong.model.User;
import tech.hirsun.mahjong.repository.RoomRepository;
import tech.hirsun.mahjong.util.TileUtil;

@Service
public class GameService {

    private final RoomRepository roomRepository;

    public GameService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    /**
     * 开始游戏
     * @param roomId 房间ID
     * @param dealer 庄家
     * @return 创建的游戏，如果创建失败则返回null
     */
    public Game startGame(int roomId, User dealer) {
        Room room = roomRepository.findByRoomId(roomId);
        
        if (room == null || room.isExpired()) {
            return null; // 房间不存在或已过期
        }
        
        if (room.getPlayers().size() < 2) {
            return null; // 玩家数量不足
        }
        
        if (!room.getPlayers().contains(dealer)) {
            return null; // 庄家不在房间中
        }
        
        // 创建新游戏
        Game game = new Game(room, room.getPlayers(), dealer);
        
        // 生成并洗牌
        List<Tile> tiles = TileUtil.generateTiles();
        game.setRemainingTiles(tiles);
        
        // 初始化玩家手牌
        dealInitialTiles(game);
        
        // 设置游戏状态
        game.setStatus(GameStatus.IN_PROGRESS);
        
        // 更新房间状态
        room.setCurrentGame(game);
        room.setGameInProgress(true);
        roomRepository.save(room);
        
        return game;
    }

    /**
     * 发初始牌
     * @param game 游戏对象
     */
    private void dealInitialTiles(Game game) {
        List<Tile> remainingTiles = game.getRemainingTiles();
        List<User> players = game.getPlayers();
        User dealer = game.getDealer();
        
        Map<String, List<Tile>> playerTiles = new HashMap<>();
        
        // 初始化每个玩家的手牌列表
        for (User player : players) {
            playerTiles.put(player.getEmail(), new ArrayList<>());
        }
        
        // 庄家获得14张牌，其他玩家各13张
        for (User player : players) {
            List<Tile> playerHand = playerTiles.get(player.getEmail());
            int tilesToDraw = player.equals(dealer) ? 14 : 13;
            
            for (int i = 0; i < tilesToDraw; i++) {
                if (!remainingTiles.isEmpty()) {
                    Tile tile = remainingTiles.remove(0);
                    playerHand.add(tile);
                }
            }
        }
        
        game.setPlayerTiles(playerTiles);
    }

    /**
     * 执行游戏操作
     * @param roomId 房间ID
     * @param action 游戏操作
     * @return 更新后的游戏对象，如果操作失败则返回null
     */
    public Game performAction(int roomId, GameAction action) {
        Room room = roomRepository.findByRoomId(roomId);
        
        if (room == null || !room.isGameInProgress() || room.getCurrentGame() == null) {
            return null; // 房间不存在或游戏未进行
        }
        
        Game game = room.getCurrentGame();
        User player = action.getPlayer();
        
        if (!game.getPlayers().contains(player)) {
            return null; // 玩家不在游戏中
        }
        
        // 根据操作类型执行不同的逻辑
        switch (action.getType()) {
            case DRAW:
                return handleDrawAction(game, action);
            case DISCARD:
                return handleDiscardAction(game, action);
            case TAKE:
                return handleTakeAction(game, action);
            case REVEAL:
                return handleRevealAction(game, action);
            case DECLARE_WIN:
                return handleDeclareWinAction(game, action);
            case CONFIRM_WIN:
                return handleConfirmWinAction(game, action);
            case REJECT_WIN:
                return handleRejectWinAction(game, action);
            default:
                return null;
        }
    }

    /**
     * 处理抽牌操作
     */
    private Game handleDrawAction(Game game, GameAction action) {
        User player = action.getPlayer();
        List<Tile> remainingTiles = game.getRemainingTiles();
        List<Tile> playerHand = game.getPlayerTilesByEmail(player.getEmail());
        
        // 检查牌库是否有足够的牌
        int drawCount = action.getTiles().size();
        if (remainingTiles.size() < drawCount) {
            return null; // 牌库牌不足
        }
        
        // 从牌库中抽取指定数量的牌
        List<Tile> drawnTiles = new ArrayList<>();
        for (int i = 0; i < drawCount; i++) {
            Tile tile = remainingTiles.remove(0);
            playerHand.add(tile);
            drawnTiles.add(tile);
        }
        
        // 记录操作
        action.setTiles(drawnTiles);
        game.addAction(action);
        
        // 检查牌库是否已空
        if (remainingTiles.isEmpty()) {
            // 游戏结束，平局
            game.setStatus(GameStatus.FINISHED);
            game.getRoom().setGameInProgress(false);
        }
        
        return game;
    }

    /**
     * 处理打出牌操作
     */
    private Game handleDiscardAction(Game game, GameAction action) {
        User player = action.getPlayer();
        List<Tile> playerHand = game.getPlayerTilesByEmail(player.getEmail());
        List<Tile> discardedTiles = game.getDiscardedTiles();
        List<Tile> tilesToDiscard = action.getTiles();
        
        // 检查玩家是否有这些牌
        for (Tile tile : tilesToDiscard) {
            boolean found = false;
            for (Tile playerTile : playerHand) {
                if (playerTile.getType() == tile.getType() && playerTile.getValue() == tile.getValue()) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return null; // 玩家没有这张牌
            }
        }
        
        // 从玩家手牌中移除这些牌，并添加到弃牌区
        for (Tile tile : tilesToDiscard) {
            for (int i = 0; i < playerHand.size(); i++) {
                Tile playerTile = playerHand.get(i);
                if (playerTile.getType() == tile.getType() && playerTile.getValue() == tile.getValue()) {
                    playerHand.remove(i);
                    discardedTiles.add(tile);
                    break;
                }
            }
        }
        
        // 记录操作
        game.addAction(action);
        
        return game;
    }

    /**
     * 处理拿取牌操作
     */
    private Game handleTakeAction(Game game, GameAction action) {
        User player = action.getPlayer();
        List<Tile> playerHand = game.getPlayerTilesByEmail(player.getEmail());
        List<Tile> discardedTiles = game.getDiscardedTiles();
        List<Tile> tilesToTake = action.getTiles();
        
        // 检查弃牌区是否有这些牌
        for (Tile tile : tilesToTake) {
            boolean found = false;
            for (Tile discardedTile : discardedTiles) {
                if (discardedTile.getType() == tile.getType() && discardedTile.getValue() == tile.getValue()) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return null; // 弃牌区没有这张牌
            }
        }
        
        // 从弃牌区移除这些牌，并添加到玩家手牌
        for (Tile tile : tilesToTake) {
            for (int i = 0; i < discardedTiles.size(); i++) {
                Tile discardedTile = discardedTiles.get(i);
                if (discardedTile.getType() == tile.getType() && discardedTile.getValue() == tile.getValue()) {
                    discardedTiles.remove(i);
                    playerHand.add(tile);
                    break;
                }
            }
        }
        
        // 记录操作
        game.addAction(action);
        
        return game;
    }

    /**
     * 处理明牌操作
     */
    private Game handleRevealAction(Game game, GameAction action) {
        User player = action.getPlayer();
        List<Tile> playerHand = game.getPlayerTilesByEmail(player.getEmail());
        List<Tile> tilesToReveal = action.getTiles();
        
        // 检查玩家是否有这些牌
        for (Tile tile : tilesToReveal) {
            boolean found = false;
            for (Tile playerTile : playerHand) {
                if (playerTile.getType() == tile.getType() && playerTile.getValue() == tile.getValue()) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return null; // 玩家没有这张牌
            }
        }
        
        // 将这些牌设为明牌
        for (Tile tile : tilesToReveal) {
            for (Tile playerTile : playerHand) {
                if (playerTile.getType() == tile.getType() && playerTile.getValue() == tile.getValue() && !playerTile.isRevealed()) {
                    playerTile.setRevealed(true);
                    break;
                }
            }
        }
        
        // 记录操作
        game.addAction(action);
        
        return game;
    }

    /**
     * 处理宣布胜利操作
     */
    private Game handleDeclareWinAction(Game game, GameAction action) {
        User player = action.getPlayer();
        
        // 设置临时获胜者
        game.setWinner(player);
        
        // 记录操作
        game.addAction(action);
        
        return game;
    }

    /**
     * 处理确认胜利操作
     */
    private Game handleConfirmWinAction(Game game, GameAction action) {
        User player = action.getPlayer();
        User winner = game.getWinner();
        
        if (winner == null) {
            return null; // 没有人宣布胜利
        }
        
        if (player.equals(winner)) {
            return null; // 获胜者不需要确认自己的胜利
        }
        
        // 记录操作
        game.addAction(action);
        
        // 检查是否所有其他玩家都已确认
        boolean allConfirmed = true;
        for (User gamePlayer : game.getPlayers()) {
            if (!gamePlayer.equals(winner)) {
                boolean confirmed = false;
                for (GameAction gameAction : game.getActions()) {
                    if (gameAction.getType() == ActionType.CONFIRM_WIN && 
                        gameAction.getPlayer().equals(gamePlayer)) {
                        confirmed = true;
                        break;
                    }
                }
                if (!confirmed) {
                    allConfirmed = false;
                    break;
                }
            }
        }
        
        // 如果所有玩家都确认了，游戏结束
        if (allConfirmed) {
            game.setStatus(GameStatus.FINISHED);
            game.getRoom().setGameInProgress(false);
            
            // 将所有牌设为明牌
            for (List<Tile> tiles : game.getPlayerTiles().values()) {
                for (Tile tile : tiles) {
                    tile.setRevealed(true);
                }
            }
        }
        
        return game;
    }

    /**
     * 处理拒绝胜利操作
     */
    private Game handleRejectWinAction(Game game, GameAction action) {
        User player = action.getPlayer();
        User winner = game.getWinner();
        
        if (winner == null) {
            return null; // 没有人宣布胜利
        }
        
        if (player.equals(winner)) {
            return null; // 获胜者不能拒绝自己的胜利
        }
        
        // 清除临时获胜者
        game.setWinner(null);
        
        // 记录操作
        game.addAction(action);
        
        return game;
    }

    /**
     * 结束游戏
     * @param roomId 房间ID
     * @return 是否成功结束游戏
     */
    public boolean endGame(int roomId) {
        Room room = roomRepository.findByRoomId(roomId);
        
        if (room == null || !room.isGameInProgress()) {
            return false;
        }
        
        Game game = room.getCurrentGame();
        if (game != null) {
            game.setStatus(GameStatus.FINISHED);
            
            // 将所有牌设为明牌
            for (List<Tile> tiles : game.getPlayerTiles().values()) {
                for (Tile tile : tiles) {
                    tile.setRevealed(true);
                }
            }
        }
        
        room.setGameInProgress(false);
        roomRepository.save(room);
        
        return true;
    }

    /**
     * 获取游戏状态
     * @param roomId 房间ID
     * @param user 请求的用户
     * @return 游戏状态信息
     */
    public Map<String, Object> getGameState(int roomId, User user) {
        Room room = roomRepository.findByRoomId(roomId);
        
        if (room == null || !room.isGameInProgress() || room.getCurrentGame() == null) {
            return null;
        }
        
        Game game = room.getCurrentGame();
        
        if (!game.getPlayers().contains(user)) {
            return null; // 用户不在游戏中
        }
        
        Map<String, Object> state = new HashMap<>();
        state.put("roomId", roomId);
        state.put("discardedTiles", TileUtil.tilesToStringList(game.getDiscardedTiles()));
        state.put("remainingTileCount", game.getRemainingTileCount());
        
        // 只发送请求用户的手牌
        state.put("playerTiles", TileUtil.tilesToStringList(game.getPlayerTilesByEmail(user.getEmail())));
        
        // 发送所有明牌
        Map<String, List<String>> revealedTiles = new HashMap<>();
        for (Map.Entry<String, List<Tile>> entry : game.getRevealedTiles().entrySet()) {
            revealedTiles.put(entry.getKey(), TileUtil.tilesToStringList(entry.getValue()));
        }
        state.put("revealedTiles", revealedTiles);
        
        // 发送最近的操作
        List<String> recentActions = game.getRecentActions(2).stream()
                .map(GameAction::toString)
                .collect(Collectors.toList());
        state.put("recentActions", recentActions);
        
        return state;
    }
} 