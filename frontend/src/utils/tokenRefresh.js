import api from './api';

export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return false;
    }
    
    const res = await api.post('/api/auth/token/refresh/', {
      refresh: refreshToken
    });
    
    if (res.data.access) {
      localStorage.setItem('token', res.data.access);
      return true;
    }
    return false;
  } catch (error) {
    console.error('令牌刷新失败:', error);
    // 清除无效的令牌
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return false;
  }
};
