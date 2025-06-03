import React, { useState, useEffect, useContext } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const history = useHistory();
  const [stats, setStats] = useState({
    total_orders: 0,
    pending_orders: 0,
    approved_orders: 0,
    rejected_orders: 0,
    in_production_orders: 0, // 新增
    completed_orders: 0,
    total_users: 0,
    last_updated: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
    
    // 设置定时刷新（每30秒）
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('开始获取统计数据...', user);
      
      // 所有登录用户都可以查看统计数据
      const res = await api.get('/api/orders/admin/stats/');
      console.log('统计API响应:', res.data);
      
      if (res.data) {
        setStats({
          total_orders: res.data.total_orders || 0,
          pending_orders: res.data.pending_orders || 0,
          approved_orders: res.data.approved_orders || 0,
          rejected_orders: res.data.rejected_orders || 0,
          in_production_orders: res.data.in_production_orders || 0, // 新增
          completed_orders: res.data.completed_orders || 0,
          total_users: res.data.total_users || 0,
          last_updated: res.data.last_updated || new Date().toISOString()
        });
      }
      
    } catch (err) {
      console.error('获取统计数据失败:', err);
      
      let errorMessage = '获取统计数据失败';
      
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = '请重新登录后再试';
          setTimeout(() => {
            history.push('/login');
          }, 2000);
        } else if (err.response.data?.error) {
          errorMessage = err.response.data.error;
        } else {
          errorMessage = `服务器错误 (${err.response.status})`;
        }
      } else if (err.request) {
        errorMessage = '网络连接失败，请检查网络连接';
      } else {
        errorMessage = `请求失败: ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats.last_updated) {
    return (
      <div className="container mt-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* 页面标题 */}
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-0">
            <i className="bi bi-speedometer me-2"></i>
            系统控制台
          </h2>
          <p className="text-muted">
            系统概览和数据统计
            {stats.last_updated && (
              <small className="ms-2">
                (更新时间: {new Date(stats.last_updated).toLocaleString('zh-CN')})
              </small>
            )}
          </p>
        </div>
        <div className="col-auto">
          <button 
            className="btn btn-outline-primary"
            onClick={fetchStats}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner-border spinner-border-sm me-1" role="status"></div>
                刷新中...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-clockwise me-1"></i>
                刷新数据
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
          <div className="mt-2">
            <button className="btn btn-sm btn-outline-danger" onClick={fetchStats}>
              <i className="bi bi-arrow-clockwise me-1"></i>
              重试
            </button>
          </div>
        </div>
      )}

      {/* 欢迎信息 */}
      <div className="row mb-4">
        <div className="col">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <i className="bi bi-person-badge" style={{fontSize: '3rem'}}></i>
                </div>
                <div>
                  <h4 className="card-title mb-1">
                    欢迎，{user?.full_name || user?.username}
                  </h4>
                  <p className="card-text mb-0">
                    {user?.role === 'admin' ? '系统管理员' : 
                     user?.role === 'reviewer' ? '订单审核员' :
                     user?.role === 'order_clerk' ? '下单员' :
                     user?.role === 'technician' ? '技术员' :
                     user?.role === 'warehouse_clerk' ? '出入库员' :
                     user?.role === 'workshop_tracker' ? '车间跟踪员' : '系统用户'} | 
                    今天是 {new Date().toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="row mb-4">
        <div className="col-md-2">
          <div className="card border-warning">
            <div className="card-body text-center">
              <i className="bi bi-clock-history text-warning" style={{fontSize: '2rem'}}></i>
              <h4 className="mt-2 mb-0 text-warning">{stats.pending_orders}</h4>
              <p className="text-muted mb-0 small">待审核</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card border-success">
            <div className="card-body text-center">
              <i className="bi bi-check-circle text-success" style={{fontSize: '2rem'}}></i>
              <h4 className="mt-2 mb-0 text-success">{stats.approved_orders}</h4>
              <p className="text-muted mb-0 small">已批准</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card border-info">
            <div className="card-body text-center">
              <i className="bi bi-gear text-info" style={{fontSize: '2rem'}}></i>
              <h4 className="mt-2 mb-0 text-info">{stats.in_production_orders}</h4>
              <p className="text-muted mb-0 small">生产中</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card border-danger">
            <div className="card-body text-center">
              <i className="bi bi-x-circle text-danger" style={{fontSize: '2rem'}}></i>
              <h4 className="mt-2 mb-0 text-danger">{stats.rejected_orders}</h4>
              <p className="text-muted mb-0 small">已拒绝</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card border-primary">
            <div className="card-body text-center">
              <i className="bi bi-check-all text-primary" style={{fontSize: '2rem'}}></i>
              <h4 className="mt-2 mb-0 text-primary">{stats.completed_orders}</h4>
              <p className="text-muted mb-0 small">已完成</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card border-secondary">
            <div className="card-body text-center">
              <i className="bi bi-files text-secondary" style={{fontSize: '2rem'}}></i>
              <h4 className="mt-2 mb-0 text-secondary">{stats.total_orders}</h4>
              <p className="text-muted mb-0 small">总订单</p>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header bg-light">
              <h5 className="card-title mb-0">
                <i className="bi bi-lightning me-2"></i>
                快捷操作
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                {/* 审核功能只对管理员和审核员显示 */}
                {user?.role && ['admin', 'reviewer'].includes(user.role) && (
                  <Link to="/admin/orders/review" className="btn btn-warning">
                    <i className="bi bi-clipboard-check me-2"></i>
                    处理待审核订单
                    {stats.pending_orders > 0 && (
                      <span className="badge bg-dark ms-2">{stats.pending_orders}</span>
                    )}
                  </Link>
                )}
                
                {/* 用户管理只对管理员显示 */}
                {user?.role === 'admin' && (
                  <Link to="/admin/users" className="btn btn-info">
                    <i className="bi bi-people me-2"></i>
                    用户管理
                    <span className="badge bg-dark ms-2">{stats.total_users}</span>
                  </Link>
                )}
                
                {/* 技术员快捷操作 */}
                {user?.role === 'technician' && (
                  <Link to="/technician" className="btn btn-warning">
                    <i className="bi bi-wrench-adjustable me-2"></i>
                    技术员工作台
                    {stats.approved_orders > 0 && (
                      <span className="badge bg-dark ms-2">{stats.approved_orders}</span>
                    )}
                  </Link>
                )}

                {/* 所有用户都可以查看订单 */}
                <Link to="/orders" className="btn btn-outline-primary">
                  <i className="bi bi-list-ul me-2"></i>
                  查看所有订单
                  <span className="badge bg-primary ms-2">{stats.total_orders}</span>
                </Link>

                {/* 创建订单只对下单员和管理员显示 */}
                {user?.role && ['admin', 'order_clerk'].includes(user.role) && (
                  <Link to="/orders/new" className="btn btn-success">
                    <i className="bi bi-plus-circle me-2"></i>
                    创建新订单
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header bg-light">
              <h5 className="card-title mb-0">
                <i className="bi bi-graph-up me-2"></i>
                系统概览
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-6">
                  <div className="text-center p-3 bg-light rounded">
                    <h4 className="text-primary">{stats.total_orders}</h4>
                    <small className="text-muted">总订单数</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center p-3 bg-light rounded">
                    <h4 className="text-info">{stats.total_users}</h4>
                    <small className="text-muted">总用户数</small>
                  </div>
                </div>
              </div>
              
              <div className="mt-3">
                <div className="progress" style={{height: '8px'}}>
                  <div 
                    className="progress-bar bg-success" 
                    style={{
                      width: stats.total_orders > 0 ? 
                        `${(stats.approved_orders / stats.total_orders) * 100}%` : '0%'
                    }}
                    title={`已批准: ${stats.approved_orders}`}
                  ></div>
                  <div 
                    className="progress-bar bg-info" 
                    style={{
                      width: stats.total_orders > 0 ? 
                        `${(stats.in_production_orders / stats.total_orders) * 100}%` : '0%'
                    }}
                    title={`生产中: ${stats.in_production_orders}`}
                  ></div>
                  <div 
                    className="progress-bar bg-warning" 
                    style={{
                      width: stats.total_orders > 0 ? 
                        `${(stats.pending_orders / stats.total_orders) * 100}%` : '0%'
                    }}
                    title={`待审核: ${stats.pending_orders}`}
                  ></div>
                  <div 
                    className="progress-bar bg-danger" 
                    style={{
                      width: stats.total_orders > 0 ? 
                        `${(stats.rejected_orders / stats.total_orders) * 100}%` : '0%'
                    }}
                    title={`已拒绝: ${stats.rejected_orders}`}
                  ></div>
                  <div 
                    className="progress-bar bg-primary" 
                    style={{
                      width: stats.total_orders > 0 ? 
                        `${(stats.completed_orders / stats.total_orders) * 100}%` : '0%'
                    }}
                    title={`已完成: ${stats.completed_orders}`}
                  ></div>
                </div>
                <small className="text-muted">订单状态分布</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 使用说明 */}
      <div className="row">
        <div className="col">
          <div className="card border-info">
            <div className="card-body">
              <h6 className="card-title text-info">
                <i className="bi bi-info-circle me-1"></i>
                功能说明
              </h6>
              <div className="row">
                <div className="col-md-6">
                  <ul className="list-unstyled small text-muted mb-0">
                    <li><i className="bi bi-list-ul text-primary me-1"></i><strong>查看所有订单</strong>：所有用户都可以浏览系统中的订单记录</li>
                    {user?.role && ['admin', 'order_clerk'].includes(user.role) && (
                      <li><i className="bi bi-plus-circle text-success me-1"></i><strong>创建新订单</strong>：创建新的防火门订单申请</li>
                    )}
                  </ul>
                </div>
                <div className="col-md-6">
                  <ul className="list-unstyled small text-muted mb-0">
                    {user?.role && ['admin', 'reviewer'].includes(user.role) && (
                      <li><i className="bi bi-clipboard-check text-warning me-1"></i><strong>处理待审核订单</strong>：审核和处理等待审核的订单申请</li>
                    )}
                    {user?.role === 'admin' && (
                      <li><i className="bi bi-people text-info me-1"></i><strong>用户管理</strong>：管理系统用户账户和权限</li>
                    )}
                    {user?.role === 'technician' && (
                      <li><i className="bi bi-wrench-adjustable text-warning me-1"></i><strong>技术员工作台</strong>：下载下料单和上传生产面单</li>
                    )}
                    <li><i className="bi bi-graph-up text-success me-1"></i><strong>统计数据</strong>：实时显示系统运行状态和数据统计</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;