import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// WebSocket服务器URL
const SOCKET_URL = 'http://localhost:8080/ws';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = {};
  }

  // 连接WebSocket
  connect(token, onConnected, onError) {
    if (this.connected) {
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL),
      connectHeaders: {
        Authorization: token,
      },
      debug: function (str) {
        console.log('STOMP: ' + str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        this.connected = true;
        if (onConnected) {
          onConnected();
        }
      },
      onStompError: (frame) => {
        console.error('STOMP错误:', frame.headers['message']);
        console.error('附加信息:', frame.body);
        if (onError) {
          onError(frame);
        }
      },
      onDisconnect: () => {
        this.connected = false;
      },
    });

    this.client.activate();
  }

  // 断开WebSocket连接
  disconnect() {
    if (this.client && this.connected) {
      this.client.deactivate();
      this.connected = false;
      this.subscriptions = {};
    }
  }

  // 订阅主题
  subscribe(destination, callback) {
    if (!this.client || !this.connected) {
      console.error('WebSocket未连接');
      return null;
    }

    if (this.subscriptions[destination]) {
      return this.subscriptions[destination];
    }

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const payload = JSON.parse(message.body);
        callback(payload);
      } catch (error) {
        console.error('解析消息失败:', error);
        callback(message.body);
      }
    });

    this.subscriptions[destination] = subscription;
    return subscription;
  }

  // 取消订阅
  unsubscribe(destination) {
    if (this.subscriptions[destination]) {
      this.subscriptions[destination].unsubscribe();
      delete this.subscriptions[destination];
    }
  }

  // 发送消息
  send(destination, body) {
    if (!this.client || !this.connected) {
      console.error('WebSocket未连接');
      return;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
  }

  // 游戏相关WebSocket操作
  gameOperations = {
    // 开始游戏
    startGame: (roomId) => {
      this.send(`/app/game/${roomId}/start`, {});
    },

    // 执行游戏操作
    performAction: (roomId, action, tiles = []) => {
      this.send(`/app/game/${roomId}/action`, {
        action,
        tiles,
      });
    },

    // 订阅游戏状态更新
    subscribeToGameUpdates: (roomId, callback) => {
      return this.subscribe(`/topic/game/${roomId}/state`, callback);
    },

    // 订阅游戏操作
    subscribeToGameActions: (roomId, callback) => {
      return this.subscribe(`/topic/game/${roomId}/actions`, callback);
    },

    // 订阅错误消息
    subscribeToErrors: (email, callback) => {
      return this.subscribe(`/user/${email}/queue/errors`, callback);
    },
  };
}

// 创建单例
const websocketService = new WebSocketService();
export default websocketService; 