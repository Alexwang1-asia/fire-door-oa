// filepath: f:\wangzheng\图标\fire-door-oa\frontend\src\context\AuthContext.js
import React, { createContext, useReducer, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false
      };
    default:
      return state;
  }
};

const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    loading: true
  });

  // 检查用户认证状态
  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    try {
      // 修复：使用正确的API路径
      const response = await api.get('/api/users/me/');
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.data,
          token: token
        }
      });
    } catch (error) {
      console.error('认证检查失败:', error);
      localStorage.removeItem('token');
      dispatch({ type: 'AUTH_ERROR' });
    }
  };

  // 登录函数
  const login = async (username, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // 修复：使用正确的API路径
      const response = await api.post('/api/users/login/', {
        username,
        password
      });

      const { access, user } = response.data;
      
      localStorage.setItem('token', access);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: user,
          token: access
        }
      });

      return { success: true };
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR' });
      
      let errorMessage = '登录失败';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.non_field_errors) {
        errorMessage = error.response.data.non_field_errors[0];
      }
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  // 登出函数
  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };