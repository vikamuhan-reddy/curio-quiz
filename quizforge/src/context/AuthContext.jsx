import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/api/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  // register no longer returns a token — just sends verification email
  const register = async (username, email, password) => {
    await api.post('/api/auth/register', { username, email, password });
    // no token stored — user must verify email first
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const isHost = user?.role === 'host';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isHost }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);