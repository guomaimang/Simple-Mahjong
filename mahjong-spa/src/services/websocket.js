// WebSocket服务配置
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/game';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.listeners = new Map();
    this.connectionPromise = null;
    this.isConnecting = false;
  }

  // 检查WebSocket是否已连接
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  // 连接WebSocket
  connect() {
    // 如果已经连接或正在连接，返回现有Promise
    if (this.isConnected()) {
      console.log('WebSocket already connected');
      return Promise.resolve(this.socket);
    }

    if (this.isConnecting && this.connectionPromise) {
      console.log('WebSocket connection in progress');
      return this.connectionPromise;
    }

    console.log('Initiating new WebSocket connection');
    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          this.isConnecting = false;
          reject(new Error('No authentication token found'));
          return;
        }

        // 清理旧连接
        if (this.socket) {
          try {
            this.socket.close();
          } catch (err) {
            console.warn('Error closing existing socket:', err);
          }
        }

        // 添加CONNECTED消息类型的监听器
        if (!this.listeners.has('CONNECTED')) {
          this.addListener('CONNECTED', (data) => {
            console.log('Received CONNECTED message:', data);
            
            // 如果当前在游戏中，且URL包含房间ID，自动重新获取游戏状态
            const path = window.location.pathname;
            const match = path.match(/\/rooms\/(\d+)\/game/);
            if (match && match[1]) {
              const roomId = match[1];
              console.log('Automatically requesting game state for room:', roomId);
              setTimeout(() => this.getGameState(roomId), 500);
            }
          });
        }

        console.log('Creating new WebSocket connection');
        this.socket = new WebSocket(`${WS_URL}?token=${token}`);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve(this.socket);
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.socket = null;
          
          // 尝试重新连接
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`Attempting to reconnect in ${timeout}ms...`);
            
            this.reconnectTimeout = setTimeout(() => {
              this.reconnectAttempts++;
              this.connect().catch(err => console.error('Reconnection failed:', err));
            }, timeout);
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.socket.onmessage = (event) => {
          try {
            console.log(`Received WebSocket message: ${event.data}`);
            const message = JSON.parse(event.data);
            const { type, data } = message;
            
            console.log(`Processing message of type: ${type}, data:`, data);
            
            // 对WIN_CLAIM消息进行特殊处理
            if (type === 'WIN_CLAIM') {
              console.log('收到胜利声明消息，详细数据:', JSON.stringify(data));
            }
            
            // 对GAME_STATE消息进行特殊处理
            if (type === 'GAME_STATE') {
              console.log(`Received GAME_STATE message with data:`, data);
              if (!data || (!data.gameState && !data.status)) {
                console.error('Received empty or invalid game state:', data);
              }
              
              // 检查胜利相关字段
              if (data.pendingWinner) {
                console.log('游戏状态包含pendingWinner字段:', data.pendingWinner);
              }
              
              if (data.winConfirmations) {
                console.log('游戏状态包含winConfirmations字段:', data.winConfirmations);
              }
            }
            
            // 处理错误消息的特殊处理
            if (type === 'ERROR' && !this.listeners.has(type)) {
              console.warn(`No listeners registered for ERROR message:`, data);
              // 自动注册一个默认的错误监听器以显示错误
              this.addDefaultErrorListener();
            }
            
            // 调用相应的监听器处理消息
            if (this.listeners.has(type)) {
              console.log(`Found ${this.listeners.get(type).length} listeners for type: ${type}`);
              // 为所有消息类型创建一个监听器的副本，以避免在回调中修改数组时出现问题
              const listeners = [...this.listeners.get(type)];
              console.log(`Calling ${listeners.length} listeners for ${type}`);
              
              listeners.forEach(callback => {
                try {
                  console.log(`Executing listener for ${type}`);
                  callback(data);
                } catch (err) {
                  console.error(`Error in ${type} listener:`, err);
                }
              });
            } else {
              console.log(`No listeners found for message type: ${type}`);
            }
            
            // 处理系统消息
            if (type === 'SYSTEM_NOTIFICATION') {
              console.log('System notification:', data.message);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err, event.data);
          }
        };
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });

    return this.connectionPromise;
  }

  // 断开WebSocket连接
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.isConnecting = false;
    this.connectionPromise = null;
  }

  // 向服务器发送消息
  async send(type, data) {
    try {
      const socket = await this.connect();
      if (socket.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({ type, data });
        console.log(`Sending WebSocket message: ${message}`);
        socket.send(message);
      } else {
        console.error(`WebSocket not open. Current state: ${socket.readyState}`);
        
        // 如果WebSocket未打开，尝试重新连接然后再发送
        console.log('Attempting to reconnect...');
        await this.disconnect();
        const newSocket = await this.connect();
        
        if (newSocket.readyState === WebSocket.OPEN) {
          const message = JSON.stringify({ type, data });
          console.log(`Resending WebSocket message after reconnection: ${message}`);
          newSocket.send(message);
        } else {
          throw new Error('WebSocket reconnection failed');
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      throw err;
    }
  }

  // 添加消息类型的监听器
  addListener(type, callback) {
    console.log(`Adding listener for message type: ${type}`);
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  // 移除消息类型的监听器
  removeListener(type, callback) {
    if (this.listeners.has(type)) {
      const listeners = this.listeners.get(type);
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // 房间相关WebSocket方法
  joinRoom(roomId) {
    return this.send('JOIN_ROOM', { roomId });
  }

  leaveRoom(roomId) {
    return this.send('LEAVE_ROOM', { roomId });
  }

  startGame(roomId) {
    return this.send('START_GAME', { roomId });
  }

  // 游戏相关WebSocket方法
  drawTile(roomId) {
    // 只能抽一张牌
    return this.send('DRAW_TILE', { roomId });
  }

  discardTile(roomId, tile) {
    return this.send('DISCARD_TILE', { roomId, tile });
  }

  takeTile(roomId, tile) {
    // 从tile对象中提取id
    return this.send('TAKE_TILE', { roomId, tileId: tile.id });
  }

  revealTiles(roomId, tiles) {
    // 从每个tile对象中提取id，支持多张牌明牌
    const tileIds = tiles.map(tile => tile.id);
    return this.send('REVEAL_TILES', { roomId, tileIds });
  }

  hideTiles(roomId, tiles) {
    // 从每个tile对象中提取id，支持多张牌暗牌
    const tileIds = tiles.map(tile => tile.id);
    return this.send('HIDE_TILES', { roomId, tileIds });
  }

  claimWin(roomId) {
    return this.send('CLAIM_WIN', { roomId });
  }

  confirmWin(roomId, winnerEmail, confirm) {
    return this.send('CONFIRM_WIN', { roomId, winnerEmail, confirm });
  }

  getGameState(roomId) {
    console.log(`Requesting game state for room: ${roomId}`);
    // 添加一个随机标识符，用于调试
    const requestId = Math.floor(Math.random() * 1000000);
    console.log(`Game state request ID: ${requestId}`);
    return this.send('GET_GAME_STATE', { roomId, requestId });
  }

  // 添加默认的错误消息监听器
  addDefaultErrorListener() {
    console.log('Adding default ERROR listener');
    this.addListener('ERROR', (data) => {
      console.warn(`Default error handler: ${data.code} - ${data.message}`);
      // 这里可以添加全局错误处理逻辑，如显示toast提示等
    });
  }
}

// 创建单例实例
const websocketService = new WebSocketService();
export default websocketService; 