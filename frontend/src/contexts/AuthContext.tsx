import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileComplete: boolean;
  resumeUrl?: string;
  coverLetterTemplate?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API URL from environment or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load user from token on initial render
  useEffect(() => {
    const loadUser = async () => {
      if (localStorage.token) {
        setAuthToken(localStorage.token);
        try {
          const res = await axios.get(`${API_URL}/auth/me`);
          if (res.data.status === 'success') {
            setUser(res.data.user);
            setIsAuthenticated(true);
          }
        } catch (err) {
          console.error('Error loading user:', err);
          localStorage.removeItem('token');
          setAuthToken(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  // Set auth token for axios requests
  const setAuthToken = (token: string | null) => {
    if (token) {
      axios.defaults.headers.common['x-auth-token'] = token;
    } else {
      delete axios.defaults.headers.common['x-auth-token'];
    }
  };

  // Login user
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      
      if (res.data.status === 'success') {
        localStorage.setItem('token', res.data.token);
        setAuthToken(res.data.token);
        setUser(res.data.user);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      localStorage.removeItem('token');
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (username: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post(`${API_URL}/auth/register`, { username, email, password });
      
      if (res.data.status === 'success') {
        localStorage.setItem('token', res.data.token);
        setAuthToken(res.data.token);
        setUser(res.data.user);
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      localStorage.removeItem('token');
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        error,
        login,
        register,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
