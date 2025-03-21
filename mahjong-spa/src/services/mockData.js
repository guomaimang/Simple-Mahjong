// 模拟用户数据
export const mockUsers = [
  {
    id: '1',
    email: 'player1@example.com',
    name: '玩家一',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=player1',
    nickname: '东风之主'
  },
  {
    id: '2',
    email: 'player2@example.com',
    name: '玩家二',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=player2',
    nickname: '南风之子'
  },
  {
    id: '3',
    email: 'player3@example.com',
    name: '玩家三',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=player3',
    nickname: '西风使者'
  },
  {
    id: '4',
    email: 'player4@example.com',
    name: '玩家四',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=player4',
    nickname: '北风使者'
  },
];

// 当前用户（默认为第一个用户）
export const currentUser = mockUsers[0];

// 模拟房间数据
export const mockRooms = [
  {
    id: '101',
    name: '初级麻将室',
    createdBy: mockUsers[0].email,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: 'waiting', // waiting, playing, finished
    playerCount: 2,
    maxPlayers: 4,
    hasPassword: false,
  },
  {
    id: '102',
    name: '中级麻将室',
    createdBy: mockUsers[1].email,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'playing',
    playerCount: 4,
    maxPlayers: 4,
    hasPassword: true,
  },
  {
    id: '103',
    name: '高级麻将室',
    createdBy: mockUsers[2].email,
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    status: 'waiting',
    playerCount: 1,
    maxPlayers: 4,
    hasPassword: false,
  },
];

// 模拟房间玩家数据
export const mockRoomPlayers = {
  '101': [mockUsers[0], mockUsers[1]],
  '102': [mockUsers[0], mockUsers[1], mockUsers[2], mockUsers[3]],
  '103': [mockUsers[2]],
};

// 模拟麻将牌数据
export const createTile = (suit, value, id) => ({
  id: id || `${suit}-${value}-${Math.random().toString(36).substring(2, 9)}`,
  suit,
  value
});

export const createTiles = () => {
  const suits = ['bamboo', 'dots', 'characters'];
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const winds = ['east', 'south', 'west', 'north'];
  const dragons = ['red', 'green', 'white'];
  
  const tiles = [];
  
  // 数牌 (每种4张)
  suits.forEach(suit => {
    values.forEach(value => {
      for (let i = 0; i < 4; i++) {
        tiles.push(createTile(suit, value));
      }
    });
  });
  
  // 风牌 (每种4张)
  winds.forEach(wind => {
    for (let i = 0; i < 4; i++) {
      tiles.push(createTile('wind', wind));
    }
  });
  
  // 三元牌 (每种4张)
  dragons.forEach(dragon => {
    for (let i = 0; i < 4; i++) {
      tiles.push(createTile('dragon', dragon));
    }
  });
  
  return tiles;
};

// 洗牌函数
export const shuffleTiles = (tiles) => {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// 创建游戏初始状态
export const createInitialGameState = (roomId) => {
  const allTiles = shuffleTiles(createTiles());
  const room = mockRooms.find(r => r.id === roomId);
  
  if (!room) return null;
  
  const players = mockRoomPlayers[roomId] || [];
  if (players.length < 2) return null;
  
  // 分发初始手牌 (每人13张)
  const hands = {};
  const revealedTiles = {};
  const playerHandCounts = {};
  
  players.forEach((player, index) => {
    const startIdx = index * 13;
    hands[player.email] = allTiles.slice(startIdx, startIdx + 13);
    revealedTiles[player.email] = [];
    playerHandCounts[player.email] = 13;
  });
  
  // 剩余的牌作为牌堆
  const usedTilesCount = players.length * 13;
  const drawPile = allTiles.slice(usedTilesCount);
  
  return {
    roomId,
    status: 'playing',
    currentTurn: players[0].email, // 第一个玩家先手
    players: players.map(p => p.email),
    playerInfo: players.reduce((acc, p) => {
      acc[p.email] = { name: p.name, nickname: p.nickname, avatar: p.avatar };
      return acc;
    }, {}),
    hands,
    revealedTiles,
    discardPile: [],
    drawPile,
    drawPileCount: drawPile.length,
    playerHandCounts,
    recentActions: [],
    wind: 'east', // 初始为东风局
    pendingWinner: null,
    winConfirmations: {},
    lastAction: null,
    lastActionTime: new Date().toISOString(),
  };
};

// 模拟游戏状态数据
export const mockGameStates = {
  '101': createInitialGameState('101'),
  '102': createInitialGameState('102'),
  '103': null // 房间未开始游戏
};

// 获取当前玩家的手牌
export const getPlayerHand = (roomId, playerEmail) => {
  const gameState = mockGameStates[roomId];
  if (!gameState || !gameState.hands[playerEmail]) return [];
  return gameState.hands[playerEmail];
};

// 玩家执行动作 (出牌、吃、碰、杠等)
export const performAction = (roomId, action) => {
  const gameState = mockGameStates[roomId];
  if (!gameState) return null;
  
  // 根据动作类型更新游戏状态
  switch (action.type) {
    case 'DISCARD': {
      // 玩家出牌
      const { playerEmail, tile } = action;
      
      // 从玩家手牌中移除该牌
      gameState.hands[playerEmail] = gameState.hands[playerEmail].filter(t => t.id !== tile.id);
      
      // 将牌添加到弃牌堆
      gameState.discardPile.push(tile);
      
      // 更新玩家手牌数量
      gameState.playerHandCounts[playerEmail]--;
      
      // 更新最后操作
      gameState.lastAction = action;
      gameState.lastActionTime = new Date().toISOString();
      
      // 轮到下一个玩家
      const currentPlayerIndex = gameState.players.indexOf(playerEmail);
      const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
      gameState.currentTurn = gameState.players[nextPlayerIndex];
      
      // 下一个玩家摸牌
      if (gameState.drawPile.length > 0) {
        const drawnTile = gameState.drawPile.pop();
        gameState.hands[gameState.currentTurn].push(drawnTile);
        gameState.playerHandCounts[gameState.currentTurn]++;
        gameState.drawPileCount = gameState.drawPile.length;
      }
      
      break;
    }
    
    // 可以添加更多动作类型...
    
    default:
      break;
  }
  
  // 添加到最近动作列表
  gameState.recentActions.push({
    type: action.type,
    playerEmail: action.playerEmail,
    data: action.tile || action.data,
    timestamp: new Date().toISOString()
  });
  
  // 只保留最近的20个操作
  if (gameState.recentActions.length > 20) {
    gameState.recentActions = gameState.recentActions.slice(gameState.recentActions.length - 20);
  }
  
  return gameState;
};

// 排序麻将牌函数
export const sortTiles = (tiles) => {
  if (!tiles || !Array.isArray(tiles)) return [];
  
  const suitOrder = { bamboo: 1, dots: 2, characters: 3, wind: 4, dragon: 5 };
  const windOrder = { east: 1, south: 2, west: 3, north: 4 };
  const dragonOrder = { red: 1, green: 2, white: 3 };
  
  return [...tiles].sort((a, b) => {
    // 先按花色排序
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    
    // 如果是风牌，按风的方向排序
    if (a.suit === 'wind') {
      return windOrder[a.value] - windOrder[b.value];
    }
    
    // 如果是三元牌，按特定顺序排序
    if (a.suit === 'dragon') {
      return dragonOrder[a.value] - dragonOrder[b.value];
    }
    
    // 其他牌按数字排序
    return a.value - b.value;
  });
}; 