import React, { useState } from 'react';
import styled from 'styled-components';
import MahjongTile from './MahjongTile';
import PlayerHand from './PlayerHand';
import Button from '../ui/Button';

// 游戏桌面容器
const TableContainer = styled.div`
  display: grid;
  grid-template-areas:
    ". top ."
    "left center right"
    ". bottom .";
  grid-template-columns: 1fr 2fr 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
  padding: 1rem;
  height: calc(100vh - 100px);
  background-color: #e8f5e9;
  border-radius: 8px;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
`;

// 游戏信息区域
const GameInfo = styled.div`
  grid-area: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

// 玩家区域
const PlayerArea = styled.div`
  grid-area: ${(props) => props.area};
  display: flex;
  justify-content: center;
  align-items: center;
`;

// 牌堆区域
const TileStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
`;

// 牌堆计数
const TileCount = styled.div`
  font-size: 1.25rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

// 打出的牌区域
const DiscardedTiles = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem;
  padding: 1rem;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  min-height: 100px;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 1rem;
`;

// 最近操作区域
const RecentActions = styled.div`
  margin-top: 1rem;
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  max-width: 100%;
`;

// 操作项
const ActionItem = styled.div`
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  color: #333;
`;

// 胜利宣言区域
const WinDeclaration = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background-color: rgba(255, 215, 0, 0.2);
  border: 1px solid gold;
  border-radius: 4px;
  text-align: center;
`;

// 确认按钮区域
const ConfirmationButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  justify-content: center;
`;

// 游戏桌面组件
const GameTable = ({
  players,
  currentPlayerIndex,
  playerHands,
  discardedTiles,
  remainingTiles,
  recentActions,
  winDeclared,
  declaredWinner,
  confirmations,
  rejections,
  onDiscardTile,
  onDrawTiles,
  onTakeTiles,
  onRevealTiles,
  onDeclareWin,
  onConfirmWin,
  onRejectWin,
  onReorderTiles,
}) => {
  // 获取当前玩家
  const currentPlayer = players[currentPlayerIndex];
  
  // 根据玩家位置获取区域
  const getPlayerArea = (index) => {
    const areas = ['bottom', 'right', 'top', 'left'];
    const relativeIndex = (index - currentPlayerIndex + 4) % 4;
    return areas[relativeIndex];
  };
  
  // 处理拿取牌
  const handleTakeTiles = (tiles) => {
    onTakeTiles(tiles);
  };
  
  // 处理重新排序牌
  const handleReorderTiles = (tiles) => {
    if (onReorderTiles) {
      onReorderTiles(tiles);
    }
  };
  
  // 检查玩家是否已确认胜利
  const hasConfirmed = (player) => {
    return confirmations.some((p) => p.email === player.email);
  };
  
  // 检查玩家是否已拒绝胜利宣言
  const hasRejected = (player) => {
    return rejections.some((p) => p.email === player.email);
  };

  return (
    <TableContainer>
      {/* 渲染每个玩家区域 */}
      {players.map((player, index) => (
        <PlayerArea key={player.email} area={getPlayerArea(index)}>
          <PlayerHand
            player={player}
            tiles={playerHands[player.email] || []}
            isCurrentPlayer={index === currentPlayerIndex}
            onDiscardTile={onDiscardTile}
            onDrawTiles={onDrawTiles}
            onRevealTiles={onRevealTiles}
            onDeclareWin={onDeclareWin}
            onReorderTiles={index === currentPlayerIndex ? handleReorderTiles : undefined}
          />
        </PlayerArea>
      ))}
      
      {/* 中央游戏信息区域 */}
      <GameInfo>
        <TileStack>
          <TileCount>剩余牌数: {remainingTiles}</TileCount>
          <MahjongTile faceDown />
        </TileStack>
        
        {/* 打出的牌区域 */}
        <div>
          <h3>打出的牌</h3>
          <DiscardedTiles>
            {discardedTiles.map((tile, index) => (
              <MahjongTile
                key={`discarded-${index}`}
                tile={tile}
                onClick={() => handleTakeTiles([tile])}
              />
            ))}
          </DiscardedTiles>
        </div>
        
        {/* 最近操作 */}
        {recentActions.length > 0 && (
          <RecentActions>
            <h4>最近操作</h4>
            {recentActions.map((action, index) => (
              <ActionItem key={index}>
                {action.player.nickname} {action.description}
              </ActionItem>
            ))}
          </RecentActions>
        )}
        
        {/* 胜利宣言 */}
        {winDeclared && declaredWinner && (
          <WinDeclaration>
            <h3>{declaredWinner.nickname} 宣布胜利！</h3>
            <p>请其他玩家确认或拒绝</p>
            
            {currentPlayer.email !== declaredWinner.email && (
              <ConfirmationButtons>
                <Button
                  variant="success"
                  size="small"
                  onClick={onConfirmWin}
                  disabled={hasConfirmed(currentPlayer)}
                >
                  确认
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={onRejectWin}
                  disabled={hasRejected(currentPlayer)}
                >
                  拒绝
                </Button>
              </ConfirmationButtons>
            )}
            
            <div>
              已确认: {confirmations.map(p => p.nickname).join(', ')}
            </div>
            <div>
              已拒绝: {rejections.map(p => p.nickname).join(', ')}
            </div>
          </WinDeclaration>
        )}
      </GameInfo>
    </TableContainer>
  );
};

export default GameTable; 