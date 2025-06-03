import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const OrderReview = () => {
  const { user } = useContext(AuthContext);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: '',
    review_notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('正在获取待审核订单...');
      
      const response = await api.get('/api/orders/pending/');
      
      console.log('待审核订单响应:', response.data);
      
      // 处理不同的响应格式
      let orders = [];
      if (response.data.results) {
        orders = response.data.results;
      } else if (Array.isArray(response.data)) {
        orders = response.data;
      } else {
        orders = [];
      }
      
      setPendingOrders(orders);
      setLoading(false);
      
    } catch (err) {
      console.error('获取待审核订单失败:', err);
      
      let errorMessage = '获取待审核订单失败';
      
      if (err.response?.status === 403) {
        errorMessage = '您没有权限查看待审核订单';
      } else if (err.response?.status === 401) {
        errorMessage = '请先登录';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleQuickReview = (order, newStatus) => {
    setSelectedOrder(order);
    setReviewData({ 
      status: newStatus, 
      review_notes: newStatus === 'rejected' ? '' : '订单信息已核实，批准通过'
    });
    setShowReviewModal(true);
  };

  const handleReview = async () => {
    if (isSubmitting || !reviewData.status || !selectedOrder) return;

    // 验证拒绝订单必须有审核意见
    if (reviewData.status === 'rejected' && !reviewData.review_notes.trim()) {
      alert('拒绝订单时必须填写审核意见');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      console.log('提交审核数据:', {
        orderId: selectedOrder.id,
        reviewData: reviewData
      });

      await api.put(`/api/orders/${selectedOrder.id}/review/`, {
        status: reviewData.status,
        review_notes: reviewData.review_notes
      });

      showNotification(
        reviewData.status === 'approved' ? '订单已批准' : '订单已拒绝',
        'success'
      );

      setShowReviewModal(false);
      setSelectedOrder(null);
      setReviewData({ status: '', review_notes: '' });

      await fetchPendingOrders();

    } catch (err) {
      console.error('审核失败:', err);
      
      let errorMessage = '审核操作失败';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.details) {
        const details = err.response.data.details;
        errorMessage = Object.values(details).flat().join(', ');
      }
      
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
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

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return <span className="badge bg-warning text-dark">待审核</span>;
      case 'approved':
        return <span className="badge bg-success">已批准</span>;
      case 'rejected':
        return <span className="badge bg-danger">已拒绝</span>;
      default:
        return <span className="badge bg-secondary">未知</span>;
    }
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
          <h2 className="mb-0">订单审核</h2>
          <p className="text-muted">审核待处理的订单申请</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button 
            className="btn btn-sm btn-outline-danger ms-3"
            onClick={fetchPendingOrders}
          >
            重试
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">
              <i className="bi bi-clock me-2"></i>
              待审核订单 ({pendingOrders.length})
            </h5>
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={fetchPendingOrders}
              disabled={loading}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              刷新
            </button>
          </div>
        </div>
        <div className="card-body">
          {pendingOrders.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="bi bi-inbox" style={{fontSize: '3rem'}}></i>
              <p className="mt-3 mb-0">暂无待审核的订单</p>
              <small>所有订单都已处理完毕</small>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>项目名称</th>
                    <th>下单人</th>
                    <th>创建者</th>
                    <th>创建时间</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.map(order => (
                    <tr key={order.id}>
                      <td className="fw-bold text-primary">{order.order_number}</td>
                      <td>{order.project_name}</td>
                      <td>{order.ordered_by}</td>
                      <td>{order.user?.username || '未知'}</td>
                      <td>{new Date(order.created_at).toLocaleDateString('zh-CN')}</td>
                      <td>{getStatusBadge(order.status)}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-success"
                            onClick={() => handleQuickReview(order, 'approved')}
                          >
                            <i className="bi bi-check-circle me-1"></i>
                            批准
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleQuickReview(order, 'rejected')}
                          >
                            <i className="bi bi-x-circle me-1"></i>
                            拒绝
                          </button>
                          <a 
                            href={`/orders/${order.id}`} 
                            className="btn btn-outline-info"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <i className="bi bi-eye me-1"></i>
                            详情
                          </a>
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

      {/* 审核模态框 */}
      {showReviewModal && selectedOrder && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${reviewData.status === 'approved' ? 'bi-check-circle text-success' : 'bi-x-circle text-danger'} me-2`}></i>
                  {reviewData.status === 'approved' ? '批准订单' : '拒绝订单'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowReviewModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>订单信息：</strong>
                  <div className="mt-2 p-3 bg-light rounded">
                    <div className="row">
                      <div className="col-6">
                        <small className="text-muted">订单号：</small>
                        <div>{selectedOrder.order_number}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">项目名称：</small>
                        <div>{selectedOrder.project_name}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    审核意见 {reviewData.status === 'rejected' && <span className="text-danger">*</span>}
                  </label>
                  <textarea
                    className="form-control"
                    rows="5"
                    value={reviewData.review_notes}
                    onChange={(e) => setReviewData({...reviewData, review_notes: e.target.value})}
                    placeholder={
                      reviewData.status === 'approved' 
                        ? '可选：添加批准说明...' 
                        : '请说明拒绝原因，以便订单创建者了解需要修改的内容...'
                    }
                    required={reviewData.status === 'rejected'}
                  />
                  {reviewData.status === 'rejected' && (
                    <small className="form-text text-muted">
                      拒绝订单时必须填写原因，帮助订单创建者了解问题所在
                    </small>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowReviewModal(false)}
                  disabled={isSubmitting}
                >
                  取消
                </button>
                <button 
                  type="button" 
                  className={`btn ${reviewData.status === 'approved' ? 'btn-success' : 'btn-danger'}`}
                  onClick={handleReview}
                  disabled={isSubmitting || (reviewData.status === 'rejected' && !reviewData.review_notes.trim())}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      处理中...
                    </>
                  ) : (
                    <>
                      <i className={`bi ${reviewData.status === 'approved' ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
                      确认{reviewData.status === 'approved' ? '批准' : '拒绝'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 模态框背景 */}
      {showReviewModal && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
};

export default OrderReview;