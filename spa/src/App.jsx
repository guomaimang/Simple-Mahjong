import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RoomProvider } from './contexts/RoomContext';
import { GameProvider } from './contexts/GameContext';
import LoginPage from './pages/LoginPage';
import RoomsPage from './pages/RoomsPage';
import GamePage from './pages/GamePage';
import './App.css';

// 受保护的路由组件
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>加载中...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// 应用程序组件
const App = () => {
  return (
    <Router>
      <DndProvider backend={HTML5Backend}>
        <AuthProvider>
          <RoomProvider>
            <GameProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/rooms"
                  element={
                    <ProtectedRoute>
                      <RoomsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/room/:roomId"
                  element={
                    <ProtectedRoute>
                      <GamePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/rooms" replace />} />
              </Routes>
            </GameProvider>
          </RoomProvider>
        </AuthProvider>
      </DndProvider>
    </Router>
  );
};

export default App;
