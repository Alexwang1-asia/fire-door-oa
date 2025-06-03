import React, { useState, useContext, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, isAuthenticated } = useContext(AuthContext);
  const history = useHistory();
  const location = useLocation();

  // 如果已登录，重定向到目标页面
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      history.replace(from);
    }
  }, [isAuthenticated, history, location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    // 清除错误信息
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const result = await login(credentials.username, credentials.password);
      
      if (result.success) {
        const from = location.state?.from?.pathname || '/dashboard';
        history.replace(from);
      } else {
        setError(result.error || '登录失败');
      }
    } catch (err) {
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <h3 className="card-title">防火门 OA 系统</h3>
                  <p className="text-muted">请登录您的账户</p>
                </div>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">
                      用户名
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      name="username"
                      value={credentials.username}
                      onChange={handleChange}
                      placeholder="请输入用户名"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                      密码
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      value={credentials.password}
                      onChange={handleChange}
                      placeholder="请输入密码"
                      required
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        登录中...
                      </>
                    ) : (
                      '登录'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
