import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../stores/roomStore';
import { useAuthStore } from '../stores/authStore';
import NicknameModal from './NicknameModal';
import '../styles/RoomList.css';

const RoomList = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { rooms, loading, error, fetchRooms, createRoom } = useRoomStore();
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000); // 每10秒刷新一次
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const handleCreateRoom = async () => {
    const room = await createRoom();
    if (room) {
      navigate(`/rooms/${room.id}`);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (joinRoomId) {
      navigate(`/rooms/${joinRoomId}`, { state: { password: joinPassword } });
    }
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

  // 添加直接进入演示游戏的功能
  const enterDemoGame = () => {
    // 使用id为102的房间，这是在mockData中设置为"playing"状态的房间
    navigate('/rooms/102/game');
  };

  return (
    <div className="room-list-container">
      <header className="room-list-header">
        <h1>麻将对战系统</h1>
        <div className="demo-badge">演示版</div>
        <div className="user-info">
          <span>欢迎，{user?.nickname || user?.name || user?.email}</span>
          <button onClick={() => setIsNicknameModalOpen(true)}>修改昵称</button>
          <button onClick={logout}>退出登录</button>
        </div>
      </header>

      {/* 添加演示游戏入口按钮 */}
      <div className="demo-game-entry">
        <button 
          className="demo-game-button" 
          onClick={enterDemoGame}
        >
          直接进入演示游戏
        </button>
        <p>点击上方按钮直接进入一个已开始的麻将游戏</p>
      </div>

      <div className="room-actions">
        <div className="room-actions-left">
          <button 
            className="create-room-button" 
            onClick={handleCreateRoom}
            disabled={loading}
          >
            创建新房间
          </button>
          
          <button 
            className="refresh-button" 
            onClick={() => fetchRooms()}
            disabled={loading}
          >
            刷新
          </button>
        </div>

        <form className="join-room-form" onSubmit={handleJoinRoom}>
          <input
            type="text"
            placeholder="房间号"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="密码"
            value={joinPassword}
            onChange={(e) => setJoinPassword(e.target.value)}
          />
          <button type="submit">加入房间</button>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="room-list">
        <h2>可用房间</h2>
        {loading ? (
          <div className="loading">加载中...</div>
        ) : rooms.length === 0 ? (
          <div className="no-rooms">暂无可用房间</div>
        ) : (
          <table className="rooms-table">
            <thead>
              <tr>
                <th>房间号</th>
                <th>房间名</th>
                <th>创建者</th>
                <th>玩家数</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>剩余时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.id}</td>
                  <td>{room.name}</td>
                  <td>{room.createdBy}</td>
                  <td>{room.playerCount}/{room.maxPlayers}</td>
                  <td>
                    {room.status === 'waiting' ? '等待中' : 
                     room.status === 'playing' ? '游戏中' : '已结束'}
                  </td>
                  <td>{formatTime(room.createdAt)}</td>
                  <td>{calculateTimeLeft(room.createdAt)}</td>
                  <td>
                    <div className="room-actions-buttons">
                      <button 
                        onClick={() => navigate(`/rooms/${room.id}`)}
                        disabled={room.status === 'finished'}
                        className={room.status === 'playing' ? 'resume-button' : ''}
                      >
                        {room.status === 'playing' ? '查看房间' : '进入'}
                      </button>
                      {room.status === 'playing' && (
                        <button 
                          onClick={() => navigate(`/rooms/${room.id}/game`)}
                          className="play-button"
                        >
                          进入游戏
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isNicknameModalOpen && (
        <NicknameModal 
          currentNickname={user?.nickname} 
          onClose={() => setIsNicknameModalOpen(false)} 
        />
      )}

      <footer className="demo-footer">
        <p>这是麻将游戏的演示版本，所有数据都在前端模拟</p>
      </footer>
    </div>
  );
};

export default RoomList;