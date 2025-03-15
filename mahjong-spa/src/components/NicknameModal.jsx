import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import '../styles/Modal.css';

const NicknameModal = ({ isOpen, onClose }) => {
  const { user, updateNickname, loading, error } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      alert('昵称不能为空');
      return;
    }
    
    const success = await updateNickname(nickname);
    if (success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>修改昵称</h2>
          <button 
            className="modal-close-button" 
            onClick={onClose}
            disabled={loading}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nickname">昵称</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入新昵称"
              maxLength={20}
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-footer">
            <button 
              type="button" 
              className="cancel-button" 
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
            <button 
              type="submit" 
              className="confirm-button"
              disabled={loading}
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NicknameModal; 