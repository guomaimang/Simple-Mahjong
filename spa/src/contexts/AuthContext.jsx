import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';

// 创建认证上下文
const AuthContext = createContext();

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 初始化时检查本地存储中的用户信息
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('user');

    if (token && userInfo) {
      try {
        setUser(JSON.parse(userInfo));
      } catch (error) {
        console.error('解析用户信息失败:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  // 登录/注册
  const login = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.login(email);
      
      // 保存token和用户信息
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      setUser(response.user);
      return response.user;
    } catch (error) {
      console.error('登录失败:', error);
      setError(error.response?.data?.error || '登录失败，请稍后重试');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 更新昵称
  const updateNickname = async (nickname) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedUser = await authAPI.updateNickname(nickname);
      
      // 更新本地存储中的用户信息
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('更新昵称失败:', error);
      setError(error.response?.data?.error || '更新昵称失败，请稍后重试');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // 提供的上下文值
  const value = {
    user,
    loading,
    error,
    login,
    updateNickname,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 自定义钩子，方便使用认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
};

export default AuthContext; 