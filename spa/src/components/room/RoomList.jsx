import React from 'react';
import styled from 'styled-components';
import RoomCard from './RoomCard';
import Button from '../ui/Button';

// 房间列表容器
const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
`;

// 列表头部
const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

// 房间网格
const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
`;

// 空状态
const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  background-color: #f9f9f9;
  border-radius: 8px;
`;

// 房间列表组件
const RoomList = ({
  rooms,
  currentUser,
  currentRoom,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartGame,
  onRefresh,
  loading,
}) => {
  // 检查用户是否在房间中
  const isUserInRoom = (room) => {
    return room.players.some((player) => player.email === currentUser?.email);
  };
  
  // 检查用户是否是房间创建者
  const isUserCreator = (room) => {
    return room.creator.email === currentUser?.email;
  };

  return (
    <ListContainer>
      <ListHeader>
        <h2>可用房间</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="primary"
            onClick={onCreateRoom}
            disabled={loading || !!currentRoom}
          >
            创建房间
          </Button>
          <Button
            variant="secondary"
            onClick={onRefresh}
            disabled={loading}
          >
            刷新
          </Button>
        </div>
      </ListHeader>
      
      {rooms.length === 0 ? (
        <EmptyState>
          <h3>暂无可用房间</h3>
          <p>点击"创建房间"按钮创建一个新房间</p>
        </EmptyState>
      ) : (
        <RoomGrid>
          {rooms.map((room) => (
            <RoomCard
              key={room.roomId}
              room={room}
              showPassword={isUserInRoom(room)}
              isInRoom={isUserInRoom(room)}
              isCreator={isUserCreator(room)}
              onJoin={onJoinRoom}
              onLeave={onLeaveRoom}
              onStart={onStartGame}
            />
          ))}
        </RoomGrid>
      )}
    </ListContainer>
  );
};

export default RoomList; 