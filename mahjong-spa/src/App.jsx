import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Login';
import RoomList from './components/RoomList';
import Room from './components/Room';
import Game from './components/Game';
import { useAuthStore } from './stores/authStore';

function App() {
  const { isAuthenticated, initialize } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      await initialize();
      setLoading(false);
    };
    
    initAuth();
  }, [initialize]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={loading ? <LoadingIndicator /> : (isAuthenticated ? <Navigate to="/rooms" /> : <Login />)} />
        <Route path="/rooms" element={loading ? <LoadingIndicator /> : (isAuthenticated ? <RoomList /> : <Navigate to="/" />)} />
        <Route path="/rooms/:roomId" element={loading ? <LoadingIndicator /> : (isAuthenticated ? <Room /> : <Navigate to="/" />)} />
        <Route path="/rooms/:roomId/game" element={loading ? <LoadingIndicator /> : (isAuthenticated ? <Game /> : <Navigate to="/" />)} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

// 内联加载指示器组件，仅在当前视图中显示加载状态
function LoadingIndicator() {
  return (
    <div className="inline-loading">
      <div className="loading-spinner"></div>
    </div>
  );
}

export default App;
