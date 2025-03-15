import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

// 页面容器
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background-color: #f5f5f5;
`;

// 标题
const Title = styled.h1`
  margin-bottom: 2rem;
  color: #333;
  text-align: center;
`;

// 登录卡片
const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
`;

// 登录页面组件
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  // 处理登录
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // 验证邮箱
    if (!email.trim()) {
      setError('请输入邮箱');
      return;
    }
    
    if (!email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }
    
    try {
      // 尝试登录
      await login(email);
      // 登录成功后跳转到房间页面
      navigate('/rooms');
    } catch (error) {
      setError(error.message || '登录失败，请稍后重试');
    }
  };

  return (
    <PageContainer>
      <Title>麻将对战系统</Title>
      
      <LoginCard
        header="登录"
        headerColor="#2196F3"
      >
        <form onSubmit={handleLogin}>
          <Input
            id="email"
            label="邮箱"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            error={error}
            helpText="输入您的邮箱地址进行登录或注册"
          />
          
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>
      </LoginCard>
    </PageContainer>
  );
};

export default LoginPage; 