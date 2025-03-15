import React, { useRef } from 'react';
import styled from 'styled-components';
import { useDrag, useDrop } from 'react-dnd';

// 麻将牌类型颜色
const TILE_COLORS = {
  WAN: '#e74c3c',   // 万子 - 红色
  TONG: '#3498db',  // 筒子 - 蓝色
  TIAO: '#2ecc71',  // 条子 - 绿色
  FENG: '#f39c12',  // 风牌 - 橙色
  JIAN: '#9b59b6',  // 箭牌 - 紫色
};

// 麻将牌容器
const TileContainer = styled.div`
  position: relative;
  width: 40px;
  height: 56px;
  background-color: ${(props) => (props.faceDown ? '#f5f5f5' : 'white')};
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: ${(props) => (props.onClick || props.isDraggable ? 'pointer' : 'default')};
  user-select: none;
  transition: transform 0.2s, box-shadow 0.2s;
  margin: 0 2px;
  opacity: ${(props) => (props.isDragging ? 0.5 : 1)};
  
  /* 选中状态 */
  ${(props) =>
    props.selected &&
    `
    transform: translateY(-8px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    border-color: #2196F3;
  `}
  
  /* 悬停效果 */
  &:hover {
    ${(props) =>
      (props.onClick || props.isDraggable) &&
      `
      transform: translateY(-4px);
      box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
    `}
  }
  
  /* 明牌状态 */
  ${(props) =>
    props.revealed &&
    `
    border: 2px solid gold;
  `}
`;

// 麻将牌值
const TileValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${(props) => props.color || '#333'};
`;

// 麻将牌类型
const TileType = styled.div`
  font-size: 0.75rem;
  color: ${(props) => props.color || '#333'};
`;

// 背面图案
const TileBack = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: #888;
  
  &::before {
    content: '麻';
  }
`;

// 拖拽项类型
const ItemTypes = {
  TILE: 'tile',
};

// 麻将牌组件
const MahjongTile = ({
  tile,
  index,
  faceDown = false,
  selected = false,
  onClick,
  isDraggable = false,
  moveCard,
  ...props
}) => {
  const ref = useRef(null);
  
  // 设置拖拽
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TILE,
    item: { index },
    canDrag: () => isDraggable && !faceDown,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  // 设置放置
  const [, drop] = useDrop({
    accept: ItemTypes.TILE,
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // 不替换自己
      if (dragIndex === hoverIndex) {
        return;
      }
      
      // 确定矩形在屏幕上的位置
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // 获取水平中点
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      
      // 确定鼠标位置
      const clientOffset = monitor.getClientOffset();
      
      // 获取鼠标水平位置
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;
      
      // 只有当鼠标越过一半宽度时才执行移动
      // 向左拖动
      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
        return;
      }
      
      // 向右拖动
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
        return;
      }
      
      // 执行移动
      if (moveCard) {
        moveCard(dragIndex, hoverIndex);
      }
      
      // 注意：我们在这里改变了 item.index！
      // 这很重要，因为它允许我们在拖动过程中保持正确的索引
      item.index = hoverIndex;
    },
  });
  
  // 应用拖放引用
  if (isDraggable && !faceDown) {
    drag(drop(ref));
  }

  // 如果是背面朝上或者没有牌，显示背面
  if (faceDown || !tile) {
    return (
      <TileContainer 
        ref={ref}
        faceDown={true} 
        onClick={onClick} 
        isDragging={isDragging}
        isDraggable={isDraggable}
        {...props}
      >
        <TileBack />
      </TileContainer>
    );
  }

  // 获取牌值和类型的显示文本
  const getValueText = () => {
    if (tile.type === 'FENG') {
      switch (tile.value) {
        case 1: return '东';
        case 2: return '南';
        case 3: return '西';
        case 4: return '北';
        default: return tile.value;
      }
    } else if (tile.type === 'JIAN') {
      switch (tile.value) {
        case 1: return '中';
        case 2: return '发';
        case 3: return '白';
        default: return tile.value;
      }
    } else {
      return tile.value;
    }
  };

  const getTypeText = () => {
    switch (tile.type) {
      case 'WAN': return '万';
      case 'TONG': return '筒';
      case 'TIAO': return '条';
      case 'FENG': return '';
      case 'JIAN': return '';
      default: return '';
    }
  };

  const tileColor = TILE_COLORS[tile.type] || '#333';

  return (
    <TileContainer
      ref={ref}
      selected={selected}
      revealed={tile.revealed}
      onClick={onClick}
      isDragging={isDragging}
      isDraggable={isDraggable}
      {...props}
    >
      <TileValue color={tileColor}>{getValueText()}</TileValue>
      <TileType color={tileColor}>{getTypeText()}</TileType>
    </TileContainer>
  );
};

export default MahjongTile;
export { ItemTypes }; 