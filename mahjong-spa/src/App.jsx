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

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/rooms" /> : <Login />} />
        <Route path="/rooms" element={isAuthenticated ? <RoomList /> : <Navigate to="/" />} />
        <Route path="/rooms/:roomId" element={isAuthenticated ? <Room /> : <Navigate to="/" />} />
        <Route path="/rooms/:roomId/game" element={isAuthenticated ? <Game /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
