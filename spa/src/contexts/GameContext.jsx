import React, { createContext, useState, useContext, useEffect } from 'react';
import websocketService from '../services/websocket';
import { useAuth } from './AuthContext';
import { useRoom } from './RoomContext';

// 创建游戏上下文
const GameContext = createContext();

// 游戏提供者组件
export const GameProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentRoom } = useRoom();
  
  const [gameState, setGameState] = useState(null);
  const [playerHand, setPlayerHand] = useState([]);
  const [discardedTiles, setDiscardedTiles] = useState([]);
  const [remainingTiles, setRemainingTiles] = useState(0);
  const [recentActions, setRecentActions] = useState([]);
  const [winDeclared, setWinDeclared] = useState(false);
  const [declaredWinner, setDeclaredWinner] = useState(null);
  const [confirmations, setConfirmations] = useState([]);
  const [rejections, setRejections] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [allPlayerTiles, setAllPlayerTiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 当房间变化时，订阅相关主题
  useEffect(() => {
    if (currentRoom && user) {
      // 确保WebSocket已连接
      const token = localStorage.getItem('token');
      if (token) {
        websocketService.connect(token, () => {
          // 订阅游戏状态更新
          websocketService.gameOperations.subscribeToGameUpdates(
            currentRoom.roomId,
            handleGameStateUpdate
          );
          
          // 订阅游戏操作
          websocketService.gameOperations.subscribeToGameActions(
            currentRoom.roomId,
            handleGameAction
          );
          
          // 订阅错误消息
          websocketService.gameOperations.subscribeToErrors(
            user.email,
            handleError
          );
        });
      }
    }
    
    return () => {
      // 清理订阅
      if (currentRoom) {
        websocketService.unsubscribe(`/topic/game/${currentRoom.roomId}/state`);
        websocketService.unsubscribe(`/topic/game/${currentRoom.roomId}/actions`);
      }
      if (user) {
        websocketService.unsubscribe(`/user/${user.email}/queue/errors`);
      }
    };
  }, [currentRoom, user]);

  // 处理游戏状态更新
  const handleGameStateUpdate = (state) => {
    setGameState(state);
    
    if (state.playerHand) {
      setPlayerHand(state.playerHand);
    }
    
    if (state.discardedTiles) {
      setDiscardedTiles(state.discardedTiles);
    }
    
    if (state.remainingTiles !== undefined) {
      setRemainingTiles(state.remainingTiles);
    }
    
    if (state.winDeclared !== undefined) {
      setWinDeclared(state.winDeclared);
      if (state.declaredWinner) {
        setDeclaredWinner(state.declaredWinner);
      }
    }
    
    if (state.confirmations) {
      setConfirmations(state.confirmations);
    }
    
    if (state.rejections) {
      setRejections(state.rejections);
    }
    
    if (state.gameEnded !== undefined) {
      setGameEnded(state.gameEnded);
      if (state.gameEnded && state.allPlayerTiles) {
        setAllPlayerTiles(state.allPlayerTiles);
      }
    }
  };

  // 处理游戏操作
  const handleGameAction = (action) => {
    setRecentActions((prevActions) => {
      const newActions = [...prevActions, action];
      // 只保留最近的两个操作
      return newActions.slice(-2);
    });
  };

  // 处理错误
  const handleError = (error) => {
    setError(error.message || '发生错误，请稍后重试');
  };

  // 开始游戏
  const startGame = () => {
    if (!currentRoom) {
      setError('没有选择房间');
      return;
    }
    
    setLoading(true);
    try {
      websocketService.gameOperations.startGame(currentRoom.roomId);
    } catch (error) {
      setError('开始游戏失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 执行游戏操作
  const performAction = (actionType, tiles = []) => {
    if (!currentRoom) {
      setError('没有选择房间');
      return;
    }
    
    setLoading(true);
    try {
      websocketService.gameOperations.performAction(
        currentRoom.roomId,
        actionType,
        tiles
      );
    } catch (error) {
      setError('执行操作失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 抽牌
  const drawTiles = (count = 1) => {
    performAction('DRAW', [{ count }]);
  };

  // 打出牌
  const discardTile = (tile) => {
    performAction('DISCARD', [tile]);
  };

  // 拿取牌
  const takeTiles = (tiles) => {
    performAction('TAKE', tiles);
  };

  // 明牌
  const revealTiles = (tiles) => {
    performAction('REVEAL', tiles);
  };

  // 宣布胜利
  const declareWin = () => {
    performAction('DECLARE_WIN');
  };

  // 确认胜利
  const confirmWin = () => {
    performAction('CONFIRM_WIN');
  };

  // 拒绝胜利宣言
  const rejectWin = () => {
    performAction('REJECT_WIN');
  };

  // 重新排序手牌
  const reorderTiles = (newTiles) => {
    // 这里只在本地更新手牌顺序，不发送到服务器
    // 因为手牌顺序只影响UI显示，不影响游戏逻辑
    setPlayerHand(newTiles);
  };

  // 清除错误
  const clearError = () => {
    setError(null);
  };

  // 提供的上下文值
  const value = {
    gameState,
    playerHand,
    discardedTiles,
    remainingTiles,
    recentActions,
    winDeclared,
    declaredWinner,
    confirmations,
    rejections,
    gameEnded,
    allPlayerTiles,
    loading,
    error,
    startGame,
    drawTiles,
    discardTile,
    takeTiles,
    revealTiles,
    declareWin,
    confirmWin,
    rejectWin,
    clearError,
    reorderTiles,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// 自定义钩子，方便使用游戏上下文
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame必须在GameProvider内部使用');
  }
  return context;
};

export default GameContext; 