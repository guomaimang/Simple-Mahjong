import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import '../styles/Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const { login, loading, error } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      alert('请输入有效的邮箱地址');
      return;
    }
    await login(email);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>麻将对战系统</h1>
        <p className="subtitle">请使用邮箱登录</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">邮箱地址</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱地址"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="login-info">
          <p>无需注册，直接使用邮箱登录</p>
          <p>系统会自动创建账户</p>
        </div>
      </div>
    </div>
  );
};

export default Login; 