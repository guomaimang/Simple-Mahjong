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
      navigate(`/rooms/${room.roomId}`);
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

  return (
    <div className="room-list-container">
      <header className="room-list-header">
        <h1>麻将对战系统</h1>
        <div className="user-info">
          <span>欢迎，{user?.nickname || user?.email}</span>
          <button onClick={() => setIsNicknameModalOpen(true)}>修改昵称</button>
          <button onClick={logout}>退出登录</button>
        </div>
      </header>

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
                <tr key={room.roomId}>
                  <td>{room.roomId}</td>
                  <td>{room.creatorEmail}</td>
                  <td>{room.playerEmails.length}/4</td>
                  <td>
                    {room.status === 'WAITING' ? '等待中' : 
                     room.status === 'PLAYING' ? '游戏中' : '已结束'}
                  </td>
                  <td>{formatTime(room.creationTime)}</td>
                  <td>{calculateTimeLeft(room.creationTime)}</td>
                  <td>
                    <button 
                      onClick={() => navigate(`/rooms/${room.roomId}`)}
                      disabled={room.status === 'FINISHED'}
                    >
                      进入
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <NicknameModal 
        isOpen={isNicknameModalOpen} 
        onClose={() => setIsNicknameModalOpen(false)} 
      />
    </div>
  );
};

export default RoomList;