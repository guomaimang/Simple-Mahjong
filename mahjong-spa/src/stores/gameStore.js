import { create } from 'zustand';
import websocketService from '../services/websocket';

// 创建游戏状态存储
export const useGameStore = create((set, get) => ({
  gameState: null,
  playerHand: [],
  revealedTiles: {},
  discardPile: [],
  drawPileCount: 0,
  recentActions: [],
  pendingWinner: null,
  loading: false,
  error: null,

  // 初始化游戏状态监听
  initializeListeners: (roomId) => {
    // 监听游戏状态更新
    websocketService.addListener('GAME_STATE_UPDATE', (data) => {
      if (data.roomId === roomId) {
        set({
          gameState: data.gameState,
          playerHand: data.playerHand || [],
          revealedTiles: data.revealedTiles || {},
          discardPile: data.discardPile || [],
          drawPileCount: data.drawPileCount || 0,
          recentActions: data.recentActions || [],
        });
      }
    });

    // 监听胜利声明
    websocketService.addListener('WIN_CLAIM', (data) => {
      if (data.roomId === roomId) {
        set({ pendingWinner: data.claimerEmail });
      }
    });

    // 监听游戏结束
    websocketService.addListener('GAME_ENDED', (data) => {
      if (data.roomId === roomId) {
        set({
          gameState: {
            ...get().gameState,
            status: 'FINISHED',
            winnerEmail: data.winnerEmail
          },
          pendingWinner: null
        });
      }
    });
  },

  // 移除游戏状态监听
  removeListeners: () => {
    websocketService.removeListener('GAME_STATE_UPDATE');
    websocketService.removeListener('WIN_CLAIM');
    websocketService.removeListener('GAME_ENDED');
  },

  // 获取游戏状态
  fetchGameState: async (roomId) => {
    set({ loading: true, error: null });
    try {
      await websocketService.getGameState(roomId);
      set({ loading: false });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
    }
  },

  // 抽取牌
  drawTile: async (roomId, count = 1) => {
    set({ loading: true, error: null });
    try {
      await websocketService.drawTile(roomId, count);
      set({ loading: false });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
    }
  },

  // 打出牌
  discardTile: async (roomId, tile) => {
    set({ loading: true, error: null });
    try {
      await websocketService.discardTile(roomId, tile);
      set({ loading: false });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
    }
  },

  // 拿取别人出的牌
  takeTile: async (roomId, tile) => {
    set({ loading: true, error: null });
    try {
      await websocketService.takeTile(roomId, tile);
      set({ loading: false });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
    }
  },

  // 明牌
  revealTiles: async (roomId, tiles) => {
    set({ loading: true, error: null });
    try {
      await websocketService.revealTiles(roomId, tiles);
      set({ loading: false });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
    }
  },

  // 宣布胜利
  claimWin: async (roomId) => {
    set({ loading: true, error: null });
    try {
      await websocketService.claimWin(roomId);
      set({ loading: false });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
    }
  },

  // 确认胜利
  confirmWin: async (roomId, winnerEmail, confirm) => {
    set({ loading: true, error: null });
    try {
      await websocketService.confirmWin(roomId, winnerEmail, confirm);
      set({ loading: false });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
    }
  },

  // 对手牌进行排序
  sortPlayerHand: () => {
    const { playerHand } = get();
    
    // 排序规则：万子、筒子、条子、风牌、箭牌，然后是数字值
    const sortedHand = [...playerHand].sort((a, b) => {
      // 首先按类型排序
      const typeOrder = { WAN: 0, TONG: 1, TIAO: 2, FENG: 3, JIAN: 4 };
      const typeComparison = typeOrder[a.type] - typeOrder[b.type];
      
      if (typeComparison !== 0) {
        return typeComparison;
      }
      
      // 然后按值排序
      return a.value - b.value;
    });
    
    set({ playerHand: sortedHand });
  },

  // 重置游戏状态
  resetGameState: () => {
    set({
      gameState: null,
      playerHand: [],
      revealedTiles: {},
      discardPile: [],
      drawPileCount: 0,
      recentActions: [],
      pendingWinner: null,
      loading: false,
      error: null,
    });
  },
})); 