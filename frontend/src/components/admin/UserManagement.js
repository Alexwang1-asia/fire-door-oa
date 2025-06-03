import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    confirm_password: '',
    role: 'order_clerk',
    full_name: '',
    email: '',
    phone: '',
    department: ''
  });

  // 角色选项 - 确保包含技术员
  const roleOptions = [
    { value: 'order_clerk', label: '下单员' },
    { value: 'reviewer', label: '审核员' },
    { value: 'technician', label: '技术员' }, // 添加技术员选项
    { value: 'warehouse_clerk', label: '出入库员' },
    { value: 'workshop_tracker', label: '车间跟单员' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('正在获取用户列表...');
      console.log('API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:8000');
      
      // 先测试登录状态
      const currentUser = await api.get('/api/users/me/');
      console.log('当前用户:', currentUser.data);
      
      // 检查用户权限
      if (currentUser.data.role !== 'admin') {
        throw new Error('您没有管理员权限');
      }
      
      const response = await api.get('/api/users/admin/users/');
      
      console.log('用户列表响应:', response.data);
      console.log('响应状态:', response.status);
      console.log('响应头:', response.headers);
      
      // 确保响应数据是数组
      const userData = Array.isArray(response.data) ? response.data : [];
      setUsers(userData);
      setLoading(false);
      
    } catch (err) {
      console.error('获取用户列表失败:', err);
      console.error('错误详情:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: err.config
      });
      
      let errorMessage = '获取用户列表失败';
      
      if (err.response?.status === 404) {
        errorMessage = 'API端点不存在，请检查服务器配置';
      } else if (err.response?.status === 403) {
        errorMessage = '您没有权限查看用户列表';
      } else if (err.response?.status === 401) {
        errorMessage = '请先登录';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (newUser.password !== newUser.confirm_password) {
      alert('两次输入的密码不一致');
      return;
    }

    try {
      await api.post('/api/users/admin/users/', newUser);
      setShowCreateModal(false);
      setNewUser({
        username: '',
        password: '',
        confirm_password: '',
        role: 'order_clerk',
        full_name: '',
        email: '',
        phone: '',
        department: ''
      });
      await fetchUsers();
      showNotification('用户创建成功', 'success');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.username?.[0] || 
                          '创建用户失败';
      alert(errorMessage);
    }
  };

  const handleEditUser = (userToEdit) => {
    setEditingUser({
      ...userToEdit,
      password: ''  // 不显示原密码
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    try {
      const updateData = {
        role: editingUser.role,
        full_name: editingUser.full_name,
        email: editingUser.email,
        phone: editingUser.phone,
        department: editingUser.department,
        is_active: editingUser.is_active
      };

      await api.put(`/api/users/admin/users/${editingUser.id}/`, updateData);
      setShowEditModal(false);
      setEditingUser(null);
      await fetchUsers();
      showNotification('用户信息更新成功', 'success');
    } catch (err) {
      const errorMessage = err.response?.data?.error || '更新用户失败';
      alert(errorMessage);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!confirm('确定要重置该用户的密码吗？新密码将是 123456')) {
      return;
    }

    try {
      const response = await api.post(`/api/users/admin/users/${userId}/reset-password/`, {
        new_password: '123456'
      });
      alert(`密码重置成功，新密码：${response.data.new_password}`);
    } catch (err) {
      alert('密码重置失败');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('确定要删除该用户吗？此操作不可恢复！')) {
      return;
    }

    try {
      await api.delete(`/api/users/admin/users/${userId}/`);
      await fetchUsers();
      showNotification('用户删除成功', 'success');
    } catch (err) {
      alert('删除用户失败');
    }
  };

  const showNotification = (message, type) => {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
      <i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  };

  const getRoleBadge = (role) => {
    const roleMap = {
      'admin': { label: '管理员', class: 'bg-danger', icon: 'bi-shield-fill-check' },
      'order_clerk': { label: '下单员', class: 'bg-primary', icon: 'bi-plus-circle' },
      'reviewer': { label: '审核员', class: 'bg-success', icon: 'bi-clipboard-check' },
      'technician': { label: '技术员', class: 'bg-info', icon: 'bi-wrench-adjustable' }, // 技术员样式
      'warehouse_clerk': { label: '出入库员', class: 'bg-warning text-dark', icon: 'bi-box-seam' },
      'workshop_tracker': { label: '车间跟单员', class: 'bg-secondary', icon: 'bi-gear' }
    };

    const roleInfo = roleMap[role] || { label: role, class: 'bg-secondary', icon: 'bi-person' };
    
    return (
      <span className={`badge ${roleInfo.class}`}>
        <i className={`${roleInfo.icon} me-1`}></i>
        {roleInfo.label}
      </span>
    );
  };

  if (loading) {
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
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-0">用户管理</h2>
          <p className="text-muted">管理系统用户账号</p>
        </div>
        <div className="col-auto">
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="bi bi-plus-circle me-1"></i>
            新建用户
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">
            <i className="bi bi-people me-2"></i>
            用户列表 ({users.length})
          </h5>
        </div>
        <div className="card-body">
          {users.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-people" style={{fontSize: '3rem'}}></i>
              <p className="mt-3 mb-0">暂无用户</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>用户名</th>
                    <th>姓名</th>
                    <th>角色</th>
                    <th>部门</th>
                    <th>邮箱</th>
                    <th>电话</th>
                    <th>状态</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="fw-bold">{user.username}</td>
                      <td>{user.full_name || '-'}</td>
                      <td>{getRoleBadge(user.role)}</td>
                      <td>{user.department || '-'}</td>
                      <td>{user.email || '-'}</td>
                      <td>{user.phone || '-'}</td>
                      <td>
                        {user.is_active ? 
                          <span className="badge bg-success">激活</span> : 
                          <span className="badge bg-secondary">禁用</span>
                        }
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-primary"
                            onClick={() => handleEditUser(user)}
                            title="编辑用户"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-outline-warning"
                            onClick={() => handleResetPassword(user.id)}
                            title="重置密码"
                          >
                            <i className="bi bi-key"></i>
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDeleteUser(user.id)}
                              title="删除用户"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 创建用户模态框 */}
      {showCreateModal && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">新建用户</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowCreateModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">用户名 *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">姓名</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newUser.full_name}
                        onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">密码 *</label>
                      <input
                        type="password"
                        className="form-control"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">确认密码 *</label>
                      <input
                        type="password"
                        className="form-control"
                        value={newUser.confirm_password}
                        onChange={(e) => setNewUser({...newUser, confirm_password: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">角色 *</label>
                      <select
                        className="form-select"
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      >
                        {roleOptions.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">部门</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newUser.department}
                        onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">邮箱</label>
                      <input
                        type="email"
                        className="form-control"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">电话</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowCreateModal(false)}
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    创建用户
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 编辑用户模态框 */}
      {showEditModal && editingUser && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">编辑用户</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <form onSubmit={handleUpdateUser}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">用户名</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingUser.username}
                        disabled
                      />
                      <small className="form-text text-muted">用户名不可修改</small>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">姓名</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingUser.full_name || ''}
                        onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">角色</label>
                      <select
                        className="form-select"
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                        disabled={editingUser.role === 'admin'}
                      >
                        {editingUser.role === 'admin' && (
                          <option value="admin">管理员</option>
                        )}
                        {roleOptions.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      {editingUser.role === 'admin' && (
                        <small className="form-text text-muted">管理员角色不可修改</small>
                      )}
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">部门</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editingUser.department || ''}
                        onChange={(e) => setEditingUser({...editingUser, department: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">邮箱</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editingUser.email || ''}
                        onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">电话</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={editingUser.phone || ''}
                        onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={editingUser.is_active}
                          onChange={(e) => setEditingUser({...editingUser, is_active: e.target.checked})}
                          disabled={editingUser.role === 'admin'}
                        />
                        <label className="form-check-label">
                          用户激活状态
                        </label>
                        {editingUser.role === 'admin' && (
                          <small className="form-text text-muted d-block">管理员账户不可禁用</small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowEditModal(false)}
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    保存更改
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 模态框背景 */}
      {(showCreateModal || showEditModal) && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
};

export default UserManagement;