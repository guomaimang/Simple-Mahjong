import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import RoomList from '../components/room/RoomList';
import JoinRoomModal from '../components/room/JoinRoomModal';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';

// 页面容器
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f5f5;
`;

// 页面头部
const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #2196F3;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

// 用户信息
const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// 昵称编辑表单
const NicknameForm = styled.form`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

// 昵称输入框
const NicknameInput = styled.input`
  padding: 0.25rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

// 房间页面组件
const RoomsPage = () => {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState('');
  
  const { user, logout, updateNickname } = useAuth();
  const {
    rooms,
    currentRoom,
    loading,
    fetchRooms,
    createRoom,
    joinRoom,
    leaveRoom,
  } = useRoom();
  
  const navigate = useNavigate();

  // 初始化时获取房间列表
  useEffect(() => {
    fetchRooms();
    
    // 设置定时刷新
    const interval = setInterval(() => {
      fetchRooms();
    }, 30000); // 每30秒刷新一次
    
    return () => clearInterval(interval);
  }, [fetchRooms]);

  // 处理创建房间
  const handleCreateRoom = async () => {
    try {
      const room = await createRoom();
      navigate(`/room/${room.roomId}`);
    } catch (error) {
      console.error('创建房间失败:', error);
    }
  };

  // 处理加入房间
  const handleJoinRoom = async (roomId, password) => {
    try {
      const room = await joinRoom(roomId, password);
      navigate(`/room/${room.roomId}`);
      return room;
    } catch (error) {
      console.error('加入房间失败:', error);
      throw error;
    }
  };

  // 处理离开房间
  const handleLeaveRoom = async (roomId) => {
    try {
      await leaveRoom(roomId);
    } catch (error) {
      console.error('离开房间失败:', error);
    }
  };

  // 处理开始游戏
  const handleStartGame = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  // 处理更新昵称
  const handleUpdateNickname = async (e) => {
    e.preventDefault();
    
    if (!nickname.trim()) {
      return;
    }
    
    try {
      await updateNickname(nickname);
      setIsEditingNickname(false);
    } catch (error) {
      console.error('更新昵称失败:', error);
    }
  };

  // 处理登出
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 开始编辑昵称
  const startEditingNickname = () => {
    setNickname(user.nickname || '');
    setIsEditingNickname(true);
  };

  return (
    <PageContainer>
      <Header>
        <h1>麻将对战系统</h1>
        
        <UserInfo>
          <div>
            <div>{user?.email}</div>
            
            {isEditingNickname ? (
              <NicknameForm onSubmit={handleUpdateNickname}>
                <NicknameInput
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="输入昵称"
                />
                <Button
                  variant="success"
                  size="small"
                  type="submit"
                >
                  保存
                </Button>
                <Button
                  variant="light"
                  size="small"
                  onClick={() => setIsEditingNickname(false)}
                >
                  取消
                </Button>
              </NicknameForm>
            ) : (
              <div>
                昵称: {user?.nickname || user?.email.split('@')[0]}
                <Button
                  variant="light"
                  size="small"
                  onClick={startEditingNickname}
                  style={{ marginLeft: '0.5rem' }}
                >
                  编辑
                </Button>
              </div>
            )}
          </div>
          
          <Button
            variant="danger"
            size="small"
            onClick={handleLogout}
          >
            登出
          </Button>
        </UserInfo>
      </Header>
      
      <RoomList
        rooms={rooms}
        currentUser={user}
        currentRoom={currentRoom}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={(roomId) => setIsJoinModalOpen(true)}
        onLeaveRoom={handleLeaveRoom}
        onStartGame={handleStartGame}
        onRefresh={fetchRooms}
        loading={loading}
      />
      
      <JoinRoomModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onJoin={handleJoinRoom}
        loading={loading}
      />
    </PageContainer>
  );
};

export default RoomsPage; 