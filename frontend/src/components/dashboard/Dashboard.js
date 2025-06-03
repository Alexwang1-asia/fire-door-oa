import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    rejectedOrders: 0,
    ReadyProductionOrders: 0, // 添加待生产订单数量
    inProductionOrders: 0, // 添加生产中订单数量
    completedOrders: 0,    // 添加已完成订单数量
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // 添加错误处理状态

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [ordersRes, recentRes] = await Promise.all([
        api.get('/api/orders/stats/'),
        api.get('/api/orders/my/?limit=5')
      ]);
      
      setStats({
        totalOrders: ordersRes.data.total_orders || 0,
        pendingOrders: ordersRes.data.pending_orders || 0,
        approvedOrders: ordersRes.data.approved_orders || 0,
        rejectedOrders: ordersRes.data.rejected_orders || 0,
        ReadyProductionOrders: ordersRes.data.ready_production_orders || 0, // 添加待生产订单数量
        inProductionOrders: ordersRes.data.in_production_orders || 0, // 添加生产中订单数量
        completedOrders: ordersRes.data.completed_orders || 0,        // 添加已完成订单数量
        recentOrders: recentRes.data.results || recentRes.data
      });
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('获取仪表板数据失败:', err);
      setError('获取数据失败，请刷新重试');
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <span className="badge bg-warning text-dark">待审核</span>;
      case 'approved': return <span className="badge bg-success">已批准</span>;
      case 'rejected': return <span className="badge bg-danger">已拒绝</span>;
      case 'ready_production': return <span className="badge bg-secondary">待生产</span>;
      case 'in_production': return <span className="badge bg-primary">生产中</span>;
      case 'in_warehouse': return <span className="badge bg-dark text-white">已入库</span>;
      case 'out_warehouse': return <span className="badge bg-light text-dark">已出库</span>;
      case 'completed': return <span className="badge bg-info">已完成</span>;
      default: return <span className="badge bg-secondary">未知</span>;
    }
  };

  if (loading) {
    return <div className="d-flex justify-content-center mt-5"><div className="spinner-border"></div></div>;
  }

  if (error) {
    return <div className="alert alert-danger text-center mt-5">{error}</div>;
  }

  return (
    <div className="container mt-4">
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-0">控制面板</h2>
          <p className="text-muted">欢迎回来, {user.username}! 今天是 {new Date().toLocaleDateString('zh-CN')}</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="row mb-4">
        <div className="col-md-2 mb-3">
          <div className="card bg-primary text-white h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">总订单数</h6>
                  <h2 className="mb-0">{stats.totalOrders}</h2>
                </div>
                <div className="align-self-center">
                  <i className="bi bi-file-earmark-text" style={{fontSize: '2rem'}}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 mb-3">
          <div className="card bg-warning text-dark h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">待审核</h6>
                  <h2 className="mb-0">{stats.pendingOrders}</h2>
                </div>
                <div className="align-self-center">
                  <i className="bi bi-clock-history" style={{fontSize: '2rem'}}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 mb-3">
          <div className="card bg-success text-white h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">已批准</h6>
                  <h2 className="mb-0">{stats.approvedOrders}</h2>
                </div>
                <div className="align-self-center">
                  <i className="bi bi-check-circle" style={{fontSize: '2rem'}}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-2 mb-3">
          <div className="card bg-danger text-white h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">已拒绝</h6>
                  <h2 className="mb-0">{stats.rejectedOrders}</h2>
                </div>
                <div className="align-self-center">
                  <i className="bi bi-x-circle" style={{fontSize: '2rem'}}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-2 mb-3">
          <div className="card bg-secondary text-white h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">待生产</h6>
                  <h2 className="mb-0">{stats.ReadyProductionOrders}</h2>
                </div>
                <div className="align-self-center">
                  <i className="bi bi-gear" style={{fontSize: '2rem'}}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-2 mb-3">
          <div className="card bg-info text-white h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">生产中</h6>
                  <h2 className="mb-0">{stats.inProductionOrders}</h2>
                </div>
                <div className="align-self-center">
                  <i className="bi bi-check2-all" style={{fontSize: '2rem'}}></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* 快捷操作 */}
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-lightning-charge me-2"></i>快捷操作
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-6">
                  <Link to="/orders/new" className="btn btn-outline-primary w-100">
                    <i className="bi bi-plus-circle mb-2 d-block" style={{fontSize: '2rem'}}></i>
                    新建订单
                  </Link>
                </div>
                <div className="col-6">
                  <Link to="/orders" className="btn btn-outline-info w-100">
                    <i className="bi bi-list-ul mb-2 d-block" style={{fontSize: '2rem'}}></i>
                    查看订单
                  </Link>
                </div>
                {user.role === 'admin' && (
                  <>
                    <div className="col-6">
                      <Link to="/admin/orders/review" className="btn btn-outline-warning w-100">
                        <i className="bi bi-clipboard-check mb-2 d-block" style={{fontSize: '2rem'}}></i>
                        审核订单
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 最近订单 */}
        <div className="col-md-6 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="bi bi-clock-history me-2"></i>最近订单
              </h5>
              <Link to="/orders" className="btn btn-sm btn-outline-primary">查看全部</Link>
            </div>
            <div className="card-body">
              {stats.recentOrders.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-inbox" style={{fontSize: '3rem'}}></i>
                  <p className="mt-2">暂无订单记录</p>
                  <Link to="/orders/new" className="btn btn-primary btn-sm">立即创建</Link>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {stats.recentOrders.map((order) => (
                    <Link 
                      key={order.id} 
                      to={`/orders/${order.id}`}
                      className="list-group-item list-group-item-action"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{order.order_number}</h6>
                          <p className="mb-1 text-muted small">{order.project_name}</p>
                          <small className="text-muted">
                            {new Date(order.created_at).toLocaleDateString()}
                          </small>
                        </div>
                        <div>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;