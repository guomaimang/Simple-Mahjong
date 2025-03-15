import React from 'react';
import styled from 'styled-components';
import Card from '../ui/Card';
import Button from '../ui/Button';

// 房间信息
const RoomInfo = styled.div`
  margin-bottom: 1rem;
`;

// 房间信息项
const InfoItem = styled.div`
  display: flex;
  margin-bottom: 0.5rem;
  
  strong {
    margin-right: 0.5rem;
  }
`;

// 玩家列表
const PlayersList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
`;

// 玩家项
const PlayerItem = styled.li`
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
  
  &:last-child {
    border-bottom: none;
  }
`;

// 房间卡片组件
const RoomCard = ({
  room,
  onJoin,
  onLeave,
  onStart,
  showPassword = false,
  isInRoom = false,
  isCreator = false,
}) => {
  // 计算房间剩余时间
  const getRemainingTime = () => {
    const expiryTime = new Date(room.expiryTime);
    const now = new Date();
    const diff = expiryTime - now;
    
    if (diff <= 0) {
      return '已过期';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}小时${minutes}分钟`;
  };

  return (
    <Card
      header={`房间 #${room.roomId}`}
      headerColor={room.gameInProgress ? '#4CAF50' : '#2196F3'}
      footer={
        <>
          {!isInRoom && (
            <Button
              variant="primary"
              fullWidth
              onClick={() => onJoin(room.roomId, room.password)}
            >
              加入房间
            </Button>
          )}
          
          {isInRoom && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {isCreator && room.players.length >= 2 && !room.gameInProgress && (
                <Button
                  variant="success"
                  onClick={() => onStart(room.roomId)}
                >
                  开始游戏
                </Button>
              )}
              
              <Button
                variant="danger"
                onClick={() => onLeave(room.roomId)}
              >
                离开房间
              </Button>
            </div>
          )}
        </>
      }
    >
      <RoomInfo>
        {showPassword && (
          <InfoItem>
            <strong>密码:</strong> {room.password}
          </InfoItem>
        )}
        
        <InfoItem>
          <strong>创建者:</strong> {room.creator.nickname}
        </InfoItem>
        
        <InfoItem>
          <strong>状态:</strong> {room.gameInProgress ? '游戏进行中' : '等待开始'}
        </InfoItem>
        
        <InfoItem>
          <strong>剩余时间:</strong> {getRemainingTime()}
        </InfoItem>
      </RoomInfo>
      
      <h4>玩家列表 ({room.players.length}/4)</h4>
      <PlayersList>
        {room.players.map((player) => (
          <PlayerItem key={player.email}>
            {player.nickname} ({player.email})
            {player.email === room.creator.email && ' (创建者)'}
          </PlayerItem>
        ))}
      </PlayersList>
    </Card>
  );
};

export default RoomCard; 