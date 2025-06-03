import React, { useContext } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const history = useHistory();

  const handleLogout = () => {
    logout();
    history.push('/login');
  };

  const getRoleBadge = (role) => {
    switch(role) {
      case 'admin':
        return { text: '管理员', class: 'bg-danger text-white' };
      case 'reviewer':
        return { text: '审核员', class: 'bg-success text-white' };
      case 'order_clerk':
        return { text: '下单员', class: 'bg-primary text-white' };
      case 'technician':
        return { text: '技术员', class: 'bg-info text-white' };
      case 'warehouse_clerk':
        return { text: '出入库员', class: 'bg-warning text-dark' };
      case 'workshop_tracker':
        return { text: '车间跟单员', class: 'bg-dark text-light' };
      default:
        return { text: '普通用户', class: 'bg-secondary' };
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          <i className="bi bi-fire me-2"></i>
          防火门订单管理系统
        </Link>

        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          {user ? (
            <>
              <ul className="navbar-nav me-auto">
                <li className="nav-item">
                  <Link className="nav-link" to="/dashboard">
                    <i className="bi bi-speedometer2 me-1"></i>控制台
                  </Link>
                </li>

                {/* 订单管理下拉菜单 */}
                <li className="nav-item dropdown">
                  <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                    <i className="bi bi-box me-1"></i>订单管理
                  </a>
                  <ul className="dropdown-menu">
                    <li><Link className="dropdown-item" to="/orders/new">
                      <i className="bi bi-plus-circle me-2"></i>新建订单
                    </Link></li>
                    <li><Link className="dropdown-item" to="/orders">
                      <i className="bi bi-list-ul me-2"></i>我的订单
                    </Link></li>
                  </ul>
                </li>
                
                {/* 管理员和审核员菜单 */}
                {(user.role === 'admin' || user.role === 'reviewer') && (
                  <li className="nav-item dropdown">
                    <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                      <i className="bi bi-gear me-1"></i>管理功能
                    </a>
                    <ul className="dropdown-menu">
                      <li><Link className="dropdown-item" to="/admin">
                        <i className="bi bi-speedometer2 me-2"></i>管理面板
                      </Link></li>
                      <li><Link className="dropdown-item" to="/admin/orders/review">
                        <i className="bi bi-clipboard-check me-2"></i>订单审核
                      </Link></li>
                      {user.role === 'admin' && (
                        <li><Link className="dropdown-item" to="/admin/users">
                          <i className="bi bi-people me-2"></i>用户管理
                        </Link></li>
                      )}
                    </ul>
                  </li>
                )}

                {/* 生产管理 - 技术员、车间跟单员、管理员可见 */}
                {(user.role === 'admin' || user.role === 'technician' || user.role === 'workshop_tracker') && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/production">
                      <i className="bi bi-gear-fill me-1"></i>生产管理
                    </Link>
                  </li>
                )}

                {/* 仓库管理 - 出入库员、管理员可见 */}
                {(user.role === 'admin' || user.role === 'warehouse_clerk') && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/warehouse">
                      <i className="bi bi-box-seam me-1"></i>仓库管理
                    </Link>
                  </li>
                )}
              </ul>

              <ul className="navbar-nav">
                <li className="nav-item dropdown">
                  <a className="nav-link dropdown-toggle d-flex align-items-center" href="#" role="button" data-bs-toggle="dropdown">
                    <i className="bi bi-person-circle me-1"></i>
                    {user.full_name || user.username}
                    <span className={`badge ms-2 ${getRoleBadge(user.role).class}`}>
                      {getRoleBadge(user.role).text}
                    </span>
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li className="dropdown-header">
                      <div className="fw-bold">{user.full_name || user.username}</div>
                      <small className="text-muted">{user.email}</small>
                    </li>
                    <li><span className="dropdown-item-text">
                      <small className="text-muted">用户名：{user.username}</small>
                    </span></li>
                    <li><span className="dropdown-item-text">
                      <small className="text-muted">
                        姓名：{user.full_name || '未设置'}
                      </small>
                    </span></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><Link className="dropdown-item" to="/profile">
                      <i className="bi bi-person me-2"></i>个人资料
                    </Link></li>
                    <li><Link className="dropdown-item" to="/settings">
                      <i className="bi bi-gear me-2"></i>设置
                    </Link></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right me-2"></i>退出登录
                      </button>
                    </li>
                  </ul>
                </li>
              </ul>
            </>
          ) : (
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/login">
                  <i className="bi bi-box-arrow-in-right me-1"></i>登录
                </Link>
              </li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;