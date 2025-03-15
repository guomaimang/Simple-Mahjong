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
  tryCount: 0,
  oneTimeListeners: [],

  // 初始化游戏状态监听
  initializeListeners: (roomId) => {
    // 首先清除任何现有的监听器，以防重复
    get().removeListeners();
    
    // 监听游戏状态更新
    websocketService.addListener('GAME_STATE', (data) => {
      console.log('Processing GAME_STATE in store, raw data:', data);
      
      // 防止无效数据
      if (!data) {
        console.error('Received null or undefined game state');
        return;
      }
      
      try {
        // 处理可能的不同数据结构
        const gameState = data.gameState || data;
        const playerHand = data.hand || data.playerHand || [];
        const revealedTiles = data.revealedTiles || {};
        const discardPile = data.discardPile || [];
        const drawPileCount = data.remainingTiles || data.drawPileCount || 0;
        const recentActions = data.recentActions || [];
        
        console.log('Parsed game state data:', { 
          gameState, 
          handSize: playerHand.length, 
          discardPileSize: discardPile.length,
          drawPileCount
        });
        
        // 确保gameState包含必要的字段
        if (!gameState.roomId) {
          gameState.roomId = roomId;
        }
        
        set({
          gameState,
          playerHand,
          revealedTiles,
          discardPile,
          drawPileCount,
          recentActions,
          loading: false,
          error: null,
          tryCount: 0
        });
        
        console.log('Game state successfully updated in store');
      } catch (error) {
        console.error('Error processing game state:', error, data);
        set({ 
          loading: false, 
          error: '处理游戏状态时出错：' + error.message 
        });
      }
    });

    // 添加ACTION消息监听器
    websocketService.addListener('ACTION', (data) => {
      console.log('Processing ACTION message:', data);
      
      if (data.roomId === roomId) {
        // 将ACTION添加到最近的操作列表中
        const newAction = {
          type: data.gameData.type,
          playerEmail: data.gameData.playerEmail,
          timestamp: data.timestamp
        };
        
        // 根据操作类型处理数据
        if (data.gameData.type === 'DISCARD') {
          newAction.data = data.gameData.tile || data.gameData.data;
        } else if (data.gameData.type === 'TAKE_TILE') {
          newAction.data = data.gameData.tile || data.gameData.data;
          // 如果没有tile对象但有tileId，尝试从弃牌堆中找到对应的牌
          if (!newAction.data && data.gameData.tileId) {
            console.log('Trying to find tile by ID:', data.gameData.tileId);
            const discardPile = get().discardPile;
            const tile = discardPile.find(t => t.id === data.gameData.tileId);
            if (tile) {
              console.log('Found tile in discard pile:', tile);
              newAction.data = tile;
            }
          }
        } else {
          newAction.data = data.gameData.data;
        }
        
        const currentActions = [...get().recentActions];
        currentActions.push(newAction);
        
        // 只保留最近的5个操作
        const recentActions = currentActions.slice(Math.max(0, currentActions.length - 5));
        
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
    
    // 清除所有一次性监听器
    const oneTimeListeners = get().oneTimeListeners;
    oneTimeListeners.forEach(listener => {
      websocketService.removeListener('GAME_STATE', listener);
    });
    set({ oneTimeListeners: [] });
  },

  // 获取游戏状态
  fetchGameState: async (roomId) => {
    // 添加一个防抖变量避免频繁请求
    if (get().loading) {
      console.log('Already loading game state, skipping request');
      return;
    }
    
    set({ loading: true, error: null });
    // 添加一个尝试计数器
    const tryCount = get().tryCount || 0;
    
    // 如果尝试次数过多，显示错误并停止请求
    if (tryCount > 5) {
      console.error('Max retry count reached, stopping game state requests');
      set({ 
        loading: false, 
        error: '无法获取游戏状态，请刷新页面重试', 
        tryCount: 0 
      });
      return;
    }
    
    try {
      // 首先检查WebSocket连接状态
      if (!websocketService.isConnected()) {
        console.log('WebSocket not connected, reconnecting...');
        await websocketService.connect();
      }
      
      console.log(`Attempting to fetch game state for room ${roomId}, attempt #${tryCount + 1}`);
      await websocketService.getGameState(roomId);
      set({ tryCount: tryCount + 1 });
      
      // 添加重试机制，如果3秒后仍然没有接收到游戏状态，再次尝试
      const currentState = get().gameState;
      
      return new Promise((resolve) => {
        if (currentState && currentState.roomId === roomId) {
          // 如果已经有状态了，直接返回
          console.log('Found existing game state, returning immediately');
          set({ loading: false, tryCount: 0 });
          resolve(currentState);
        } else {
          // 否则设置超时再次尝试
          console.log(`Setting timeout for game state response, attempt #${tryCount + 1}`);
          
          const timeout = setTimeout(async () => {
            const newState = get().gameState;
            
            if (!newState || newState.roomId !== roomId) {
              console.log(`No game state received after timeout, attempt #${tryCount + 1}`);
              
              // 手动再次请求游戏状态，但避免无限循环
              set({ loading: false });
              // 重新连接WebSocket，然后尝试再次获取游戏状态
              websocketService.disconnect();
              setTimeout(async () => {
                try {
                  await websocketService.connect();
                  
                  // 短暂延迟后再次请求游戏状态
                  setTimeout(() => {
                    console.log('Retrying game state request after reconnection');
                    websocketService.getGameState(roomId);
                  }, 1000);
                } catch (error) {
                  console.error('Reconnection failed:', error);
                }
              }, 1000);
            } else {
              // 已经收到状态，重置尝试计数
              console.log('Game state received within timeout period');
              set({ tryCount: 0 });
            }
            resolve(get().gameState);
          }, 3000);
          
          // 添加一次性监听器，如果收到状态更新则清除超时
          const listener = (data) => {
            console.log('One-time listener received data:', data);
            
            if (data && (data.roomId === roomId || (data.gameState && data.gameState.roomId === roomId))) {
              console.log('Received game state via one-time listener, clearing timeout');
              clearTimeout(timeout);
              
              // 保存到oneTimeListeners数组中，以便后续清理
              const listeners = get().oneTimeListeners;
              const updatedListeners = listeners.filter(l => l !== listener);
              set({ oneTimeListeners: updatedListeners });
              
              websocketService.removeListener('GAME_STATE', listener);
              set({ loading: false, tryCount: 0 });
              resolve(data);
            } else {
              console.log('One-time listener data did not match criteria, ignoring');
            }
          };
          
          // 添加到一次性监听器列表中，以便以后清理
          const listeners = get().oneTimeListeners;
          listeners.push(listener);
          set({ oneTimeListeners: listeners });
          
          console.log('Added one-time listener for GAME_STATE');
          websocketService.addListener('GAME_STATE', listener);
        }
      });
    } catch (error) {
      console.error('Error in fetchGameState:', error);
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
    console.log('Resetting game state');
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
      tryCount: 0,
      oneTimeListeners: []
    });
  },
})); 