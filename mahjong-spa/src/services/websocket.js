// 从mock服务导入
import { mockWebsocketService } from './mockApi';

// 直接导出mock服务实例
export default mockWebsocketService;

// 以下是原始WebSocket实现的注释版本，保留以便将来恢复
/*
// WebSocket配置
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

// WebSocket服务
class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = {};
    this.connectionPromise = null;
    this.keepAliveInterval = null;
    this.connectionQueue = [];
    this.processingQueue = false;
  }

  // 初始化WebSocket连接
  connect() {
    // 如果已连接或正在连接，返回现有的Promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // 获取token
        const token = localStorage.getItem('auth_token');
        if (!token) {
          this.connectionPromise = null;
          return reject(new Error('未找到认证令牌'));
        }

        // 创建WebSocket连接
        const wsUrl = `${WS_URL}?token=${token}`;
        console.log(`Connecting to WebSocket at ${wsUrl}`);
        this.socket = new WebSocket(wsUrl);

        // 设置连接超时
        const connectionTimeout = setTimeout(() => {
          if (!this.connected) {
            this.socket.close();
            this.connectionPromise = null;
            reject(new Error('WebSocket连接超时'));
          }
        }, 10000);

        // 连接成功
        this.socket.onopen = () => {
          console.log('WebSocket连接成功');
          clearTimeout(connectionTimeout);
          this.connected = true;
          this.reconnectAttempts = 0;
          this.connectionPromise = null;
          this.setupKeepAlive();
          this.processQueue();
          resolve(true);
        };

        // 接收消息
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message:', data);
          
            // 处理服务器响应
            if (data.type && this.listeners[data.type]) {
              this.listeners[data.type].forEach(callback => callback(data.payload));
            }
          } catch (error) {
            console.error('处理WebSocket消息时出错:', error);
          }
        };

        // 连接错误
        this.socket.onerror = (error) => {
          console.error('WebSocket连接错误:', error);
          clearTimeout(connectionTimeout);
          if (!this.connected) {
            this.connectionPromise = null;
          reject(error);
          }
        };

        // 连接关闭
        this.socket.onclose = (event) => {
          console.log(`WebSocket连接关闭: ${event.code} ${event.reason}`);
          clearTimeout(connectionTimeout);
          this.connected = false;
          clearInterval(this.keepAliveInterval);
            
          // 尝试重新连接
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            console.log(`${this.reconnectAttempts}秒后尝试重新连接...`);
            setTimeout(() => this.reconnect(), delay);
              } else {
            this.connectionPromise = null;
            console.error('WebSocket重连失败，达到最大重试次数');
          }
        };
      } catch (error) {
        console.error('初始化WebSocket时出错:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // 重新连接
  reconnect() {
    console.log('尝试重新连接WebSocket...');
    this.disconnect();
    return this.connect();
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.connected = false;
      clearInterval(this.keepAliveInterval);
      this.socket.close();
      this.socket = null;
    }
  }

  // 设置保持连接的心跳
  setupKeepAlive() {
    clearInterval(this.keepAliveInterval);
    this.keepAliveInterval = setInterval(() => {
      if (this.connected) {
        this.sendMessage('PING', {});
      }
    }, 30000);
  }

  // 添加消息监听器
  addListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    // 返回一个清理函数，用于移除监听器
    return () => this.removeListener(event, callback);
  }

  // 移除消息监听器
  removeListener(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  // 发送消息
  async sendMessage(type, payload) {
    // 如果未连接，则将消息加入队列
    if (!this.connected) {
      return new Promise((resolve, reject) => {
        this.connectionQueue.push({
          type,
          payload,
          resolve,
          reject
        });
        
        // 尝试连接并处理队列
        this.connect()
          .catch(error => {
            // 处理连接失败的情况
            this.connectionQueue.forEach(item => item.reject(error));
            this.connectionQueue = [];
          });
      });
    }
    
    // 如果已连接，直接发送消息
    return new Promise((resolve, reject) => {
      try {
        const message = JSON.stringify({
          type,
          payload
        });
        
        this.socket.send(message);
        resolve(true);
      } catch (error) {
        console.error('发送WebSocket消息时出错:', error);
        reject(error);
    }
    });
  }

  // 处理队列中的消息
  async processQueue() {
    if (this.processingQueue || this.connectionQueue.length === 0) return;
    
    this.processingQueue = true;
    
    while (this.connectionQueue.length > 0) {
      const { type, payload, resolve, reject } = this.connectionQueue.shift();
      
      try {
        if (this.connected) {
          await this.sendMessage(type, payload)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('WebSocket未连接'));
  }
      } catch (error) {
        reject(error);
  }
    }
    
    this.processingQueue = false;
  }

  // 获取游戏状态
  async fetchGameState(roomId) {
    if (!this.connected) {
      await this.connect();
  }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener('GAME_STATE', onGameState);
        reject(new Error('获取游戏状态超时'));
      }, 5000);
      
      const onGameState = (data) => {
        if (data.roomId === roomId || data.gameState?.roomId === roomId) {
          clearTimeout(timeout);
          this.removeListener('GAME_STATE', onGameState);
          resolve(data);
        }
      };
      
      this.addListener('GAME_STATE', onGameState);
      this.sendMessage('GET_GAME_STATE', { roomId })
        .catch(error => {
          clearTimeout(timeout);
          this.removeListener('GAME_STATE', onGameState);
          reject(error);
        });
    });
  }
}

// 创建WebSocket服务实例
const websocketService = new WebSocketService();

export default websocketService; 
*/ 