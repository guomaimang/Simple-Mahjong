import axios from 'axios';

// API基础URL，可以根据环境配置
const API_BASE_URL = 'http://localhost:8080/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器，添加认证token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器，处理错误
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // 未授权，清除token并重定向到登录页
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  // 登录/注册
  login: (email) => {
    return api.post('/auth/login', { email });
  },
  
  // 更新昵称
  updateNickname: (nickname) => {
    return api.put('/auth/nickname', { nickname });
  },
};

// 房间相关API
export const roomAPI = {
  // 创建房间
  createRoom: () => {
    return api.post('/rooms');
  },
  
  // 获取房间列表
  getRooms: () => {
    return api.get('/rooms');
  },
  
  // 加入房间
  joinRoom: (roomId, password) => {
    return api.post(`/rooms/${roomId}/join`, { password });
  },
  
  // 获取房间详情
  getRoomDetail: (roomId) => {
    return api.get(`/rooms/${roomId}`);
  },
  
  // 离开房间
  leaveRoom: (roomId) => {
    return api.post(`/rooms/${roomId}/leave`);
  },
};

export default api; 