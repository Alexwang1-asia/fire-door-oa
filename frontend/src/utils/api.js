import axios from 'axios';
import { refreshToken } from './tokenRefresh';

// API基础URL
const API_BASE_URL = 'http://192.168.9.100:8000'; // Django默认端口是8000而不是5000

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 请求拦截器 - 添加认证令牌
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // 将x-auth-token替换为Bearer认证
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理令牌过期
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // 如果是401错误且尚未尝试过刷新令牌
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // 尝试刷新令牌
      const refreshed = await refreshToken();
      if (refreshed) {
        // 使用新令牌重新发送原始请求
        const token = localStorage.getItem('token');
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return axios(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
