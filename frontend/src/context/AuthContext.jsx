import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('bookleaf_token'));
  const [loading, setLoading] = useState(true);
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [error, setError] = useState(null);

  // Load demo accounts list for effortless switching
  useEffect(() => {
    api.getDemoUsers()
      .then(accounts => setDemoAccounts(accounts))
      .catch(err => console.warn('Could not load demo accounts:', err));
  }, []);

  // Validate or restore user from token
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('bookleaf_token');
      if (storedToken) {
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch (err) {
          console.warn('Session expired or invalid, please log in.');
          localStorage.removeItem('bookleaf_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password = null) => {
    setError(null);
    try {
      const res = await api.login(email, password);
      localStorage.setItem('bookleaf_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('bookleaf_token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const switchAccount = async (email, password = null) => {
    return await login(email, password);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      demoAccounts,
      login,
      logout,
      switchAccount,
      isAdmin: user?.role === 'admin',
      isAuthor: user?.role === 'author'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
