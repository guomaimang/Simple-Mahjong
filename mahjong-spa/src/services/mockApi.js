import { mockUsers, currentUser, mockRooms, mockRoomPlayers, mockGameStates, getPlayerHand, performAction, sortTiles } from './mockData';

// 模拟延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms || (Math.random() * 300 + 100)));

// 模拟事件监听器
class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  addListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.removeListener(event, callback);
  }

  removeListener(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(data));
  }
}

// 创建全局事件发射器
const globalEmitter = new EventEmitter();

// 认证相关API
export const authApi = {
  getGithubLoginUrl: async () => {
    await delay();
    // 在模拟环境中，直接返回一个假的URL
    return { url: '#/mock-github-login' };
  },

  updateNickname: async (nickname) => {
    await delay();
    // 更新当前用户的昵称
    currentUser.nickname = nickname;
    return { user: { ...currentUser } };
  },

  validateToken: async () => {
    await delay();
    // 在模拟环境中，总是返回当前用户
    return { user: { ...currentUser } };
  },
};

// 房间相关API
export const roomApi = {
  getAllRooms: async () => {
    await delay();
    // 返回所有房间
    return { rooms: [...mockRooms] };
  },

  createRoom: async () => {
    await delay();
    // 创建一个新房间
    const newRoom = {
      id: `${Date.now()}`,
      name: `${currentUser.nickname}的麻将室`,
      createdBy: currentUser.email,
      createdAt: new Date().toISOString(),
      status: 'waiting',
      playerCount: 1,
      maxPlayers: 4,
      hasPassword: false,
    };
    
    // 添加到房间列表
    mockRooms.push(newRoom);
    
    // 将当前用户添加为该房间的玩家
    mockRoomPlayers[newRoom.id] = [currentUser];
    
    return { room: newRoom };
  },

  getRoomById: async (roomId) => {
    await delay();
    // 查找指定房间
    const room = mockRooms.find(r => r.id === roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    // 获取房间玩家
    const players = mockRoomPlayers[roomId] || [];
    
    return { room, players };
  },

  joinRoom: async (roomId, password) => {
    await delay();
    // 查找指定房间
    const room = mockRooms.find(r => r.id === roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    // 检查密码（如果有）
    if (room.hasPassword && password !== '1234') { // 模拟密码
      throw new Error('密码错误');
    }
    
    // 检查房间是否已满
    const players = mockRoomPlayers[roomId] || [];
    if (players.length >= room.maxPlayers) {
      throw new Error('房间已满');
    }
    
    // 检查当前用户是否已在房间中
    if (!players.find(p => p.email === currentUser.email)) {
      players.push(currentUser);
      mockRoomPlayers[roomId] = players;
      
      // 更新房间玩家数量
      room.playerCount = players.length;
    }
    
    return { room, players };
  },

  startGame: async (roomId) => {
    await delay();
    // 查找指定房间
    const room = mockRooms.find(r => r.id === roomId);
    if (!room) {
      throw new Error('房间不存在');
    }
    
    // 检查是否有足够的玩家
    const players = mockRoomPlayers[roomId] || [];
    if (players.length < 2) {
      throw new Error('至少需要2名玩家才能开始游戏');
    }
    
    // 创建游戏状态
    mockGameStates[roomId] = mockGameStates[roomId] || createInitialGameState(roomId);
    
    // 更新房间状态
    room.status = 'playing';
    
    // 通知所有监听器游戏已开始
    globalEmitter.emit('GAME_STATE', { roomId, gameState: mockGameStates[roomId] });
    
    return { success: true };
  },
};

// 模拟WebSocket服务
export const mockWebsocketService = {
  connected: false,
  
  // 连接WebSocket
  connect: async () => {
    await delay();
    mockWebsocketService.connected = true;
    return true;
  },
  
  // 断开WebSocket
  disconnect: () => {
    mockWebsocketService.connected = false;
  },
  
  // 添加监听器
  addListener: (event, callback) => {
    return globalEmitter.addListener(event, callback);
  },
  
  // 移除监听器
  removeListener: (event, callback) => {
    globalEmitter.removeListener(event, callback);
  },
  
  // 发送消息
  sendMessage: async (event, data) => {
    await delay();
    
    if (!mockWebsocketService.connected) {
      throw new Error('WebSocket未连接');
    }
    
    // 处理不同类型的消息
    switch (event) {
      case 'JOIN_ROOM': {
        const { roomId } = data;
        const room = mockRooms.find(r => r.id === roomId);
        if (room) {
          const players = mockRoomPlayers[roomId] || [];
          globalEmitter.emit('ROOM_UPDATE', { roomId, room, players });
        }
        break;
      }
      
      case 'LEAVE_ROOM': {
        const { roomId } = data;
        const room = mockRooms.find(r => r.id === roomId);
        if (room) {
          // 从房间玩家列表中移除当前用户
          const players = mockRoomPlayers[roomId] || [];
          const newPlayers = players.filter(p => p.email !== currentUser.email);
          mockRoomPlayers[roomId] = newPlayers;
          
          // 更新房间玩家数量
          room.playerCount = newPlayers.length;
          
          globalEmitter.emit('ROOM_UPDATE', { roomId, room, players: newPlayers });
        }
        break;
      }
      
      case 'START_GAME': {
        const { roomId } = data;
        roomApi.startGame(roomId);
        break;
      }
      
      case 'GAME_ACTION': {
        const { roomId, action } = data;
        // 执行游戏动作
        const updatedGameState = performAction(roomId, action);
        if (updatedGameState) {
          // 通知游戏状态更新
          globalEmitter.emit('GAME_STATE', { 
            roomId, 
            gameState: updatedGameState,
            hand: getPlayerHand(roomId, currentUser.email)
          });
          
          // 通知其他玩家
          globalEmitter.emit('ACTION', {
            roomId,
            gameData: {
              type: action.type,
              playerEmail: action.playerEmail,
              tile: action.tile,
              data: action.data
            },
            timestamp: new Date().toISOString()
          });
        }
        break;
      }
      
      default:
        break;
    }
    
    return true;
  },
  
  // 获取游戏状态
  fetchGameState: async (roomId) => {
    await delay();
    
    const gameState = mockGameStates[roomId];
    if (!gameState) {
      throw new Error('游戏未开始');
    }
    
    // 获取当前用户的手牌
    const playerHand = sortTiles(getPlayerHand(roomId, currentUser.email));
    
    return {
      gameState,
      hand: playerHand,
      revealedTiles: gameState.revealedTiles,
      discardPile: gameState.discardPile,
      drawPileCount: gameState.drawPileCount,
      playerHandCounts: gameState.playerHandCounts,
      recentActions: gameState.recentActions
    };
  }
};

// 创建初始游戏状态的辅助函数
const createInitialGameState = (roomId) => {
  const gameState = mockGameStates[roomId];
  if (gameState) return gameState;
  
  // 使用mockData中的createInitialGameState函数创建新游戏状态
  return mockGameStates[roomId];
}; 