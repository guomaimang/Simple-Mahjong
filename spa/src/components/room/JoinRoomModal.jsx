import React, { useState } from 'react';
import styled from 'styled-components';
import Button from '../ui/Button';
import Input from '../ui/Input';

// 模态框背景
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

// 模态框容器
const ModalContainer = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
`;

// 模态框头部
const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  
  h2 {
    margin: 0;
  }
`;

// 模态框内容
const ModalContent = styled.div`
  margin-bottom: 1.5rem;
`;

// 模态框底部
const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

// 关闭按钮
const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  
  &:hover {
    color: #333;
  }
`;

// 加入房间模态框组件
const JoinRoomModal = ({ isOpen, onClose, onJoin, loading }) => {
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  // 处理提交
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 验证输入
    if (!roomId.trim()) {
      setError('请输入房间号');
      return;
    }
    
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }
    
    // 尝试加入房间
    onJoin(parseInt(roomId, 10), password)
      .then(() => {
        // 成功后关闭模态框
        onClose();
        // 重置表单
        setRoomId('');
        setPassword('');
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.error || '加入房间失败，请检查房间号和密码');
      });
  };

  // 如果模态框未打开，不渲染任何内容
  if (!isOpen) {
    return null;
  }

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h2>加入房间</h2>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>
        
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <Input
              id="roomId"
              label="房间号"
              type="number"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              fullWidth
              error={error && !roomId.trim() ? '请输入房间号' : null}
            />
            
            <Input
              id="password"
              label="密码"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              error={error && !password.trim() ? '请输入密码' : null}
            />
            
            {error && <div style={{ color: '#f44336', marginTop: '0.5rem' }}>{error}</div>}
          </form>
        </ModalContent>
        
        <ModalFooter>
          <Button
            variant="light"
            onClick={onClose}
            disabled={loading}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '加入中...' : '加入'}
          </Button>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default JoinRoomModal; 