import { create } from 'zustand';
import { roomApi } from '../services/api';

// 创建房间状态存储
export const useRoomStore = create((set, get) => ({
  rooms: [],
  currentRoom: null,
  players: [],
  loading: false,
  error: null,

  // 获取所有房间
  fetchRooms: async () => {
    set({ loading: true, error: null });
    try {
      const response = await roomApi.getAllRooms();
      if (response && response.rooms) {
        set({ 
          rooms: response.rooms,
          loading: false,
        });
      }
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
    }
  },

  // 创建新房间
  createRoom: async () => {
    set({ loading: true, error: null });
    try {
      const response = await roomApi.createRoom();
      if (response && response.room) {
        set(state => ({ 
          rooms: [...state.rooms, response.room],
          currentRoom: response.room,
          loading: false,
        }));
        return response.room;
      }
      return null;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
      return null;
    }
  },

  // 获取特定房间信息
  fetchRoom: async (roomId) => {
    set({ loading: true, error: null });
    try {
      const response = await roomApi.getRoomById(roomId);
      if (response && response.room) {
        set({ 
          currentRoom: response.room,
          players: response.players || [],
          loading: false,
        });
        return response;
      }
      return null;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.message,
      });
      return null;
    }
  },

  // 加入房间
  joinRoom: async (roomId, password) => {
    set({ loading: true, error: null });
    try {
      const response = await roomApi.joinRoom(roomId, password);
      if (response && response.room) {
        set({ 
          currentRoom: response.room,
          players: response.players || [],
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

  // 开始游戏
  startGame: async (roomId) => {
    set({ loading: true, error: null });
    try {
      const response = await roomApi.startGame(roomId);
      if (response && response.success) {
        // 游戏状态更新通常通过WebSocket接收
        set({ loading: false });
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

  // 更新当前房间状态（通常由WebSocket更新调用）
  updateCurrentRoom: (room) => {
    if (room) {
      set({ currentRoom: room });
    }
  },

  // 更新当前房间玩家（通常由WebSocket更新调用）
  updatePlayers: (players) => {
    if (players) {
      set({ players });
    }
  },

  // 退出当前房间
  leaveCurrentRoom: () => {
    set({ 
      currentRoom: null,
      players: [],
    });
  },
})); 