import React, { createContext, useState, useContext } from 'react';
import { roomAPI } from '../services/api';

// 创建房间上下文
const RoomContext = createContext();

// 房间提供者组件
export const RoomProvider = ({ children }) => {
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 获取房间列表
  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const roomsList = await roomAPI.getRooms();
      setRooms(roomsList);
      
      return roomsList;
    } catch (error) {
      console.error('获取房间列表失败:', error);
      setError(error.response?.data?.error || '获取房间列表失败，请稍后重试');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 创建房间
  const createRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const room = await roomAPI.createRoom();
      setCurrentRoom(room);
      
      // 更新房间列表
      await fetchRooms();
      
      return room;
    } catch (error) {
      console.error('创建房间失败:', error);
      setError(error.response?.data?.error || '创建房间失败，请稍后重试');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 加入房间
  const joinRoom = async (roomId, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const room = await roomAPI.joinRoom(roomId, password);
      setCurrentRoom(room);
      
      return room;
    } catch (error) {
      console.error('加入房间失败:', error);
      setError(error.response?.data?.error || '加入房间失败，请检查房间号和密码');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 获取房间详情
  const fetchRoomDetail = async (roomId) => {
    try {
      setLoading(true);
      setError(null);
      
      const room = await roomAPI.getRoomDetail(roomId);
      setCurrentRoom(room);
      
      return room;
    } catch (error) {
      console.error('获取房间详情失败:', error);
      setError(error.response?.data?.error || '获取房间详情失败，请稍后重试');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 离开房间
  const leaveRoom = async (roomId) => {
    try {
      setLoading(true);
      setError(null);
      
      await roomAPI.leaveRoom(roomId);
      setCurrentRoom(null);
      
      // 更新房间列表
      await fetchRooms();
      
      return true;
    } catch (error) {
      console.error('离开房间失败:', error);
      setError(error.response?.data?.error || '离开房间失败，请稍后重试');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 更新当前房间信息
  const updateCurrentRoom = (roomData) => {
    setCurrentRoom(roomData);
  };

  // 提供的上下文值
  const value = {
    rooms,
    currentRoom,
    loading,
    error,
    fetchRooms,
    createRoom,
    joinRoom,
    fetchRoomDetail,
    leaveRoom,
    updateCurrentRoom,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

// 自定义钩子，方便使用房间上下文
export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom必须在RoomProvider内部使用');
  }
  return context;
};

export default RoomContext; 