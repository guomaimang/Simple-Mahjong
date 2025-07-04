import { create } from 'zustand';
import websocketService from '../services/websocket';

// 创建游戏状态存储
export const useGameStore = create((set, get) => ({
  gameState: null,
  playerHand: [],
  revealedTiles: {},
  playerHandCounts: {},
  discardPile: [],
  drawPileCount: 0,
  recentActions: [],
  pendingWinner: null,
  loading: false,
  error: null,
  tryCount: 0,
  oneTimeListeners: [],
  winnerHandTiles: [],
  winnerRevealedTiles: [],
  lastDrawnTile: null,

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
        const newPlayerHand = data.hand || data.playerHand || [];
        const revealedTiles = data.revealedTiles || {};
        const discardPile = data.discardPile || [];
        const drawPileCount = data.remainingTiles || data.drawPileCount || 0;
        const recentActions = data.recentActions || [];
        const playerHandCounts = data.playerHandCounts || {};
        
        // 检查胜利相关字段
        const pendingWinnerFromState = gameState.pendingWinner || null;
        const winConfirmations = gameState.winConfirmations || {};
        
        console.log('解析游戏状态中的胜利信息：', { 
          pendingWinner: pendingWinnerFromState,
          hasWinConfirmations: Object.keys(winConfirmations).length > 0
        });
        
        console.log('Parsed game state data:', { 
          gameState, 
          handSize: newPlayerHand.length, 
          discardPileSize: discardPile.length,
          drawPileCount,
          playerHandCounts
        });
        
        // 确保gameState包含必要的字段
        if (!gameState.roomId) {
          gameState.roomId = roomId;
        }
        
        // 对所有玩家的明牌进行排序
        const sortedRevealedTiles = {};
        Object.keys(revealedTiles).forEach(email => {
          sortedRevealedTiles[email] = get().sortTiles(revealedTiles[email]);
        });
        
        // 检查是否有新牌，保存最后一张牌作为lastDrawnTile
        let lastDrawn = null;
        const currentPlayerHand = get().playerHand;
        const currentIds = new Set(currentPlayerHand.map(tile => tile.id));
        const newTiles = newPlayerHand.filter(tile => !currentIds.has(tile.id));
        
        // 如果有新牌，设置最后一张为lastDrawnTile
        if (newTiles.length > 0) {
          lastDrawn = newTiles[newTiles.length - 1];
        }
        
        // 对所有手牌进行排序
        const sortedPlayerHand = get().sortTiles(newPlayerHand);
        
        set({
          gameState,
          playerHand: sortedPlayerHand, // 使用排序后的手牌
          revealedTiles: sortedRevealedTiles, // 使用排序后的明牌
          playerHandCounts,
          discardPile,
          drawPileCount,
          recentActions,
          loading: false,
          error: null,
          tryCount: 0
        });
        
        // 如果有新抽的牌，设置lastDrawnTile
        if (lastDrawn) {
          set({ lastDrawnTile: lastDrawn });
          
          // 在5秒后清除lastDrawnTile
          setTimeout(() => {
            // 确保lastDrawnTile仍然是同一张牌时才清除
            const currentState = get();
            if (currentState.lastDrawnTile && currentState.lastDrawnTile.id === lastDrawn.id) {
              set({ lastDrawnTile: null });
            }
          }, 5000);
        }
        
        // 如果游戏状态中包含pendingWinner，更新pendingWinner状态
        if (pendingWinnerFromState) {
          console.log('从游戏状态中更新pendingWinner:', pendingWinnerFromState);
          set({ pendingWinner: pendingWinnerFromState });
        }
        
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
        
        // 只保留最近的20个操作
        const recentActions = currentActions.slice(Math.max(0, currentActions.length - 20));
        
        set({ recentActions });
        
        // 自动触发获取游戏状态，确保UI更新
        get().fetchGameState(roomId);
      }
    });

    // 监听胜利声明
    websocketService.addListener('WIN_CLAIM', (data) => {
      console.log('收到WIN_CLAIM消息：', data);
      
      // 检查数据结构，适配不同格式
      const roomIdFromData = data.roomId;
      let claimerEmail = null;
      
      // 尝试从不同位置获取claimerEmail
      if (data.claimerEmail) {
        claimerEmail = data.claimerEmail;
        console.log('从data.claimerEmail获取声明胜利者:', claimerEmail);
      } else if (data.gameData && data.gameData.claimerEmail) {
        claimerEmail = data.gameData.claimerEmail;
        console.log('从data.gameData.claimerEmail获取声明胜利者:', claimerEmail);
      } else if (data.gameData && data.gameData.playerEmail) {
        claimerEmail = data.gameData.playerEmail;
        console.log('从data.gameData.playerEmail获取声明胜利者:', claimerEmail);
      } else {
        console.error('无法从WIN_CLAIM消息中获取声明胜利者信息');
      }
      
      // 获取胜利者的牌信息，考虑不同的数据结构
      let handTiles = [];
      let revealedTiles = [];
      
      // 直接在data中的情况
      if (Array.isArray(data.handTiles)) {
        console.log('从data.handTiles获取手牌');
        handTiles = data.handTiles;
      } 
      // 在gameData中的情况 
      else if (data.gameData && Array.isArray(data.gameData.handTiles)) {
        console.log('从data.gameData.handTiles获取手牌');
        handTiles = data.gameData.handTiles;
      }
      
      // 直接在data中的情况
      if (Array.isArray(data.revealedTiles)) {
        console.log('从data.revealedTiles获取明牌');
        revealedTiles = data.revealedTiles;
      } 
      // 在gameData中的情况
      else if (data.gameData && Array.isArray(data.gameData.revealedTiles)) {
        console.log('从data.gameData.revealedTiles获取明牌');
        revealedTiles = data.gameData.revealedTiles;
      }
      
      console.log('解析后的手牌数量:', handTiles.length);
      console.log('解析后的明牌数量:', revealedTiles.length);
      
      if (roomIdFromData === roomId && claimerEmail) {
        console.log('设置pendingWinner为:', claimerEmail);
        console.log('胜利者手牌:', handTiles);
        console.log('胜利者明牌:', revealedTiles);
        
        // 对胜利者的手牌和明牌进行排序
        const sortedHandTiles = get().sortTiles(handTiles);
        const sortedRevealedTiles = get().sortTiles(revealedTiles);
        
        set({ 
          pendingWinner: claimerEmail,
          winnerHandTiles: sortedHandTiles,
          winnerRevealedTiles: sortedRevealedTiles
        });
      } else {
        console.log('未设置pendingWinner, roomId匹配:', roomIdFromData === roomId, '获取到claimerEmail:', !!claimerEmail);
      }
    });

    // 监听游戏结束
    websocketService.addListener('GAME_END', (data) => {
      if (data.roomId === roomId) {
        set({
          gameState: {
            ...get().gameState,
            status: 'FINISHED',
            winnerEmail: data.winnerEmail
          },
          pendingWinner: null,
          winnerHandTiles: [],
          winnerRevealedTiles: []
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
    websocketService.removeListener('GAME_END');
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
  drawTile: async (roomId) => {
    set({ loading: true, error: null });
    try {
      // 只能抽一张牌
      const response = await websocketService.drawTile(roomId);
      
      // 游戏状态会由服务器推送更新，lastDrawnTile会在GAME_STATE监听器中设置
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

  // 暗牌（隐藏明牌）
  hideTiles: async (roomId, tiles) => {
    set({ loading: true, error: null });
    try {
      await websocketService.hideTiles(roomId, tiles);
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

  // 通用牌排序方法
  sortTiles: (tiles) => {
    if (!tiles || !Array.isArray(tiles) || tiles.length === 0) {
      return [];
    }
    
    // 麻将牌的类型顺序：万、筒、条、风、箭
    const typeOrder = { WAN: 0, TONG: 1, TIAO: 2, FENG: 3, JIAN: 4 };
    
    // 首先按照类型和点数对牌进行分组
    const groups = {};
    tiles.forEach(tile => {
      const key = `${tile.type}-${tile.value}`;
      if (!groups[key]) {
        groups[key] = {
          type: tile.type,
          value: tile.value,
          tiles: []
        };
      }
      groups[key].tiles.push(tile);
    });
    
    // 把分组转换为数组
    const groupsArray = Object.values(groups);
    
    // 对分组进行排序：先按类型，然后按点数
    groupsArray.sort((a, b) => {
      const typeComparison = typeOrder[a.type] - typeOrder[b.type];
      if (typeComparison !== 0) {
        return typeComparison;
      }
      return a.value - b.value;
    });
    
    // 生成最终排序后的牌数组
    return groupsArray.flatMap(group => group.tiles);
  },

  // 对手牌进行排序
  sortPlayerHand: () => {
    const { playerHand } = get();
    const sortedHand = get().sortTiles(playerHand);
    set({ playerHand: sortedHand });
  },

  // 重置游戏状态
  resetGameState: () => {
    set({
      gameState: null,
      playerHand: [],
      revealedTiles: [],
      playerHandCounts: {},
      discardPile: [],
      drawPileCount: 0,
      recentActions: [],
      pendingWinner: null,
      loading: false,
      error: null,
      tryCount: 0,
      oneTimeListeners: [],
      winnerHandTiles: [],
      winnerRevealedTiles: [],
      lastDrawnTile: null
    });
  },
})); 