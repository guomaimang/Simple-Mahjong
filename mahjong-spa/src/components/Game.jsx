import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { useGameStore } from '../stores/gameStore';
import websocketService from '../services/websocket';
import '../styles/Game.css';

const Game = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentRoom, players, fetchRoom } = useRoomStore();
  const { 
    gameState, 
    playerHand, 
    revealedTiles, 
    playerHandCounts,
    discardPile, 
    drawPileCount, 
    recentActions,
    pendingWinner,
    loading, 
    error,
    initializeListeners,
    removeListeners,
    fetchGameState,
    drawTile,
    discardTile,
    takeTile,
    revealTiles,
    claimWin,
    confirmWin,
    resetGameState
  } = useGameStore();

  const [selectedTiles, setSelectedTiles] = useState([]);
  const [actionType, setActionType] = useState(null);
  const [showWinConfirmation, setShowWinConfirmation] = useState(false);
  const [draggedTileIndex, setDraggedTileIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggedTile, setDraggedTile] = useState(null);
  const [dragSource, setDragSource] = useState(null);

  // 初始化游戏
  useEffect(() => {
    const initGame = async () => {
      try {
        console.log('Initializing game for room:', roomId);
        
        // 确保WebSocket连接已经建立
        if (!websocketService.isConnected()) {
          console.log('WebSocket not connected, connecting...');
          await websocketService.connect();
          console.log('WebSocket connected successfully');
          // 连接成功后等待一会儿确保连接稳定
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // 获取房间信息
        console.log('Fetching room information');
        await fetchRoom(roomId);
        
        // 初始化游戏状态监听器
        console.log('Initializing game state listeners');
        initializeListeners(roomId);
        
        // 等待短暂时间确保监听器已经注册
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 获取游戏状态
        console.log('Fetching initial game state');
        try {
          await fetchGameState(roomId);
          console.log('Game initialization completed');
        } catch (error) {
          console.error('Failed to fetch initial game state:', error);
          // 如果第一次获取失败，尝试重新连接WebSocket并再次获取
          console.log('First attempt failed, trying with full reconnection');
          websocketService.disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await websocketService.connect();
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 重新初始化监听器
          removeListeners();
          initializeListeners(roomId);
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 再次尝试获取游戏状态
          await fetchGameState(roomId);
        }
      } catch (error) {
        console.error('Failed to initialize game:', error);
        set({ error: `初始化游戏失败：${error.message}` });
      }
    };

    // 清理之前的监听器和状态
    removeListeners();
    resetGameState();
    
    // 初始化游戏
    initGame();

    return () => {
      // 清理监听器和状态
      console.log('Cleaning up game component');
      removeListeners();
      resetGameState();
    };
  }, [roomId, fetchRoom, initializeListeners, removeListeners, fetchGameState, resetGameState]);
  
  // 添加一个游戏状态检查的效果
  useEffect(() => {
    let reconnectAttempt = 0;
    const maxReconnectAttempts = 3;
    
    // 如果加载超过10秒还没有游戏状态，尝试重新连接
    if (loading) {
      const timeout = setTimeout(() => {
        if (loading && !gameState && reconnectAttempt < maxReconnectAttempts) {
          reconnectAttempt++;
          console.log(`Game loading timeout, trying to reconnect (attempt ${reconnectAttempt})...`);
          websocketService.disconnect();
          setTimeout(async () => {
            try {
              await websocketService.connect();
              setTimeout(() => fetchGameState(roomId), 500);
            } catch (error) {
              console.error('Reconnection failed:', error);
            }
          }, 1000);
        }
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [loading, gameState, roomId, fetchGameState]);

  // 监听胜利声明
  useEffect(() => {
    if (pendingWinner && pendingWinner !== user.email) {
      setShowWinConfirmation(true);
    }
  }, [pendingWinner, user.email]);

  // 处理牌的选择
  const handleTileSelect = (tile) => {
    if (!actionType) return;

    // 如果是明牌操作，允许选择多张牌
    if (actionType === 'reveal') {
      if (selectedTiles.some(t => t.id === tile.id)) {
        setSelectedTiles(selectedTiles.filter(t => t.id !== tile.id));
      } else {
        setSelectedTiles([...selectedTiles, tile]);
      }
    } else {
      // 对于出牌和拿牌操作，只允许选择一张牌
      if (selectedTiles.some(t => t.id === tile.id)) {
        setSelectedTiles(selectedTiles.filter(t => t.id !== tile.id));
      } else {
        // 直接设置为只有当前选择的牌，替换之前的选择
        setSelectedTiles([tile]);
      }
    }
  };

  // 处理动作按钮点击
  const handleActionClick = (action) => {
    setActionType(action);
    setSelectedTiles([]);
  };

  // 处理动作确认
  const handleConfirmAction = async () => {
    if (!actionType || selectedTiles.length === 0) return;

    try {
      switch (actionType) {
        case 'reveal':
          // 明牌操作可以选择多张牌
          await revealTiles(roomId, selectedTiles);
          break;
        default:
          break;
      }
      
      // 重置选择状态
      setSelectedTiles([]);
      setActionType(null);
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  // 处理抽牌
  const handleDrawTiles = async () => {
    try {
      // 只能抽一张牌
      await drawTile(roomId);
    } catch (error) {
      console.error('Failed to draw tiles:', error);
    }
  };

  // 处理宣布胜利
  const handleClaimWin = async () => {
    try {
      await claimWin(roomId);
    } catch (error) {
      console.error('Failed to claim win:', error);
    }
  };

  // 处理确认/拒绝胜利
  const handleWinConfirmation = async (isConfirmed) => {
    try {
      await confirmWin(roomId, pendingWinner, isConfirmed);
      setShowWinConfirmation(false);
    } catch (error) {
      console.error('Failed to confirm win:', error);
    }
  };

  // 处理返回房间
  const handleBackToRoom = () => {
    navigate(`/rooms/${roomId}`);
  };

  // 处理返回首页（房间列表）
  const handleBackToHome = () => {
    navigate('/rooms');
  };

  // 获取玩家位置
  const getPlayerPosition = (email) => {
    if (!gameState || !gameState.playerPositions) return -1;
    return gameState.playerPositions[email];
  };

  // 获取当前玩家的位置
  const currentPlayerPosition = getPlayerPosition(user.email);

  // 根据当前玩家位置调整其他玩家的相对位置
  const getRelativePosition = (position) => {
    if (currentPlayerPosition === -1) return position;
    return (position - currentPlayerPosition + 4) % 4;
  };

  // 获取玩家显示名称
  const getPlayerDisplayName = (email) => {
    const player = players.find(p => p.email === email);
    return player ? player.nickname || email.split('@')[0] : email.split('@')[0];
  };

  // 获取玩家关系标识（上家、下家、对家）
  const getPlayerRelationship = (relativePosition) => {
    // 获取总玩家数
    const playerCount = Object.keys(gameState?.playerPositions || {}).length;
    
    if (playerCount === 2) {
      // 两人游戏：另一个人是对家（不管位置在哪）
      return "对家";
    } else if (playerCount === 3) {
      // 三人游戏：1是上家，3是下家（因为位置2被跳过了）
      return relativePosition === 1 ? "上家" : "下家";
    } else if (playerCount === 4) {
      // 四人游戏：1是上家，2是对家，3是下家
      if (relativePosition === 1) return "上家";
      if (relativePosition === 2) return "对家";
      if (relativePosition === 3) return "下家";
    }
    return "";
  };

  // 获取牌的显示名称
  const getTileDisplayName = (tile) => {
    if (!tile) return '';
    
    let name = '';
    switch (tile.type) {
      case 'WAN':
        name = `${tile.value}万`;
        break;
      case 'TONG':
        name = `${tile.value}筒`;
        break;
      case 'TIAO':
        name = `${tile.value}条`;
        break;
      case 'FENG':
        switch (tile.value) {
          case 1: name = '东风'; break;
          case 2: name = '南风'; break;
          case 3: name = '西风'; break;
          case 4: name = '北风'; break;
          default: name = `风${tile.value}`;
        }
        break;
      case 'JIAN':
        switch (tile.value) {
          case 1: name = '红中'; break;
          case 2: name = '发财'; break;
          case 3: name = '白板'; break;
          default: name = `箭${tile.value}`;
        }
        break;
      default:
        name = `${tile.type}${tile.value}`;
    }
    
    return name;
  };

  // 渲染单个玩家区域
  const renderPlayerArea = (playerEmail, position, relationship) => {
    const playerRevealedTiles = revealedTiles[playerEmail] || [];
    const playerHandCount = playerHandCounts[playerEmail] || 0;
    const badgeClass = relationship === "上家" ? "shangjiabadge" : 
                       relationship === "下家" ? "xiajiabadge" : "duijiabadge";
    
    // 额外的颜色区分类名
    const relationshipColorClass = relationship === "上家" ? "blue-background" : 
                                relationship === "下家" ? "orange-background" : "red-background";
    
    return (
      <div key={position} className={`player-area position-${position} ${relationshipColorClass}`}>
        <div className="player-info">
          {getPlayerDisplayName(playerEmail)}
          {playerEmail === gameState.dealerEmail && <span className="dealer-badge">庄家</span>}
          <span className={`relationship-badge ${badgeClass}`}>{relationship}</span>
        </div>
        <div className="player-tiles">
          {playerRevealedTiles.length > 0 && (
            <div className="revealed-tiles-section">
              {playerRevealedTiles.map((tile, idx) => (
                <div key={`revealed-${idx}`} className="tile revealed">
                  {getTileDisplayName(tile)}
                </div>
              ))}
            </div>
          )}
          {playerHandCount > 0 && (
            <div className="hidden-tiles-section">
              {Array.from({ length: playerHandCount }).map((_, idx) => (
                <div key={`hidden-${idx}`} className="tile hidden">
                  ?
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染空的玩家位置占位符
  const renderEmptyPlayerArea = (position, relationship) => {
    const badgeClass = relationship === "上家" ? "shangjiabadge" : 
                       relationship === "下家" ? "xiajiabadge" : "duijiabadge";
    
    // 额外的颜色区分类名
    const relationshipColorClass = relationship === "上家" ? "blue-background" : 
                               relationship === "下家" ? "orange-background" : "red-background";
    
    return (
      <div key={position} className={`player-area position-${position} empty ${relationshipColorClass}`}>
        <div className="player-info">
          <span>空位</span>
          <span className={`relationship-badge ${badgeClass}`}>{relationship}</span>
        </div>
        <div className="player-tiles">
          <div className="hidden-tiles-section">
            <div className="empty-placeholder">暂无玩家</div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染其他玩家的牌
  const renderOtherPlayers = () => {
    if (!gameState || !players.length) return null;

    // 获取玩家总人数
    const playerCount = Object.keys(gameState.playerPositions || {}).length;
    
    // 获取所有玩家的位置信息
    const positions = Object.entries(gameState.playerPositions || {});
    
    // 获取除了当前玩家以外的其他玩家
    const otherPlayers = positions.filter(([email, _]) => email !== user.email);

    // 如果只有一个玩家（即当前用户），不渲染其他玩家区域
    if (otherPlayers.length === 0) {
      return <div className="other-players-empty">等待其他玩家加入...</div>;
    }
    
    // 根据玩家人数确定要使用的CSS类
    const otherPlayersClass = `other-players other-players-${playerCount}`;
    
    // 根据玩家人数渲染不同的布局
    if (playerCount === 2) {
      // 2人游戏：对家放在中间位置
      const [playerEmail, _] = otherPlayers[0];
      return (
        <div className={otherPlayersClass}>
          {renderPlayerArea(playerEmail, 2, "对家")}
        </div>
      );
    } else if (playerCount === 3) {
      // 3人游戏：按照相对位置渲染
      // 创建一个包含3个位置的数组，初始都为null
      const positionedPlayers = [null, null, null];
      
      // 根据相对位置放置玩家
      otherPlayers.forEach(([email, pos]) => {
        const relPos = getRelativePosition(pos);
        if (relPos === 1) {
          positionedPlayers[0] = renderPlayerArea(email, 1, "上家");
        } else if (relPos === 3) {
          positionedPlayers[2] = renderPlayerArea(email, 3, "下家");
        }
      });
      
      // 为空位添加占位符
      if (!positionedPlayers[0]) positionedPlayers[0] = renderEmptyPlayerArea(1, "上家");
      // 中间位置永远是占位符
      positionedPlayers[1] = renderEmptyPlayerArea(2, "对家");
      if (!positionedPlayers[2]) positionedPlayers[2] = renderEmptyPlayerArea(3, "下家");
      
      return (
        <div className={otherPlayersClass}>
          {positionedPlayers[0]}
          {positionedPlayers[1]}
          {positionedPlayers[2]}
        </div>
      );
    } else {
      // 4人游戏：按照相对位置渲染
      // 创建一个包含3个位置的数组，初始都为null
      const positionedPlayers = [null, null, null];
      
      // 根据相对位置放置玩家
      otherPlayers.forEach(([email, pos]) => {
        const relPos = getRelativePosition(pos);
        if (relPos === 1) {
          positionedPlayers[0] = renderPlayerArea(email, 1, "上家");
        } else if (relPos === 2) {
          positionedPlayers[1] = renderPlayerArea(email, 2, "对家");
        } else if (relPos === 3) {
          positionedPlayers[2] = renderPlayerArea(email, 3, "下家");
        }
      });
      
      // 为空位添加占位符
      if (!positionedPlayers[0]) positionedPlayers[0] = renderEmptyPlayerArea(1, "上家");
      if (!positionedPlayers[1]) positionedPlayers[1] = renderEmptyPlayerArea(2, "对家");
      if (!positionedPlayers[2]) positionedPlayers[2] = renderEmptyPlayerArea(3, "下家");
      
      return (
        <div className={otherPlayersClass}>
          {positionedPlayers[0]}
          {positionedPlayers[1]}
          {positionedPlayers[2]}
        </div>
      );
    }
  };

  // 渲染牌桌中央区域
  const renderTableCenter = () => {
    // 处理弃牌区拖拽开始
    const handleDiscardDragStart = (e, tile) => {
      // 使用更通用的格式存储牌信息
      e.dataTransfer.setData('text/plain', JSON.stringify(tile));
      e.dataTransfer.setData('application/json', JSON.stringify(tile));
      e.dataTransfer.effectAllowed = 'move';
      
      // 设置拖动效果
      setDraggedTile(tile);
      setDragSource('discard');
      
      console.log('拖动弃牌开始:', tile);
      
      setTimeout(() => {
        e.target.classList.add('dragging');
      }, 0);
    };

    // 处理弃牌区拖拽结束
    const handleDiscardDragEnd = (e) => {
      e.target.classList.remove('dragging');
      setDraggedTile(null);
      setDragSource(null);
    };

    // 处理弃牌区拖放释放事件
    const handleDiscardDrop = async (e) => {
      e.preventDefault();
      if (dragSource === 'hand') {
        const tile = draggedTile;
        if (tile) {
          try {
            await discardTile(roomId, tile);
            setDraggedTile(null);
            setDragSource(null);
          } catch (error) {
            console.error('Failed to discard tile:', error);
          }
        }
      }
    };

    // 处理弃牌区域的拖动悬停
    const handleDiscardDragOver = (e) => {
      e.preventDefault();
      if (dragSource === 'hand') {
        e.currentTarget.classList.add('drag-over');
      }
    };

    // 处理弃牌区域拖动离开
    const handleDiscardDragLeave = (e) => {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');
    };

    return (
      <div className="table-center">
        <div 
          className="discard-pile"
          onDragOver={handleDiscardDragOver}
          onDragLeave={handleDiscardDragLeave}
          onDrop={handleDiscardDrop}
        >
          <h3>弃牌区</h3>
          <div className="discard-hint">将手牌拖到此区域出牌</div>
          <div className="tiles-container">
            {discardPile.slice().reverse().map((tile, idx) => (
              <div 
                key={idx} 
                className={`tile ${selectedTiles.some(t => t.id === tile.id) ? 'selected' : ''}`}
                onClick={() => handleTileSelect(tile)}
                draggable={true}
                onDragStart={(e) => handleDiscardDragStart(e, tile)}
                onDragEnd={handleDiscardDragEnd}
              >
                {getTileDisplayName(tile)}
              </div>
            ))}
          </div>
        </div>
        
        <div className="recent-actions">
          <h3>最近操作</h3>
          <div className="actions-list">
            {recentActions.slice().reverse().map((action, idx) => {
              // 获取操作玩家的相对位置和关系标识
              const playerPos = getPlayerPosition(action.playerEmail);
              const relativePos = getRelativePosition(playerPos);
              
              // 如果是用户自己，显示"你自己"
              // 如果是2人游戏且不是自己，显示"对家"
              // 否则根据相对位置获取关系
              let relationship = "";
              if (user.email === action.playerEmail) {
                relationship = "你自己";
              } else if (Object.keys(gameState?.playerPositions || {}).length === 2) {
                relationship = "对家";
              } else {
                relationship = getPlayerRelationship(relativePos);
              }
              
              return (
                <div key={idx} className="action-item">
                  <span className="action-player">
                    {getPlayerDisplayName(action.playerEmail)}
                    {relationship && <span className="relationship-text">{` (${relationship})`}</span>}:
                  </span>
                  <span className="action-type">
                    {action.type === 'DRAW' ? '抽牌' :
                     action.type === 'DISCARD' ? '打出' :
                     action.type === 'TAKE_TILE' ? '拿取' :
                     action.type === 'REVEAL_TILES' ? '明牌' :
                     action.type === 'CLAIM_WIN' ? '宣布胜利' :
                     action.type === 'CONFIRM_WIN' ? '确认胜利' :
                     action.type === 'DENY_WIN' ? '拒绝胜利' :
                     action.type}
                  </span>
                  {action.data && action.type === 'DISCARD' && (
                    <span className="action-data">{getTileDisplayName(action.data)}</span>
                  )}
                  {action.data && action.type === 'TAKE_TILE' && (
                    <span className="action-data">{getTileDisplayName(action.data)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // 渲染操作按钮
  const renderActionButtons = () => {
    return (
      <div className="action-buttons">
        <div className="action-selection">
          <button 
            className={actionType === 'reveal' ? 'active' : ''}
            onClick={() => handleActionClick('reveal')}
          >
            明牌
          </button>
          <button onClick={handleDrawTiles}>
            抽牌(余{drawPileCount}张)
          </button>
          <button onClick={handleClaimWin}>
            宣布胜利
          </button>
        </div>
        
        {actionType && (
          <div className="action-confirmation">
            <p>已选择: {selectedTiles.map(t => getTileDisplayName(t)).join(', ')}</p>
            <button 
              onClick={handleConfirmAction}
              disabled={selectedTiles.length === 0}
            >
              确认
            </button>
            <button onClick={() => {
              setActionType(null);
              setSelectedTiles([]);
            }}>
              取消
            </button>
          </div>
        )}
      </div>
    );
  };

  // 渲染胜利确认对话框
  const renderWinConfirmation = () => {
    if (!showWinConfirmation) return null;

    // 获取宣布胜利者的关系标识
    let relationship = "";
    if (user.email === pendingWinner) {
      relationship = "你自己";
    } else if (Object.keys(gameState?.playerPositions || {}).length === 2) {
      relationship = "对家";
    } else {
      const winnerPos = getPlayerPosition(pendingWinner);
      const relativePos = getRelativePosition(winnerPos);
      relationship = getPlayerRelationship(relativePos);
    }

    return (
      <div className="win-confirmation-overlay">
        <div className="win-confirmation-modal">
          <h2>胜利确认</h2>
          <p>
            {getPlayerDisplayName(pendingWinner)}
            {relationship && <span className="relationship-text">{` (${relationship})`}</span>}
            宣布自己胜利了！
          </p>
          <p>你同意吗？</p>
          <div className="confirmation-buttons">
            <button 
              className="confirm-button"
              onClick={() => handleWinConfirmation(true)}
            >
              同意
            </button>
            <button 
              className="deny-button"
              onClick={() => handleWinConfirmation(false)}
            >
              拒绝
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染游戏结束画面
  const renderGameEnd = () => {
    if (!gameState || gameState.status !== 'FINISHED') return null;

    // 如果有胜利者，获取其关系标识
    let relationship = "";
    if (gameState.winnerEmail) {
      if (user.email === gameState.winnerEmail) {
        relationship = "你自己";
      } else if (Object.keys(gameState?.playerPositions || {}).length === 2) {
        relationship = "对家";
      } else {
        const winnerPos = getPlayerPosition(gameState.winnerEmail);
        const relativePos = getRelativePosition(winnerPos);
        relationship = getPlayerRelationship(relativePos);
      }
    }

    return (
      <div className="game-end-overlay">
        <div className="game-end-modal">
          <h2>游戏结束</h2>
          {gameState.winnerEmail ? (
            <p>
              {getPlayerDisplayName(gameState.winnerEmail)}
              {relationship && <span className="relationship-text">{` (${relationship})`}</span>}
              获得了胜利！
            </p>
          ) : (
            <p>游戏平局</p>
          )}
          <button onClick={handleBackToHome}>
            返回首页
          </button>
        </div>
      </div>
    );
  };

  // 渲染玩家手牌
  const renderPlayerHand = () => {
    const handleDragStart = (e, index) => {
      e.dataTransfer.setData('text/plain', index);
      setDraggedTileIndex(index);
      setDraggedTile(playerHand[index]);
      setDragSource('hand');
      setTimeout(() => {
        e.target.classList.add('dragging');
      }, 0);
    };

    const handleDragEnd = (e) => {
      e.target.classList.remove('dragging');
      setDraggedTileIndex(null);
      setDragOverIndex(null);
    };

    const handleDragOver = (e, index) => {
      e.preventDefault();
      setDragOverIndex(index);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
    };

    const handleDrop = async (e, dropIndex) => {
      e.preventDefault();
      e.stopPropagation(); // 防止事件冒泡到父元素
      
      // 如果是从弃牌区拖来的牌，进行拿牌操作
      if (dragSource === 'discard' && draggedTile) {
        try {
          console.log('准备拿取弃牌:', draggedTile);
          if (!draggedTile.id) {
            console.error('拖拽的牌没有ID属性:', draggedTile);
            return;
          }
          await takeTile(roomId, draggedTile);
          setDraggedTile(null);
          setDragSource(null);
        } catch (error) {
          console.error('拿牌失败:', error);
        }
      }
      
      // 手牌之间的排序
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (isNaN(dragIndex) || dragIndex === dropIndex) return;

      // 创建新数组并改变其中元素的顺序
      const newHand = [...playerHand];
      const [draggedTile] = newHand.splice(dragIndex, 1);
      newHand.splice(dropIndex, 0, draggedTile);
      
      // 使用store中现有的方法更新playerHand
      useGameStore.setState({ playerHand: newHand });
      
      // 重置状态
      setDraggedTileIndex(null);
      setDragOverIndex(null);
    };

    // 检查牌是否是用户自己已明的牌
    const isRevealedTile = (tile) => {
      if (!user || !user.email || !revealedTiles[user.email]) return false;
      return revealedTiles[user.email].some(revealedTile => revealedTile.id === tile.id);
    };

    // 获取当前用户的明牌
    const myRevealedTiles = user && user.email ? revealedTiles[user.email] || [] : [];

    return (
      <div className="player-hand">
        {/* 玩家信息区域 */}
        <div className="player-self-info">
          <div className="player-name">
            <span>{getPlayerDisplayName(user.email)}</span>
            {user.email === gameState.dealerEmail && <span className="dealer-badge">庄家</span>}
          </div>
        </div>
        
        {/* 我的明牌区域 */}
        {myRevealedTiles.length > 0 && (
          <div className="my-revealed-tiles">
            <div className="hand-title">
              <span className="hand-label">我的明牌</span>
            </div>
            <div className="tiles-container">
              {myRevealedTiles.map((tile, index) => (
                <div 
                  key={`revealed-${tile.id}`} 
                  className="tile my-revealed"
                >
                  {getTileDisplayName(tile)}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 我的手牌区域 */}
        <div 
          className="my-hand-tiles"
          onDragOver={(e) => {
            e.preventDefault();
            if (dragSource === 'discard') {
              e.currentTarget.classList.add('hand-drag-over');
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('hand-drag-over');
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('hand-drag-over');
            // 如果是从弃牌区拖来的牌，进行拿牌操作
            if (dragSource === 'discard' && draggedTile) {
              try {
                console.log('准备拿取弃牌:', draggedTile);
                if (!draggedTile.id) {
                  console.error('拖拽的牌没有ID属性:', draggedTile);
                  return;
                }
                await takeTile(roomId, draggedTile);
                setDraggedTile(null);
                setDragSource(null);
              } catch (error) {
                console.error('拿牌失败:', error);
              }
            }
          }}
        >
          <div className="hand-title">
            <span className="hand-label">我的手牌</span>
          </div>
          <div className="drag-area-hint">
            将弃牌拖到此区域拿牌
          </div>
          <div className="tiles-container">
            {playerHand.map((tile, index) => (
              <div 
                key={tile.id} 
                className={`tile 
                  ${selectedTiles.some(t => t.id === tile.id) ? 'selected' : ''} 
                  ${draggedTileIndex === index ? 'dragging' : ''} 
                  ${dragOverIndex === index ? 'drag-over' : ''}
                  ${isRevealedTile(tile) ? 'my-revealed' : ''}`}
                onClick={() => handleTileSelect(tile)}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                {getTileDisplayName(tile)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-message">
          <h2>正在加载游戏状态...</h2>
          <p>如果长时间无响应，请<button onClick={() => window.location.reload()}>刷新页面</button>重试</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h2>出错了</h2>
          <p>{error}</p>
          <p>错误原因可能是: 游戏已开始，您无法加入对局; 或者房间密码错误</p>
          <div className="error-actions">
            <button onClick={() => window.location.reload()}>刷新页面</button>
            <button onClick={handleBackToHome}>返回首页</button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="loading-container">
        <div className="loading-message">
          <h2>正在加载游戏状态...</h2>
          <p>如果长时间无响应，请<button onClick={() => window.location.reload()}>刷新页面</button>重试</p>
          <p>或者尝试<button onClick={handleBackToHome}>返回首页</button>后重新进入游戏</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <header className="game-header">
        <h1>房间 #{roomId} - 游戏进行中</h1>
        <button onClick={handleBackToHome}>返回首页</button>
      </header>

      <div className="game-table">
        {renderOtherPlayers()}
        {renderTableCenter()}
        {renderPlayerHand()}
        {renderActionButtons()}
      </div>

      {renderWinConfirmation()}
      {renderGameEnd()}
    </div>
  );
};

export default Game; 