import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useHistory } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';
import ExcelViewer from '../common/ExcelViewer';

const OrderDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const history = useHistory();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showExcelViewer, setShowExcelViewer] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: '',
    review_notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/api/orders/${id}/`);
      setOrder(res.data);
      setLoading(false);
    } catch (err) {
      setError('获取订单详情失败');
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return '待审核';
      case 'approved': return '已批准';
      case 'rejected': return '已拒绝';
      case 'ready_for_production': return '待生产';
      case 'in_production': return '生产中';
      case 'in_warehouse': return '已入库';
      case 'out_warehouse': return '已出库';
      case 'completed': return '已完成';
      default: return '未知';
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
        return <span className="badge bg-secondary">待生产</span>;
      case 'in_production':
        return <span className="badge bg-primary">生产中</span>;
      case 'completed':
        return <span className="badge bg-info">已完成</span>;
      case 'in_warehouse':
        return <span className="badge bg-secondary">已入库</span>;
      case 'out_warehouse':
        return <span className="badge bg-secondary">已出库</span>;
      default:
        return <span className="badge bg-secondary">未知</span>;
    }
  };

  const canReview = () => {
    return order && 
           order.status === 'pending' && 
           (user.role === 'admin' || user.role === 'reviewer');
  };

  const handleReview = async () => {
    if (isSubmitting || !reviewData.status) return;

    try {
      setIsSubmitting(true);
      setError('');

      await api.put(`/api/orders/${order.id}/review/`, {
        status: reviewData.status,
        review_notes: reviewData.review_notes
      });

      showNotification(
        reviewData.status === 'approved' ? '订单已批准' : '订单已拒绝',
        'success'
      );

      setShowReviewModal(false);
      setReviewData({ status: '', review_notes: '' });

      await fetchOrder();

    } catch (err) {
      console.error('审核失败:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.review_notes?.[0] || 
                          err.response?.data?.message || 
                          '审核操作失败';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSuccessToast = (message) => {
    const toastContainer = document.getElementById('toast-container') || 
      (() => {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
        return container;
      })();
    
    const toastElement = document.createElement('div');
    toastElement.className = 'toast align-items-center text-white bg-success border-0';
    toastElement.setAttribute('role', 'alert');
    toastElement.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi bi-check-circle me-2"></i>
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    
    toastContainer.appendChild(toastElement);
    
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
    toast.show();
    
    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
    }, 3000);
  };

  const handleDelete = async () => {
    if (!confirm) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/api/orders/${order.id}/delete/`);
      
      showSuccessToast('订单已成功删除');
      
      setTimeout(() => {
        history.push('/orders');
      }, 1500);
      
    } catch (err) {
      console.error('删除订单失败:', err);
      toast.error(err.response?.data?.error || '删除订单失败，请稍后重试');
      setIsDeleting(false);
      setShowDeleteModal(false);
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

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
        <Link to="/orders" className="btn btn-secondary">
          <i className="bi bi-arrow-left me-1"></i>返回订单列表
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning">
          <i className="bi bi-info-circle me-2"></i>
          订单不存在或已被删除
        </div>
        <Link to="/orders" className="btn btn-secondary">
          <i className="bi bi-arrow-left me-1"></i>返回订单列表
        </Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* 页面标题 */}
      <div className="row mb-4">
        <div className="col">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link to="/orders">订单管理</Link>
              </li>
              <li className="breadcrumb-item active">订单详情</li>
            </ol>
          </nav>
          <h2 className="mb-0">订单详情</h2>
          <p className="text-muted">查看订单的详细信息和处理状态</p>
        </div>
      </div>

      {/* 订单状态概览 */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">
              <i className="bi bi-file-text me-2"></i>
              订单概览
            </h5>
            {getStatusBadge(order.status)}
          </div>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <strong>订单号:</strong>
              <div className="text-primary fw-bold fs-5">{order.order_number}</div>
            </div>
            <div className="col-md-3">
              <strong>当前状态:</strong>
              <div className="fs-6">{getStatusText(order.status)}</div>
            </div>
            <div className="col-md-3">
              <strong>提交时间:</strong>
              <div className="text-muted">
                {new Date(order.created_at).toLocaleString('zh-CN')}
              </div>
            </div>
            <div className="col-md-3">
              <strong>订单创建者:</strong>
              <div>{order.user?.username || '未知用户'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="card-title mb-0">
            <i className="bi bi-info-circle me-2"></i>
            基本信息
          </h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <td width="120"><strong>项目名称:</strong></td>
                    <td>{order.project_name || '未填写'}</td>
                  </tr>
                  <tr>
                    <td><strong>下单人:</strong></td>
                    <td>{order.ordered_by || '未填写'}</td>
                  </tr>
                  <tr>
                    <td><strong>创建时间:</strong></td>
                    <td>{new Date(order.created_at).toLocaleString('zh-CN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-md-6">
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <td width="120"><strong>订单状态:</strong></td>
                    <td>{getStatusBadge(order.status)}</td>
                  </tr>
                  <tr>
                    <td><strong>最后更新:</strong></td>
                    <td>{new Date(order.updated_at || order.created_at).toLocaleString('zh-CN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 下料单文件和内容 */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">
              <i className="bi bi-file-earmark-excel me-2"></i>
              下料单详情
            </h5>
            {order.order_file && (
              <div className="btn-group btn-group-sm">
                <button
                  className={`btn ${showExcelViewer ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setShowExcelViewer(!showExcelViewer)}
                >
                  <i className={`bi ${showExcelViewer ? 'bi-eye-slash' : 'bi-eye'} me-1`}></i>
                  {showExcelViewer ? '隐藏表格' : '查看表格'}
                </button>
                <a 
                  href={order.order_file} 
                  className="btn btn-outline-success"
                  download
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="bi bi-download me-1"></i>
                  下载文件
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="card-body">
          {order.order_file ? (
            <>
              <div className="d-flex align-items-center mb-3">
                <div className="me-3">
                  <i className="bi bi-file-earmark-excel text-success" style={{fontSize: '2.5rem'}}></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-1">下料单文件</h6>
                  <p className="text-muted mb-0">
                    文件名: {order.order_file.split('/').pop()}
                  </p>
                  <small className="text-muted">
                    上传时间: {new Date(order.created_at).toLocaleString('zh-CN')}
                  </small>
                </div>
              </div>
              
              {/* Excel内容查看器 */}
              {showExcelViewer && (
                <div className="border-top pt-3">
                  <ExcelViewer 
                    fileUrl={order.order_file}
                    fileName={`${order.order_number}_下料单.xlsx`}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted py-5">
              <i className="bi bi-file-x" style={{fontSize: '4rem'}}></i>
              <p className="mt-3 mb-0">暂无下料单文件</p>
              <small>订单创建时未上传文件</small>
            </div>
          )}
        </div>
      </div>

      {/* 生产面单信息 */}
      {order.production_sheet && (
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="card-title mb-0">
              <i className="bi bi-file-earmark-text me-2"></i>
              生产面单
            </h5>
          </div>
          <div className="card-body">
            <div className="d-flex align-items-center mb-3">
              <div className="me-3">
                <i className="bi bi-file-earmark-text text-info" style={{fontSize: '2.5rem'}}></i>
              </div>
              <div className="flex-grow-1">
                <h6 className="mb-1">生产面单文件</h6>
                <p className="text-muted mb-0">
                  文件名: {order.production_sheet.split('/').pop()}
                </p>
                <small className="text-muted">
                  上传人: {order.production_started_by?.username || '未知'}
                </small>
              </div>
              <div>
                <a 
                  href={order.production_sheet} 
                  className="btn btn-outline-info btn-sm"
                  download
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="bi bi-download me-1"></i>
                  下载生产面单
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 审核信息 */}
      {order.status !== 'pending' && (
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="card-title mb-0">
              <i className="bi bi-clipboard-check me-2"></i>
              审核信息
            </h5>
          </div>
          <div className="card-body">
            {order.review_date || order.review_notes ? (
              <div className="row">
                <div className="col-md-6">
                  <table className="table table-borderless">
                    <tbody>
                      {order.review_date && (
                        <tr>
                          <td width="120"><strong>审核时间:</strong></td>
                          <td>{new Date(order.review_date).toLocaleString('zh-CN')}</td>
                        </tr>
                      )}
                      {order.reviewed_by && (
                        <tr>
                          <td><strong>审核人员:</strong></td>
                          <td>{order.reviewed_by.username || '系统审核'}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  {order.review_notes && (
                    <div>
                      <strong>审核意见:</strong>
                      <div className="mt-2 p-3 bg-light rounded">
                        {order.review_notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted py-3">
                <i className="bi bi-info-circle me-2"></i>
                暂无审核信息
              </div>
            )}
          </div>
        </div>
      )}

      {/* 审核操作卡片 */}
      {canReview() && (
        <div className="card mb-4 border-warning">
          <div className="card-header bg-warning bg-opacity-10">
            <h5 className="card-title mb-0 text-warning">
              <i className="bi bi-clipboard-check me-2"></i>
              待审核操作
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-8">
                <p className="mb-3">
                  <i className="bi bi-info-circle me-2 text-info"></i>
                  此订单正在等待审核，请仔细查看订单信息和下料单内容后进行审核。
                </p>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      setReviewData({ status: 'approved', review_notes: '' });
                      setShowReviewModal(true);
                    }}
                  >
                    <i className="bi bi-check-circle me-1"></i>
                    批准订单
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      setReviewData({ status: 'rejected', review_notes: '' });
                      setShowReviewModal(true);
                    }}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    拒绝订单
                  </button>
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-end">
                  <small className="text-muted d-block">审核人员</small>
                  <strong>{user.full_name || user.username}</strong>
                  <br />
                  <small className="text-muted">
                    {user.role === 'admin' ? '管理员' : '审核员'}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 可用操作 */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="card-title mb-0">
            <i className="bi bi-gear me-2"></i>
            可用操作
          </h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <h6 className="text-muted mb-3">通用操作</h6>
              <div className="d-grid gap-2">
                <Link to="/orders" className="btn btn-outline-secondary">
                  <i className="bi bi-arrow-left me-1"></i>
                  返回订单列表
                </Link>
                
                <button 
                  className="btn btn-outline-info"
                  onClick={() => window.location.reload()}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  刷新页面
                </button>
              </div>
            </div>

            <div className="col-md-6">
              <h6 className="text-muted mb-3">状态相关操作</h6>
              <div className="d-grid gap-2">
                {order.status === 'pending' && (
                  <div className="alert alert-info mb-2">
                    <i className="bi bi-clock me-1"></i>
                    订单正在等待审核，请耐心等待
                  </div>
                )}

                {order.status === 'approved' && (
                  <div className="alert alert-success mb-2">
                    <i className="bi bi-check-circle me-1"></i>
                    订单已通过审核，可以进行生产
                  </div>
                )}

                {order.status === 'ready_for_production' && (
                  <div className="alert alert-secondary mb-2">
                    <i className="bi bi-hourglass-split me-1"></i>
                    订单已准备好进行生产，请技术员开始处理
                  </div>
                )}

                {order.status === 'in_production' && (
                  <div className="alert alert-primary mb-2">
                    <i className="bi bi-gear-fill me-1"></i>
                    订单正在生产中，请等待完成
                  </div>
                )}

                {order.status === 'rejected' && (
                  <>
                    <div className="alert alert-warning mb-2">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      订单已被拒绝，您可以修改后重新提交
                    </div>
                    <Link 
                      to={`/orders/${order.id}/edit`} 
                      className="btn btn-warning"
                    >
                      <i className="bi bi-pencil-square me-1"></i>
                      修改并重新提交
                    </Link>
                  </>
                )}

                {order.status === 'completed' && (
                  <div className="alert alert-info mb-2">
                    <i className="bi bi-check-all me-1"></i>
                    订单已完成，所有流程已结束
                  </div>
                )}
              </div>
            </div>
          </div>

          {user.role === 'admin' && (
            <div className="d-grid mt-3">
              <button 
                className="btn btn-outline-danger"
                onClick={() => setShowDeleteModal(true)}
              >
                <i className="bi bi-trash me-1"></i>
                删除订单
              </button>
            </div>
          )}

          <div className="mt-4 pt-3 border-top">
            <div className="row">
              <div className="col-md-12">
                <h6 className="text-muted mb-2">操作说明</h6>
                <ul className="list-unstyled text-muted small">
                  <li><i className="bi bi-info-circle me-1"></i>订单提交后将进入待审核状态</li>
                  <li><i className="bi bi-info-circle me-1"></i>管理员审核通过后，订单状态将变为已批准</li>
                  <li><i className="bi bi-info-circle me-1"></i>技术员可以将已批准的订单转为生产中状态</li>
                  <li><i className="bi bi-info-circle me-1"></i>如果订单被拒绝，您可以修改信息后重新提交</li>
                  <li><i className="bi bi-info-circle me-1"></i>点击"查看表格"可以直接查看下料单内容</li>
                  <li><i className="bi bi-info-circle me-1"></i>所有操作记录都会保存在系统中</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 审核模态框 */}
      {showReviewModal && (
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
                        <div>{order.order_number}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">项目名称：</small>
                        <div>{order.project_name || '-'}</div>
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
                    rows="4"
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

                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>提醒：</strong>审核操作将立即生效且不可撤销，请确认无误后提交。
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

      {/* 删除模态框 */}
      {showDeleteModal && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  删除订单
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <strong>警告：</strong> 删除操作无法撤销。删除后，与此订单相关的所有数据将永久丢失。
                </div>
                
                <p>您确定要删除以下订单吗？</p>
                
                <div className="card mb-3">
                  <div className="card-body">
                    <div className="row">
                      <div className="col-6">
                        <small className="text-muted">订单号：</small>
                        <div className="fw-bold">{order.order_number}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">项目名称：</small>
                        <div className="fw-bold">{order.project_name || '-'}</div>
                      </div>
                      <div className="col-6 mt-2">
                        <small className="text-muted">创建时间：</small>
                        <div>{new Date(order.created_at).toLocaleString('zh-CN')}</div>
                      </div>
                      <div className="col-6 mt-2">
                        <small className="text-muted">当前状态：</small>
                        <div>{getStatusBadge(order.status)}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-danger fw-bold">请输入订单号确认删除：</p>
                <input 
                  type="text"
                  className="form-control"
                  placeholder={`请输入 ${order.order_number} 确认删除`}
                  onChange={(e) => setConfirm(e.target.value === order.order_number)}
                />
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                >
                  取消
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={!confirm || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      删除中...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash me-1"></i>
                      确认删除
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 模态框背景 */}
      {(showReviewModal || showDeleteModal) && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
};

export default OrderDetail;