import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useTheme } from './ThemeContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('bm_token'));
  const [loading, setLoading] = useState(true);
  const { setTheme } = useTheme();

  const fetchProfile = async () => {
    try {
      const data = await api.auth.me();
      if (data.success && data.user) {
        setUser(data.user);
        if (data.user.dark_mode !== undefined) {
          setTheme(data.user.dark_mode === 1);
        }
      }
    } catch (err) {
      console.warn('Session expired or invalid:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }

    const handleAuthLogout = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('bm_auth_logout', handleAuthLogout);
    return () => window.removeEventListener('bm_auth_logout', handleAuthLogout);
  }, [token]);

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    if (data.success && data.token) {
      localStorage.setItem('bm_token', data.token);
      setToken(data.token);
      setUser(data.user);
      if (data.user.dark_mode !== undefined) {
        setTheme(data.user.dark_mode === 1);
      }
      return data.user;
    }
  };

  const signup = async (name, email, password) => {
    const data = await api.auth.signup(name, email, password);
    if (data.success && data.token) {
      localStorage.setItem('bm_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
  };

  const logout = () => {
    localStorage.removeItem('bm_token');
    setToken(null);
    setUser(null);
  };

  const updateUserSettings = async (newSettings) => {
    const data = await api.auth.updateSettings(newSettings);
    if (data.success && data.user) {
      setUser(prev => ({ ...prev, ...data.user }));
      if (newSettings.dark_mode !== undefined) {
        setTheme(newSettings.dark_mode === 1);
      }
    }
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        signup,
        logout,
        refreshUser: fetchProfile,
        updateUserSettings
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
