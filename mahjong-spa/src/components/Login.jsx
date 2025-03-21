import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import '../styles/Login.css';

const Login = () => {
  const { loginWithGithub, loading, error } = useAuthStore();

  // 演示版直接自动登录
  useEffect(() => {
    // 组件挂载后立即登录
    loginWithGithub();
  }, [loginWithGithub]);

  const handleGithubLogin = async () => {
    await loginWithGithub();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>麻将对战系统</h1>
        <p className="subtitle">演示版</p>

        <button 
          onClick={handleGithubLogin}
          className="github-login-button"
          disabled={loading}
        >
          {loading ? '登录中...' : '使用 GitHub 账号登录'}
        </button>

        {error && <div className="error-message">{error}</div>}

        <div className="login-info">
          <p>点击上方按钮使用GitHub账号登录</p>
          <p>系统会自动创建账户</p>
          <p className="demo-notice">演示版将自动登录，无需真实GitHub账号</p>
        </div>
      </div>
    </div>
  );
};

export default Login; 