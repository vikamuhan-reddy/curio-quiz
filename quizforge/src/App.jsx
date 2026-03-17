import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import JoinQuiz from './pages/JoinQuiz.jsx';
import QuizPlayer from './pages/QuizPlayer.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import HostDashboard from './pages/HostDashboard.jsx';
import CreateQuiz from './pages/CreateQuiz.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import VerifyOTP from './pages/VerifyOTP.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import CreateQuizFromFile from './pages/CreateQuizFromFile.jsx';
import CreateQuizAI from './pages/CreateQuizAI.jsx';
import PinGate from './components/PinGate';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/join" element={<JoinQuiz />} />
      <Route path="/play/:sessionId" element={<QuizPlayer />} />
      <Route path="/leaderboard/:sessionId" element={<Leaderboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={
  <PinGate>
    <Register />
  </PinGate>
} />
      <Route path="/auth/callback" element={<VerifyOTP />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><HostDashboard /></ProtectedRoute>
      } />
      <Route path="/quiz/create" element={
        <ProtectedRoute><CreateQuiz /></ProtectedRoute>
      } />
      <Route path="/quiz/edit/:id" element={
        <ProtectedRoute><CreateQuiz /></ProtectedRoute>
      } />
      <Route path="/quiz/from-file" element={
        <ProtectedRoute><CreateQuizFromFile /></ProtectedRoute>
      } />
      <Route path="/quiz/ai" element={
        <ProtectedRoute><CreateQuizAI /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}