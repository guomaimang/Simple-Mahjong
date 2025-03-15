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
    sortPlayerHand,
    resetGameState
  } = useGameStore();

  const [selectedTiles, setSelectedTiles] = useState([]);
  const [actionType, setActionType] = useState(null);
  const [showWinConfirmation, setShowWinConfirmation] = useState(false);
  const [draggedTileIndex, setDraggedTileIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

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

    if (selectedTiles.some(t => t.id === tile.id)) {
      setSelectedTiles(selectedTiles.filter(t => t.id !== tile.id));
    } else {
      setSelectedTiles([...selectedTiles, tile]);
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
        case 'discard':
          await discardTile(roomId, selectedTiles[0]);
          break;
        case 'take':
          await takeTile(roomId, selectedTiles[0]);
          break;
        case 'reveal':
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
  const handleDrawTiles = async (count) => {
    try {
      await drawTile(roomId, count);
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
    return player ? (player.nickname || email) : email;
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

  // 渲染玩家手牌
  const renderPlayerHand = () => {
    const handleDragStart = (e, index) => {
      e.dataTransfer.setData('text/plain', index);
      setDraggedTileIndex(index);
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

    const handleDrop = (e, dropIndex) => {
      e.preventDefault();
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (dragIndex === dropIndex) return;

      // 创建新数组并改变其中元素的顺序
      const newHand = [...playerHand];
      const [draggedTile] = newHand.splice(dragIndex, 1);
      newHand.splice(dropIndex, 0, draggedTile);
      
      // 使用store中现有的方法更新playerHand
      // 看起来store中直接使用set方法来更新状态
      useGameStore.setState({ playerHand: newHand });
      
      // 重置状态
      setDraggedTileIndex(null);
      setDragOverIndex(null);
    };

    return (
      <div className="player-hand">
        <div className="hand-title">
          <span>我的手牌</span>
          <button onClick={sortPlayerHand}>排序</button>
        </div>
        <div className="tiles-container">
          {playerHand.map((tile, index) => (
            <div 
              key={tile.id} 
              className={`tile ${selectedTiles.some(t => t.id === tile.id) ? 'selected' : ''} 
                ${draggedTileIndex === index ? 'dragging' : ''} 
                ${dragOverIndex === index ? 'drag-over' : ''}`}
              onClick={() => actionType === 'discard' ? handleTileSelect(tile) : null}
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
    );
  };

  // 渲染其他玩家的牌
  const renderOtherPlayers = () => {
    if (!gameState || !players.length) return null;

    return (
      <div className="other-players">
        {[1, 2, 3].map((relPos) => {
          const positions = Object.entries(gameState.playerPositions || {});
          const playerEntry = positions.find(([_, pos]) => getRelativePosition(pos) === relPos);
          
          if (!playerEntry) return (
            <div key={relPos} className="player-area empty">
              <div className="player-info">空位</div>
            </div>
          );
          
          const [playerEmail] = playerEntry;
          const playerRevealedTiles = revealedTiles[playerEmail] || [];
          
          return (
            <div key={relPos} className={`player-area position-${relPos}`}>
              <div className="player-info">
                {getPlayerDisplayName(playerEmail)}
                {playerEmail === gameState.dealerEmail && <span className="dealer-badge">庄家</span>}
              </div>
              <div className="player-tiles">
                {playerRevealedTiles.map((tile, idx) => (
                  <div key={idx} className="tile revealed">
                    {getTileDisplayName(tile)}
                  </div>
                ))}
                {Array.from({ length: 13 - playerRevealedTiles.length }).map((_, idx) => (
                  <div key={`hidden-${idx}`} className="tile hidden">
                    ?
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染牌桌中央区域
  const renderTableCenter = () => {
    return (
      <div className="table-center">
        <div className="draw-pile">
          <div className="pile-info">
            <span>牌库剩余: {drawPileCount}</span>
            <div className="draw-buttons">
              <button onClick={() => handleDrawTiles(1)}>抽1张</button>
              <button onClick={() => handleDrawTiles(3)}>抽3张</button>
            </div>
          </div>
        </div>
        
        <div className="discard-pile">
          <h3>弃牌区</h3>
          <div className="tiles-container">
            {discardPile.map((tile, idx) => (
              <div 
                key={idx} 
                className={`tile ${selectedTiles.some(t => t.id === tile.id) ? 'selected' : ''}`}
                onClick={() => actionType === 'take' ? handleTileSelect(tile) : null}
              >
                {getTileDisplayName(tile)}
              </div>
            ))}
          </div>
        </div>
        
        <div className="recent-actions">
          <h3>最近操作</h3>
          <div className="actions-list">
            {recentActions.slice().reverse().map((action, idx) => (
              <div key={idx} className="action-item">
                <span className="action-player">{getPlayerDisplayName(action.playerEmail)}:</span>
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
            ))}
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
            className={actionType === 'discard' ? 'active' : ''}
            onClick={() => handleActionClick('discard')}
          >
            打出牌
          </button>
          <button 
            className={actionType === 'take' ? 'active' : ''}
            onClick={() => handleActionClick('take')}
          >
            拿取牌
          </button>
          <button 
            className={actionType === 'reveal' ? 'active' : ''}
            onClick={() => handleActionClick('reveal')}
          >
            明牌
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

    return (
      <div className="win-confirmation-overlay">
        <div className="win-confirmation-modal">
          <h2>胜利确认</h2>
          <p>{getPlayerDisplayName(pendingWinner)}宣布自己胜利了！</p>
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

    return (
      <div className="game-end-overlay">
        <div className="game-end-modal">
          <h2>游戏结束</h2>
          {gameState.winnerEmail ? (
            <p>{getPlayerDisplayName(gameState.winnerEmail)}获得了胜利！</p>
          ) : (
            <p>游戏平局</p>
          )}
          <button onClick={handleBackToRoom}>
            返回房间
          </button>
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
          <div className="error-actions">
            <button onClick={() => window.location.reload()}>刷新页面</button>
            <button onClick={handleBackToRoom}>返回房间</button>
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
          <p>或者尝试<button onClick={handleBackToRoom}>返回房间</button>后重新进入游戏</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <header className="game-header">
        <h1>房间 #{roomId} - 游戏进行中</h1>
        <button onClick={handleBackToRoom}>返回房间</button>
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