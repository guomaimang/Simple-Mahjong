import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRoomStore } from '../stores/roomStore';
import { useAuthStore } from '../stores/authStore';
import websocketService from '../services/websocket';
import '../styles/Room.css';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { 
    currentRoom, 
    players, 
    loading, 
    error, 
    fetchRoom, 
    joinRoom, 
    startGame,
    leaveCurrentRoom
  } = useRoomStore();
  
  const [password, setPassword] = useState(location.state?.password || '');
  const [hasJoined, setHasJoined] = useState(false);
  const [systemMessages, setSystemMessages] = useState([]);
  const refreshTimerRef = useRef(null); // 用于保存定时器引用

  useEffect(() => {
    const initRoom = async () => {
      try {
        const response = await fetchRoom(roomId);
        if (response) {
          // 检查用户是否已在房间中
          const isInRoom = response.players.some(player => player.email === user.email);
          setHasJoined(isInRoom);
          
          // 如果房间状态是PLAYING，直接跳转到游戏页面
          if (response.room.status === 'PLAYING') {
            navigate(`/rooms/${roomId}/game`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch room:', error);
      }
    };

    initRoom();

    // 连接WebSocket
    websocketService.connect().then(() => {
      // 添加系统消息监听器
      websocketService.addListener('SYSTEM_NOTIFICATION', (data) => {
        if (data.roomId === roomId) {
          setSystemMessages(prev => [...prev, data.message]);
          
          // 如果系统消息表明游戏已开始，自动进入游戏
          if (data.message.includes('游戏已开始') || data.message.includes('游戏开始')) {
            console.log('系统消息表明游戏已开始，准备跳转...');
            navigate(`/rooms/${roomId}/game`);
          }
        }
      });

      // 添加房间状态更新监听器
      websocketService.addListener('ROOM_STATE_UPDATE', (data) => {
        if (data.roomId === roomId) {
          console.log('收到房间状态更新:', data);
          // 立即获取最新房间状态
          fetchRoom(roomId);
          
          if (data.status === 'PLAYING') {
            console.log('收到状态更新：游戏已开始，正在进入游戏...');
            navigate(`/rooms/${roomId}/game`);
          }
        }
      });
      
      // 添加游戏状态监听器
      websocketService.addListener('GAME_STATE', (data) => {
        if (data.roomId === roomId) {
          console.log('收到游戏状态更新，正在进入游戏...');
          navigate(`/rooms/${roomId}/game`);
        }
      });
    });

    // 设置自动刷新定时器 - 每5秒刷新一次房间状态
    refreshTimerRef.current = setInterval(async () => {
      if (hasJoined) {
        try {
          const response = await fetchRoom(roomId);
          // 如果房间状态是PLAYING，直接跳转到游戏页面
          if (response && response.room && response.room.status === 'PLAYING') {
            console.log('游戏已开始，正在进入游戏页面...');
            navigate(`/rooms/${roomId}/game`);
          }
        } catch (error) {
          console.error('Failed to refresh room:', error);
        }
      }
    }, 5000);

    return () => {
      // 清理定时器
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      // 清理监听器
      websocketService.removeListener('SYSTEM_NOTIFICATION');
      websocketService.removeListener('ROOM_STATE_UPDATE');
      websocketService.removeListener('GAME_STATE');
      leaveCurrentRoom();
    };
  }, [roomId, fetchRoom, user, navigate, leaveCurrentRoom, hasJoined]);

  // 当用户加入房间时，也需要更新定时器状态
  useEffect(() => {
    // 如果玩家已加入，确保定时器正在运行
    if (hasJoined && !refreshTimerRef.current) {
      refreshTimerRef.current = setInterval(async () => {
        try {
          const response = await fetchRoom(roomId);
          // 如果房间状态是PLAYING，直接跳转到游戏页面
          if (response && response.room && response.room.status === 'PLAYING') {
            console.log('游戏已开始，正在进入游戏页面...');
            navigate(`/rooms/${roomId}/game`);
          }
        } catch (error) {
          console.error('Failed to refresh room:', error);
        }
      }, 5000);
    }
    
    return () => {
      // 组件卸载时清理定时器
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [hasJoined, roomId, fetchRoom, navigate]);

  const handleJoinRoom = async () => {
    if (!password) {
      alert('请输入房间密码');
      return;
    }

    const success = await joinRoom(roomId, password);
    if (success) {
      setHasJoined(true);
      websocketService.joinRoom(roomId);
      // 立即获取一次最新的玩家列表
      fetchRoom(roomId);
    }
  };

  const handleStartGame = async () => {
    const success = await startGame(roomId);
    if (success) {
      websocketService.startGame(roomId);
    }
  };

  const handleLeaveRoom = () => {
    websocketService.leaveRoom(roomId);
    navigate('/rooms');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleString();
  };

  const calculateTimeLeft = (creationTime) => {
    if (!creationTime) return '';
    
    const creationDate = new Date(creationTime);
    const expiryDate = new Date(creationDate.getTime() + 24 * 60 * 60 * 1000); // 24小时后
    const now = new Date();
    
    const timeLeft = expiryDate - now;
    if (timeLeft <= 0) return '已过期';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}小时${minutes}分钟`;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-icon">!</div>
          <h2>出错了</h2>
          <p>{error}</p>
          <button className="back-button" onClick={() => navigate('/rooms')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-icon">?</div>
          <h2>房间不存在</h2>
          <p>您尝试访问的房间可能不存在或已过期。</p>
          <div className="error-actions">
            <button className="back-button" onClick={() => navigate('/rooms')}>
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCreator = user.email === currentRoom.creatorEmail;
  const canStartGame = isCreator && currentRoom.status === 'WAITING' && players.length >= 2;

  return (
    <div className="room-container">
      <header className="room-header">
        <h1>房间 #{currentRoom.roomId}</h1>
        <button onClick={handleLeaveRoom}>返回房间列表</button>
      </header>

      <div className="room-info">
        <div className="room-details">
          <p><strong>房间号:</strong> {currentRoom.roomId}</p>
          <p><strong>创建者:</strong> {players.find(p => p.email === currentRoom.creatorEmail)?.nickname || currentRoom.creatorEmail}</p>
          <p><strong>创建时间:</strong> {formatTime(currentRoom.creationTime)}</p>
          <p><strong>剩余时间:</strong> {calculateTimeLeft(currentRoom.creationTime)}</p>
          <p><strong>状态:</strong> {currentRoom.status === 'WAITING' ? '等待中' : '游戏中'}</p>
          {hasJoined && isCreator && <p><strong>密码:</strong> {currentRoom.password}</p>}
        </div>

        {!hasJoined ? (
          <div className="join-section">
            <input
              type="password"
              placeholder="输入房间密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleJoinRoom}>加入房间</button>
          </div>
        ) : (
          <div className="action-buttons">
            {canStartGame && (
              <button 
                className="start-game-button" 
                onClick={handleStartGame}
              >
                开始游戏
              </button>
            )}
          </div>
        )}
      </div>

      <div className="players-section">
        <h2>玩家列表</h2>
        <div className="players-grid">
          {Array.from({ length: 4 }).map((_, index) => {
            const player = players[index];
            return (
              <div key={index} className={`player-card ${player ? 'occupied' : 'empty'}`}>
                {player ? (
                  <>
                    <div className="player-avatar">
                      {player.nickname?.charAt(0) || player.email.charAt(0)}
                    </div>
                    <div className="player-info">
                      <p className="player-nickname">{player.nickname || '未设置昵称'}</p>
                      <p className="player-email">{player.email}</p>
                    </div>
                    {player.email === currentRoom.creatorEmail && (
                      <div className="creator-badge">房主</div>
                    )}
                  </>
                ) : (
                  <div className="empty-slot">等待玩家加入...</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="system-messages">
        <h2>系统消息</h2>
        <div className="messages-container">
          {systemMessages.length === 0 ? (
            <p>暂无系统消息</p>
          ) : (
            systemMessages.map((message, index) => (
              <div key={index} className="system-message">
                {message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Room; 