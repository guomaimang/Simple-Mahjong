import { create } from 'zustand';
import websocketService from '../services/websocket';
import { mockGameStates, currentUser, sortTiles } from '../services/mockData';

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
        const playerHand = data.hand || data.playerHand || [];
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
          handSize: playerHand.length, 
          discardPileSize: discardPile.length,
          drawPileCount,
          playerHandCounts
        });
        
        // 确保gameState包含必要的字段
        if (!gameState.roomId) {
          gameState.roomId = roomId;
        }
        
        // 对玩家手牌进行排序
        const sortedPlayerHand = get().sortTiles(playerHand);
        
        // 对所有玩家的明牌进行排序
        const sortedRevealedTiles = {};
        Object.keys(revealedTiles).forEach(email => {
          sortedRevealedTiles[email] = get().sortTiles(revealedTiles[email]);
        });
        
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

  // 移除所有监听器
  removeListeners: () => {
    console.log('Removing listeners');
    
    // 在模拟环境中不需要特别处理
    if (typeof mockGameStates !== 'undefined') {
      return;
    }
    
    // 移除一次性监听器
    const { oneTimeListeners } = get();
    if (oneTimeListeners && oneTimeListeners.length > 0) {
      oneTimeListeners.forEach(listener => {
        websocketService.removeListener('GAME_STATE', listener);
      });
      set({ oneTimeListeners: [] });
    }
  },

  // 将mockData中的牌格式转换为gameStore使用的格式
  convertTileFormat: (tile) => {
    if (!tile) return null;
    
    // 如果已经是type/value格式，直接返回
    if (tile.type) return tile;
    
    // 将suit/value格式转换为type/value格式
    if (tile.suit) {
      const newTile = {
        id: tile.id,
      };
      
      // 转换suit到type
      switch (tile.suit) {
        case 'bamboo':
          newTile.type = 'TIAO';
          newTile.value = tile.value;
          break;
        case 'dots':
          newTile.type = 'TONG';
          newTile.value = tile.value;
          break;
        case 'characters':
          newTile.type = 'WAN';
          newTile.value = tile.value;
          break;
        case 'wind':
          newTile.type = 'FENG';
          // 转换风牌的值
          switch (tile.value) {
            case 'east': newTile.value = 1; break;
            case 'south': newTile.value = 2; break;
            case 'west': newTile.value = 3; break;
            case 'north': newTile.value = 4; break;
            default: newTile.value = 0;
          }
          break;
        case 'dragon':
          newTile.type = 'JIAN';
          // 转换箭牌的值
          switch (tile.value) {
            case 'red': newTile.value = 1; break;
            case 'green': newTile.value = 2; break;
            case 'white': newTile.value = 3; break;
            default: newTile.value = 0;
          }
          break;
        default:
          newTile.type = tile.suit.toUpperCase();
          newTile.value = tile.value;
      }
      
      return newTile;
    }
    
    return tile;
  },

  // 转换整个牌数组的格式
  convertTilesFormat: (tiles) => {
    if (!Array.isArray(tiles)) return [];
    return tiles.map(tile => get().convertTileFormat(tile));
  },

  // 获取游戏状态
  fetchGameState: async (roomId) => {
    set({ loading: true, error: null });
    
    try {
      // 演示版本：直接从mockGameStates获取游戏状态
      if (typeof mockGameStates !== 'undefined' && mockGameStates[roomId]) {
        console.log('使用mock游戏状态数据');
        const gameState = mockGameStates[roomId];
        const playerEmail = currentUser.email;
        
        // 获取当前玩家的手牌
        const playerHand = gameState.hands[playerEmail] || [];
        
        // 转换牌的格式
        const convertedPlayerHand = get().convertTilesFormat(playerHand);
        const sortedPlayerHand = sortTiles(convertedPlayerHand);
        
        // 转换弃牌堆和明牌的格式
        const convertedDiscardPile = get().convertTilesFormat(gameState.discardPile);
        
        // 转换所有玩家的明牌
        const convertedRevealedTiles = {};
        Object.keys(gameState.revealedTiles).forEach(email => {
          convertedRevealedTiles[email] = get().convertTilesFormat(gameState.revealedTiles[email]);
        });
        
        set({
          gameState,
          playerHand: sortedPlayerHand,
          revealedTiles: convertedRevealedTiles,
          playerHandCounts: gameState.playerHandCounts,
          discardPile: convertedDiscardPile,
          drawPileCount: gameState.drawPileCount,
          recentActions: gameState.recentActions,
          loading: false,
          error: null
        });
        
        return gameState;
      } else {
        // 原始WebSocket方法 - 直接使用websocketService的fetchGameState
        const gameData = await websocketService.fetchGameState(roomId);
        
        if (gameData) {
          set({
            gameState: gameData.gameState,
            playerHand: gameData.hand || [],
            revealedTiles: gameData.revealedTiles || {},
            playerHandCounts: gameData.playerHandCounts || {},
            discardPile: gameData.discardPile || [],
            drawPileCount: gameData.drawPileCount || 0,
            recentActions: gameData.recentActions || [],
            loading: false,
            error: null
          });
          
          return gameData.gameState;
        }
      }
    } catch (error) {
      console.error('Error in fetchGameState:', error);
      set({ 
        loading: false, 
        error: error.message,
      });
      throw error;
    }
  },

  // 洗牌
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

  // 重置游戏状态
  resetGameState: () => {
    set({
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
      winnerHandTiles: [],
      winnerRevealedTiles: [],
      lastDrawnTile: null
    });
  },

  // 抽牌
  drawTile: async (roomId) => {
    if (typeof mockGameStates !== 'undefined') {
      // 演示版本直接返回成功
      return true;
    }
    
    try {
      await websocketService.drawTile(roomId);
      return true;
    } catch (error) {
      console.error('Error drawing tile:', error);
      set({ error: `抽牌失败：${error.message}` });
      return false;
    }
  },
  
  // 出牌
  discardTile: async (roomId, tile) => {
    if (typeof mockGameStates !== 'undefined') {
      // 演示版本：直接从玩家手牌中移除该牌
      const gameState = mockGameStates[roomId];
      if (!gameState) return false;
      
      const playerEmail = currentUser.email;
      gameState.hands[playerEmail] = gameState.hands[playerEmail].filter(t => t.id !== tile.id);
      gameState.discardPile.push(tile);
      
      // 更新状态
      const updatedPlayerHand = sortTiles(gameState.hands[playerEmail]);
      set({
        playerHand: updatedPlayerHand,
        discardPile: gameState.discardPile
      });
      
      return true;
    }
    
    try {
      await websocketService.discardTile(roomId, tile);
      return true;
    } catch (error) {
      console.error('Error discarding tile:', error);
      set({ error: `出牌失败：${error.message}` });
      return false;
    }
  },
  
  // 拿牌
  takeTile: async (roomId, tile) => {
    if (typeof mockGameStates !== 'undefined') {
      // 演示版本直接返回成功
      return true;
    }
    
    try {
      await websocketService.takeTile(roomId, tile);
      return true;
    } catch (error) {
      console.error('Error taking tile:', error);
      set({ error: `拿牌失败：${error.message}` });
      return false;
    }
  },
  
  // 显示牌
  revealTiles: async (roomId, tiles) => {
    if (typeof mockGameStates !== 'undefined') {
      // 演示版本直接返回成功
      return true;
    }
    
    try {
      await websocketService.revealTiles(roomId, tiles);
      return true;
    } catch (error) {
      console.error('Error revealing tiles:', error);
      set({ error: `显示牌失败：${error.message}` });
      return false;
    }
  },
  
  // 隐藏牌
  hideTiles: async (roomId, tiles) => {
    if (typeof mockGameStates !== 'undefined') {
      // 演示版本直接返回成功
      return true;
    }
    
    try {
      await websocketService.hideTiles(roomId, tiles);
      return true;
    } catch (error) {
      console.error('Error hiding tiles:', error);
      set({ error: `隐藏牌失败：${error.message}` });
      return false;
    }
  },
  
  // 胜利声明
  claimWin: async (roomId) => {
    if (typeof mockGameStates !== 'undefined') {
      // 演示版本：设置自己为胜利者
      const gameState = mockGameStates[roomId];
      if (!gameState) return false;
      
      gameState.pendingWinner = currentUser.email;
      set({ pendingWinner: currentUser.email });
      return true;
    }
    
    try {
      await websocketService.claimWin(roomId);
      return true;
    } catch (error) {
      console.error('Error claiming win:', error);
      set({ error: `胜利声明失败：${error.message}` });
      return false;
    }
  },
  
  // 确认胜利
  confirmWin: async (roomId, winnerEmail, confirm) => {
    if (typeof mockGameStates !== 'undefined') {
      // 演示版本直接返回成功
      return true;
    }
    
    try {
      await websocketService.confirmWin(roomId, winnerEmail, confirm);
      return true;
    } catch (error) {
      console.error('Error confirming win:', error);
      set({ error: `确认胜利失败：${error.message}` });
      return false;
    }
  },

  // 对手牌进行排序
  sortPlayerHand: () => {
    const { playerHand } = get();
    const sortedHand = get().sortTiles(playerHand);
    set({ playerHand: sortedHand });
  },
})); 