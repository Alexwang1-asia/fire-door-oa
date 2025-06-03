import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';
import * as XLSX from 'xlsx';

const OrderList = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 搜索相关状态
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // 批量操作
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  
  useEffect(() => {
    fetchOrdersFromAPI();
  }, []);
  
  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, searchType, statusFilter, dateRange]);

  const fetchOrdersFromAPI = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 所有用户都使用同一个API端点查看所有订单
      const res = await api.get('/api/orders/my/');
      
      console.log('API Response:', res.data);
      
      // 安全处理返回的数据
      let orderData = [];
      if (res.data) {
        if (Array.isArray(res.data)) {
          orderData = res.data;
        } else if (res.data.results && Array.isArray(res.data.results)) {
          orderData = res.data.results;
        } else if (typeof res.data === 'object' && res.data.count !== undefined) {
          orderData = res.data.results || [];
        }
      }
      
      console.log('Processed order data:', orderData);
      setOrders(orderData);
      
    } catch (err) {
      console.error('获取订单失败:', err);
      
      if (err.response) {
        if (err.response.status === 403) {
          setError('您没有权限查看订单列表');
        } else if (err.response.status === 401) {
          setError('请重新登录后再试');
        } else {
          setError(`获取订单失败: ${err.response.data?.detail || err.response.statusText}`);
        }
      } else if (err.request) {
        setError('网络连接失败，请检查网络连接');
      } else {
        setError('获取订单失败，请稍后重试');
      }
      
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // 搜索和过滤功能
  const filterOrders = () => {
    if (!Array.isArray(orders)) {
      console.warn('Orders is not an array:', orders);
      setFilteredOrders([]);
      return;
    }
    
    let filtered = [...orders];
    
    // 按状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // 按日期范围过滤
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        const startDate = dateRange.start ? new Date(dateRange.start) : null;
        const endDate = dateRange.end ? new Date(dateRange.end) : null;
        
        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
        return true;
      });
    }
    
    // 按搜索条件过滤
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      
      switch (searchType) {
        case 'order_number':
          filtered = filtered.filter(order => 
            order.order_number?.toLowerCase().includes(searchLower)
          );
          break;
        case 'project_name':
          filtered = filtered.filter(order => 
            order.project_name?.toLowerCase().includes(searchLower)
          );
          break;
        case 'ordered_by':
          filtered = filtered.filter(order => 
            order.ordered_by?.toLowerCase().includes(searchLower)
          );
          break;
        default:
          filtered = filtered.filter(order => 
            order.order_number?.toLowerCase().includes(searchLower) ||
            order.project_name?.toLowerCase().includes(searchLower) ||
            order.ordered_by?.toLowerCase().includes(searchLower)
          );
          break;
      }
    }
    
    console.log('Filtered orders:', filtered);
    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  // 批量选择
  const handleSelectAll = () => {
    const currentPageOrders = getCurrentPageOrders();
    if (selectAll) {
      setSelectedOrders([]);
    } else {
      const currentPageOrderIds = currentPageOrders.map(order => order.id);
      setSelectedOrders(currentPageOrderIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectOrder = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  // 分页逻辑
  const getCurrentPageOrders = () => {
    if (!Array.isArray(filteredOrders)) {
      console.warn('FilteredOrders is not an array:', filteredOrders);
      return [];
    }
    
    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
    
    console.log('Current page orders:', currentOrders);
    return currentOrders;
  };

  const totalPages = Array.isArray(filteredOrders) ? Math.ceil(filteredOrders.length / ordersPerPage) : 0;

  // 导出功能
  const exportToExcel = () => {
    if (!Array.isArray(filteredOrders) || filteredOrders.length === 0) {
      alert('没有数据可以导出');
      return;
    }
    
    const exportData = filteredOrders.map(order => ({
      '订单号': order.order_number || '',
      '项目名称': order.project_name || '',
      '下单人': order.ordered_by || '',
      '创建用户': order.user?.username || '',
      '状态': getStatusText(order.status),
      '提交日期': order.created_at ? new Date(order.created_at).toLocaleDateString() : '',
      '审核日期': order.review_date ? new Date(order.review_date).toLocaleDateString() : '',
      '审核意见': order.review_notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "订单列表");
    XLSX.writeFile(wb, `订单列表_${new Date().toLocaleDateString()}.xlsx`);
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return '待审核';
      case 'approved': return '已批准';
      case 'rejected': return '已拒绝';
      case 'ready_for_production': return '待生产';  // 新增
      case 'in_production': return '生产中';  // 新增
      case 'completed': return '已完成';
      case 'in_warehouse': return '已入库';  // 新增
      case 'out_warehouse': return '已出库';  // 新增
      default: return '未知状态';
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return <span className="badge bg-warning text-dark">待审核</span>;
      case 'approved':
        return <span className="badge bg-success">已批准</span>;
      case 'rejected':
        return <span className="badge bg-danger">已拒绝</span>;
      case 'ready_for_production':
        return <span className="badge bg-info">待生产</span>;  // 新增
      case 'in_production':
        return <span className="badge bg-info">生产中</span>;  // 新增
      case 'completed':
        return <span className="badge bg-primary">已完成</span>;
      case 'in_warehouse':
        return <span className="badge bg-secondary">已入库</span>;  // 新增
      case 'out_warehouse':
        return <span className="badge bg-secondary">已出库</span>;  // 新增
      default:
        return <span className="badge bg-secondary">未知</span>;
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchType('all');
    setStatusFilter('all');
    setDateRange({ start: '', end: '' });
    setSelectedOrders([]);
    setSelectAll(false);
  };

  // 分页组件
  const getPaginationRange = () => {
    const range = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
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
      {/* 页面标题 */}
      <div className="row mb-4">
        <div className="col">
          <h2 className="mb-0">
            <i className="bi bi-list-ul me-2"></i>
            订单列表
          </h2>
          <p className="text-muted">
            查看系统中的所有订单记录
          </p>
        </div>
        <div className="col-auto">
          <button 
            className="btn btn-outline-primary"
            onClick={fetchOrdersFromAPI}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            刷新
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {/* 搜索和过滤 */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">
            <i className="bi bi-funnel me-2"></i>
            搜索和过滤
          </h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <div className="input-group mb-3">
                <select 
                  className="form-select"
                  style={{maxWidth: '150px'}}
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                >
                  <option value="all">全部字段</option>
                  <option value="order_number">订单号</option>
                  <option value="project_name">项目名称</option>
                  <option value="ordered_by">下单人</option>
                </select>
                <input
                  type="text"
                  className="form-control"
                  placeholder="输入搜索关键字..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-3">
              <select 
                className="form-select mb-3"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">全部状态</option>
                <option value="pending">待审核</option>
                <option value="approved">已批准</option>
                <option value="rejected">已拒绝</option>
                <option value="ready_for_production">待生产</option>
                <option value="in_production">生产中</option>
                <option value="in_warehouse">已入库</option>
                <option value="out_warehouse">已出库</option>
                <option value="completed">已完成</option>
              </select>
            </div>
            <div className="col-md-3">
              <button 
                className="btn btn-outline-secondary w-100 mb-3"
                onClick={clearSearch}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                清除筛选
              </button>
            </div>
          </div>
          
          <div className="row">
            <div className="col-md-3">
              <label className="form-label">开始日期</label>
              <input
                type="date"
                className="form-control"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">结束日期</label>
              <input
                type="date"
                className="form-control"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
            <div className="col-md-6 d-flex align-items-end">
              <button 
                className="btn btn-success me-2"
                onClick={exportToExcel}
                disabled={!Array.isArray(filteredOrders) || filteredOrders.length === 0}
              >
                <i className="bi bi-file-earmark-excel me-1"></i>
                导出Excel
              </button>
              {selectedOrders.length > 0 && (
                <span className="text-muted">
                  已选择 {selectedOrders.length} 个订单
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 订单列表 */}
      <div className="card">
        <div className="card-header bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">
              <i className="bi bi-table me-2"></i>
              订单列表
            </h5>
            {Array.isArray(filteredOrders) && (
              <span className="badge bg-primary fs-6">
                {filteredOrders.length} 个订单
              </span>
            )}
          </div>
        </div>

        {!Array.isArray(filteredOrders) || filteredOrders.length === 0 ? (
          <div className="card-body text-center py-5">
            <i className="bi bi-inbox" style={{fontSize: '4rem', color: '#dee2e6'}}></i>
            <h5 className="mt-3 text-muted">暂无订单</h5>
            <p className="text-muted">
              {error ? '加载订单时出现错误' : '还没有创建任何订单'}
            </p>
            {!error && user?.role === 'order_clerk' && (
              <Link to="/orders/new" className="btn btn-primary">
                <i className="bi bi-plus-circle me-1"></i>
                创建新订单
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-dark">
                  <tr>
                    <th width="50">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th width="60">#</th>
                    <th width="140">订单号</th>
                    <th>项目名称</th>
                    <th width="120">下单人</th>
                    <th width="120">创建用户</th>
                    <th width="100">状态</th>
                    <th width="120">创建时间</th>
                    <th width="200">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentPageOrders().map((order, index) => (
                    <tr key={order.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                        />
                      </td>
                      <td className="text-muted fw-bold">
                        {(currentPage - 1) * ordersPerPage + index + 1}
                      </td>
                      <td>
                        <span className="fw-bold text-primary">
                          {order.order_number || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span title={order.project_name || ''}>
                          {order.project_name || '-'}
                        </span>
                      </td>
                      <td>
                        <span title={order.ordered_by || ''}>
                          {order.ordered_by || '-'}
                        </span>
                      </td>
                      <td>
                        <small className="text-muted">
                          {order.user?.username || '未知用户'}
                        </small>
                      </td>
                      <td>{getStatusBadge(order.status)}</td>
                      <td>
                        <small className="text-muted">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString('zh-CN') : '-'}
                        </small>
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <Link 
                            to={`/orders/${order.id}`}
                            className="btn btn-outline-info btn-sm"
                          >
                            <i className="bi bi-eye me-1"></i>
                            查看
                          </Link>
                          {order.status === 'rejected' && order.user?.id === user?.id && (
                            <Link 
                              to={`/orders/${order.id}/edit`}
                              className="btn btn-outline-warning btn-sm"
                            >
                              <i className="bi bi-pencil me-1"></i>
                              重新提交
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="card-footer">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    显示第 {(currentPage - 1) * ordersPerPage + 1} - {Math.min(currentPage * ordersPerPage, filteredOrders.length)} 条，共 {filteredOrders.length} 条
                  </small>
                  <nav>
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                        >
                          首页
                        </button>
                      </li>
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          上一页
                        </button>
                      </li>
                      
                      {getPaginationRange().map(page => (
                        <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                          <button 
                            className="page-link"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </li>
                      ))}
                      
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          下一页
                        </button>
                      </li>
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button 
                          className="page-link"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          末页
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OrderList;