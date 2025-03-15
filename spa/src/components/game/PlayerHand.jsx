import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import MahjongTile, { ItemTypes } from './MahjongTile';
import Button from '../ui/Button';

// 手牌容器
const HandContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

// 玩家信息
const PlayerInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  width: 100%;
`;

// 玩家名称
const PlayerName = styled.div`
  font-weight: 500;
  font-size: 1.25rem;
  margin-right: auto;
`;

// 操作按钮容器
const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

// 牌组容器
const TilesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem;
  padding: 1rem;
  min-height: 80px;
  width: 100%;
`;

// 拖拽提示
const DragHint = styled.div`
  font-size: 0.75rem;
  color: #666;
  margin-top: 0.5rem;
  text-align: center;
`;

// 玩家手牌组件
const PlayerHand = ({
  player,
  tiles,
  isCurrentPlayer = false,
  onDiscardTile,
  onDrawTiles,
  onRevealTiles,
  onDeclareWin,
  onReorderTiles,
}) => {
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [localTiles, setLocalTiles] = useState([]);
  
  // 初始化本地牌组
  React.useEffect(() => {
    setLocalTiles(tiles);
  }, [tiles]);

  // 处理牌的点击
  const handleTileClick = (tile, index) => {
    const tileIndex = selectedTiles.findIndex(
      (t) => t.index === index && t.tile.type === tile.type && t.tile.value === tile.value
    );
    
    if (tileIndex === -1) {
      // 添加到选中的牌
      setSelectedTiles([...selectedTiles, { tile, index }]);
    } else {
      // 从选中的牌中移除
      const newSelectedTiles = [...selectedTiles];
      newSelectedTiles.splice(tileIndex, 1);
      setSelectedTiles(newSelectedTiles);
    }
  };

  // 处理打出牌
  const handleDiscard = () => {
    if (selectedTiles.length === 1) {
      onDiscardTile(selectedTiles[0].tile);
      setSelectedTiles([]);
    }
  };

  // 处理明牌
  const handleReveal = () => {
    if (selectedTiles.length > 0) {
      onRevealTiles(selectedTiles.map((t) => t.tile));
      setSelectedTiles([]);
    }
  };

  // 处理抽牌
  const handleDraw = () => {
    onDrawTiles(1);
  };

  // 处理宣布胜利
  const handleDeclareWin = () => {
    onDeclareWin();
  };

  // 检查牌是否被选中
  const isTileSelected = (index) => {
    return selectedTiles.some((t) => t.index === index);
  };
  
  // 处理牌的移动（拖拽排序）
  const moveCard = useCallback(
    (dragIndex, hoverIndex) => {
      // 创建新的牌组数组
      const newTiles = [...localTiles];
      
      // 移除拖拽的牌
      const draggedTile = newTiles[dragIndex];
      
      // 从数组中移除拖拽的牌
      newTiles.splice(dragIndex, 1);
      
      // 在新位置插入拖拽的牌
      newTiles.splice(hoverIndex, 0, draggedTile);
      
      // 更新本地牌组
      setLocalTiles(newTiles);
      
      // 如果提供了重新排序回调，则调用它
      if (onReorderTiles) {
        onReorderTiles(newTiles);
      }
      
      // 更新选中的牌的索引
      setSelectedTiles(prevSelected => {
        return prevSelected.map(item => {
          if (item.index === dragIndex) {
            return { ...item, index: hoverIndex };
          }
          if (item.index < dragIndex && item.index >= hoverIndex) {
            return { ...item, index: item.index + 1 };
          }
          if (item.index > dragIndex && item.index <= hoverIndex) {
            return { ...item, index: item.index - 1 };
          }
          return item;
        });
      });
    },
    [localTiles, onReorderTiles]
  );

  return (
    <HandContainer>
      <PlayerInfo>
        <PlayerName>
          {player.nickname} {isCurrentPlayer && '(你)'}
        </PlayerName>
      </PlayerInfo>
      
      {isCurrentPlayer && (
        <ActionButtons>
          <Button
            size="small"
            variant="primary"
            onClick={handleDraw}
          >
            抽牌
          </Button>
          <Button
            size="small"
            variant="secondary"
            onClick={handleDiscard}
            disabled={selectedTiles.length !== 1}
          >
            打出
          </Button>
          <Button
            size="small"
            variant="info"
            onClick={handleReveal}
            disabled={selectedTiles.length === 0}
          >
            明牌
          </Button>
          <Button
            size="small"
            variant="success"
            onClick={handleDeclareWin}
          >
            宣布胜利
          </Button>
        </ActionButtons>
      )}
      
      <TilesContainer>
        {localTiles.map((tile, index) => (
          <MahjongTile
            key={`${tile.type}-${tile.value}-${index}`}
            tile={tile}
            index={index}
            selected={isTileSelected(index)}
            onClick={isCurrentPlayer ? () => handleTileClick(tile, index) : undefined}
            isDraggable={isCurrentPlayer}
            moveCard={moveCard}
          />
        ))}
      </TilesContainer>
      
      {isCurrentPlayer && localTiles.length > 0 && (
        <DragHint>提示：您可以拖动牌来重新排序</DragHint>
      )}
    </HandContainer>
  );
};

export default PlayerHand; 