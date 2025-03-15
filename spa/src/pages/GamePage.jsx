import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import GameTable from '../components/game/GameTable';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useRoom } from '../contexts/RoomContext';
import { useGame } from '../contexts/GameContext';

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
  background-color: #4CAF50;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

// 房间信息
const RoomInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

// 游戏结束模态框
const GameEndModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

// 模态框内容
const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  padding: 2rem;
  width: 90%;
  max-width: 600px;
  text-align: center;
`;

// 玩家牌展示
const PlayerTiles = styled.div`
  margin: 1rem 0;
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 8px;
`;

// 错误提示
const ErrorMessage = styled.div`
  background-color: #ffebee;
  color: #d32f2f;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
  text-align: center;
`;

// 游戏页面组件
const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const { user } = useAuth();
  const { currentRoom, fetchRoomDetail, leaveRoom } = useRoom();
  const {
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
    error,
    loading,
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
  } = useGame();
  
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  const [localPlayerHand, setLocalPlayerHand] = useState([]);

  // 初始化时获取房间详情
  useEffect(() => {
    if (roomId) {
      fetchRoomDetail(parseInt(roomId, 10));
    }
  }, [roomId, fetchRoomDetail]);

  // 当游戏结束时显示模态框
  useEffect(() => {
    if (gameEnded) {
      setShowGameEndModal(true);
    }
  }, [gameEnded]);
  
  // 当玩家手牌变化时更新本地手牌
  useEffect(() => {
    setLocalPlayerHand(playerHand);
  }, [playerHand]);

  // 处理开始游戏
  const handleStartGame = () => {
    startGame();
  };

  // 处理离开房间
  const handleLeaveRoom = async () => {
    try {
      await leaveRoom(parseInt(roomId, 10));
      navigate('/rooms');
    } catch (error) {
      console.error('离开房间失败:', error);
    }
  };

  // 处理返回房间列表
  const handleBackToRooms = () => {
    navigate('/rooms');
  };

  // 处理准备新游戏
  const handlePrepareNewGame = () => {
    setShowGameEndModal(false);
  };
  
  // 处理重新排序手牌
  const handleReorderTiles = (reorderedTiles) => {
    setLocalPlayerHand(reorderedTiles);
    // 使用GameContext中的reorderTiles函数更新手牌顺序
    reorderTiles(reorderedTiles);
  };

  // 获取当前玩家在房间中的索引
  const getCurrentPlayerIndex = () => {
    if (!currentRoom || !user) return 0;
    
    return currentRoom.players.findIndex(
      (player) => player.email === user.email
    );
  };

  // 如果房间未加载，显示加载中
  if (!currentRoom) {
    return (
      <PageContainer>
        <Header>
          <h1>加载中...</h1>
        </Header>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <RoomInfo>
          <h1>房间 #{currentRoom.roomId}</h1>
          <div>密码: {currentRoom.password}</div>
        </RoomInfo>
        
        <div>
          {currentRoom.creator.email === user?.email &&
           !currentRoom.gameInProgress &&
           currentRoom.players.length >= 2 && (
            <Button
              variant="success"
              onClick={handleStartGame}
              disabled={loading}
              style={{ marginRight: '0.5rem' }}
            >
              开始游戏
            </Button>
          )}
          
          <Button
            variant="danger"
            onClick={handleLeaveRoom}
            disabled={loading}
          >
            离开房间
          </Button>
        </div>
      </Header>
      
      {error && (
        <ErrorMessage>
          {error}
          <Button
            variant="light"
            size="small"
            onClick={clearError}
            style={{ marginLeft: '1rem' }}
          >
            关闭
          </Button>
        </ErrorMessage>
      )}
      
      {currentRoom.gameInProgress ? (
        <GameTable
          players={currentRoom.players}
          currentPlayerIndex={getCurrentPlayerIndex()}
          playerHands={{ [user?.email]: localPlayerHand }}
          discardedTiles={discardedTiles || []}
          remainingTiles={remainingTiles}
          recentActions={recentActions}
          winDeclared={winDeclared}
          declaredWinner={declaredWinner}
          confirmations={confirmations}
          rejections={rejections}
          onDiscardTile={discardTile}
          onDrawTiles={drawTiles}
          onTakeTiles={takeTiles}
          onRevealTiles={revealTiles}
          onDeclareWin={declareWin}
          onConfirmWin={confirmWin}
          onRejectWin={rejectWin}
          onReorderTiles={handleReorderTiles}
        />
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>等待游戏开始</h2>
          <p>当前玩家: {currentRoom.players.length}/4</p>
          <p>需要至少2名玩家才能开始游戏</p>
        </div>
      )}
      
      {showGameEndModal && (
        <GameEndModal>
          <ModalContent>
            <h2>游戏结束</h2>
            
            {declaredWinner && (
              <h3>获胜者: {declaredWinner.nickname}</h3>
            )}
            
            <h3>所有玩家的牌:</h3>
            
            {Object.entries(allPlayerTiles).map(([email, tiles]) => {
              const player = currentRoom.players.find(p => p.email === email);
              
              return (
                <PlayerTiles key={email}>
                  <h4>{player?.nickname || email}</h4>
                  <div>
                    {tiles.map((tile, index) => (
                      <span key={index}>
                        {tile.type === 'FENG' && tile.value === 1 && '东'}
                        {tile.type === 'FENG' && tile.value === 2 && '南'}
                        {tile.type === 'FENG' && tile.value === 3 && '西'}
                        {tile.type === 'FENG' && tile.value === 4 && '北'}
                        {tile.type === 'JIAN' && tile.value === 1 && '中'}
                        {tile.type === 'JIAN' && tile.value === 2 && '发'}
                        {tile.type === 'JIAN' && tile.value === 3 && '白'}
                        {(tile.type !== 'FENG' && tile.type !== 'JIAN') && tile.value}
                        {tile.type === 'WAN' && '万'}
                        {tile.type === 'TONG' && '筒'}
                        {tile.type === 'TIAO' && '条'}
                        {' '}
                      </span>
                    ))}
                  </div>
                </PlayerTiles>
              );
            })}
            
            <div style={{ marginTop: '2rem' }}>
              <Button
                variant="primary"
                onClick={handlePrepareNewGame}
                style={{ marginRight: '1rem' }}
              >
                准备新游戏
              </Button>
              <Button
                variant="light"
                onClick={handleBackToRooms}
              >
                返回房间列表
              </Button>
            </div>
          </ModalContent>
        </GameEndModal>
      )}
    </PageContainer>
  );
};

export default GamePage; 