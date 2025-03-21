// 从mock API导入
import { authApi, roomApi } from './mockApi';

// 直接导出模拟API
export { authApi, roomApi };

// 以下是原始API实现的注释版本，保留以便将来恢复
/*
// API配置
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// 处理HTTP错误响应
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || '请求失败';
    throw new Error(errorMessage);
  }
  return response.json();
};

// 获取本地存储的Token
const getToken = () => localStorage.getItem('auth_token');

// 创建带授权头的请求配置
const createAuthHeader = () => {
  const token = getToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    credentials: 'include',
  };
};

// 认证相关API
export const authApi = {
  getGithubLoginUrl: async () => {
    const response = await fetch(`${API_URL}/auth/github-login-url`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    return handleResponse(response);
  },

  updateNickname: async (nickname) => {
    const response = await fetch(`${API_URL}/auth/nickname`, {
      method: 'POST',
      ...createAuthHeader(),
      body: JSON.stringify({ nickname }),
    });
    return handleResponse(response);
  },

  validateToken: async () => {
    const token = getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/auth/validate`, {
        method: 'GET',
        ...createAuthHeader(),
      });
      return handleResponse(response);
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  },
};

// 房间相关API
export const roomApi = {
  getAllRooms: async () => {
    const response = await fetch(`${API_URL}/rooms`, {
      method: 'GET',
      ...createAuthHeader(),
    });
    return handleResponse(response);
  },

  createRoom: async () => {
    const response = await fetch(`${API_URL}/rooms`, {
      method: 'POST',
      ...createAuthHeader(),
    });
    return handleResponse(response);
  },

  getRoomById: async (roomId) => {
    const response = await fetch(`${API_URL}/rooms/${roomId}`, {
      method: 'GET',
      ...createAuthHeader(),
    });
    return handleResponse(response);
  },

  joinRoom: async (roomId, password) => {
    const response = await fetch(`${API_URL}/rooms/${roomId}/join`, {
      method: 'POST',
      ...createAuthHeader(),
      body: JSON.stringify({ password }),
    });
    return handleResponse(response);
  },

  startGame: async (roomId) => {
    const response = await fetch(`${API_URL}/rooms/${roomId}/start`, {
      method: 'POST',
      ...createAuthHeader(),
    });
    return handleResponse(response);
  },
};
*/ 