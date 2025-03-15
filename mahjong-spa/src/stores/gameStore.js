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
    websocketService.addListener('GAME_STATE', (data) => {
      console.log('Processing GAME_STATE in store:', data);
      
      // 处理可能的不同数据结构
      const gameState = data.gameState || data;
      const playerHand = data.hand || data.playerHand || [];
      const revealedTiles = data.revealedTiles || {};
      const discardPile = data.discardPile || [];
      const drawPileCount = data.remainingTiles || data.drawPileCount || 0;
      const recentActions = data.recentActions || [];
      
      console.log('Setting game state:', { 
        gameState, playerHand, revealedTiles, discardPile, drawPileCount, recentActions 
      });
      
      set({
        gameState,
        playerHand,
        revealedTiles,
        discardPile,
        drawPileCount,
        recentActions,
        loading: false,
        error: null
      });
    });

    // 添加ACTION消息监听器
    websocketService.addListener('ACTION', (data) => {
      console.log('Processing ACTION message:', data);
      
      if (data.roomId === roomId) {
        // 将ACTION添加到最近的操作列表中
        const newAction = {
          type: data.gameData.type,
          playerEmail: data.gameData.playerEmail,
          data: data.gameData.tile || data.gameData.data,
          timestamp: data.timestamp
        };
        
        const currentActions = [...get().recentActions];
        currentActions.push(newAction);
        
        // 只保留最近的10个操作
        const recentActions = currentActions.slice(Math.max(0, currentActions.length - 10));
        
        set({ recentActions });
        
        // 自动触发获取游戏状态，确保UI更新
        get().fetchGameState(roomId);
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
    
    // 监听错误消息
    websocketService.addListener('ERROR', (data) => {
      console.log('Received ERROR message:', data);
      
      // 处理游戏状态获取失败
      if (data.code === 'STATE_FAILED') {
        set({ 
          loading: false, 
          error: data.message || '获取游戏状态失败' 
        });
      }
    });
  },

  // 移除游戏状态监听
  removeListeners: () => {
    console.log('Removing listeners');
    websocketService.removeListener('GAME_STATE');
    websocketService.removeListener('ACTION');
    websocketService.removeListener('WIN_CLAIM');
    websocketService.removeListener('GAME_ENDED');
    websocketService.removeListener('ERROR');
  },

  // 获取游戏状态
  fetchGameState: async (roomId) => {
    set({ loading: true, error: null });
    try {
      await websocketService.getGameState(roomId);
      
      // 添加重试机制，如果3秒后仍然没有接收到游戏状态，再次尝试
      const currentState = get().gameState;
      
      return new Promise((resolve) => {
        if (currentState && currentState.roomId === roomId) {
          // 如果已经有状态了，直接返回
          set({ loading: false });
          resolve(currentState);
        } else {
          // 否则设置超时再次尝试
          const timeout = setTimeout(async () => {
            const newState = get().gameState;
            if (!newState || newState.roomId !== roomId) {
              console.log('No game state received after timeout, retrying...');
              await websocketService.getGameState(roomId);
            }
            set({ loading: false });
            resolve(get().gameState);
          }, 3000);
          
          // 添加一次性监听器，如果收到状态更新则清除超时
          const listener = (data) => {
            if (data && data.roomId === roomId) {
              clearTimeout(timeout);
              websocketService.removeListener('GAME_STATE', listener);
              set({ loading: false });
              resolve(data);
            }
          };
          
          websocketService.addListener('GAME_STATE', listener);
        }
      });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
      throw error;
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