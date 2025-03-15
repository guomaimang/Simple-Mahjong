import { create } from 'zustand';
import { authApi } from '../services/api';

// 创建认证状态存储
export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  loading: false,
  error: null,

  // 初始化，检查是否已存在有效令牌
  initialize: async () => {
    set({ loading: true, error: null });
    try {
      // 检查URL中是否有token参数（GitHub OAuth回调）
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');
      
      if (tokenFromUrl) {
        // 如果URL中有token，保存并使用它
        localStorage.setItem('auth_token', tokenFromUrl);
        // 清除URL中的token参数
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      const response = await authApi.validateToken();
      if (response && response.user) {
        set({ 
          user: response.user,
          isAuthenticated: true,
          isInitialized: true,
          loading: false,
        });
      } else {
        set({ 
          user: null,
          isAuthenticated: false,
          isInitialized: true,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      localStorage.removeItem('auth_token');
      set({ 
        user: null, 
        isAuthenticated: false,
        isInitialized: true,
        loading: false,
        error: error.message,
      });
    }
  },

  // 用户登录（邮箱方式）
  login: async (email) => {
    set({ loading: true, error: null });
    try {
      const response = await authApi.login(email);
      if (response && response.token) {
        localStorage.setItem('auth_token', response.token);
        set({ 
          user: response.user,
          isAuthenticated: true,
          loading: false,
        });
        return true;
      }
      return false;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
      return false;
    }
  },

  // GitHub登录
  loginWithGithub: async () => {
    set({ loading: true, error: null });
    try {
      const response = await authApi.getGithubLoginUrl();
      if (response && response.url) {
        // 重定向到GitHub授权页面
        window.location.href = response.url;
        return true;
      }
      set({ loading: false, error: "无法获取GitHub登录URL" });
      return false;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
      return false;
    }
  },

  // 用户登出
  logout: () => {
    localStorage.removeItem('auth_token');
    set({ 
      user: null, 
      isAuthenticated: false,
      loading: false,
    });
  },

  // 更新昵称
  updateNickname: async (nickname) => {
    set({ loading: true, error: null });
    try {
      const response = await authApi.updateNickname(nickname);
      if (response && response.user) {
        set({ 
          user: response.user,
          loading: false,
        });
        return true;
      }
      return false;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
      return false;
    }
  },
})); 