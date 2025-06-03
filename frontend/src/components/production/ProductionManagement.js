import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const ProductionManagement = () => {
  const { user } = useContext(AuthContext);
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [ReadyProductionOrders, setReadyProductionOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('approved');
  const [uploadingOrder, setUploadingOrder] = useState(null);
  const [productionSheet, setProductionSheet] = useState(null);
  const [productionNotes, setProductionNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // 获取已批准的订单
      const approvedRes = await api.get('/api/orders/approved/');
      setApprovedOrders(approvedRes.data.results || approvedRes.data);

      // 获取生产中的订单
      const allOrdersRes = await api.get('/api/orders/paginated/');
      const ReadyProduction= (allOrdersRes.data.results || allOrdersRes.data)
        .filter(order => order.status === 'ready_for_production');
      setReadyProductionOrders(ReadyProduction);

      setLoading(false);
    } catch (err) {
      setError('获取订单列表失败');
      setLoading(false);
    }
  };

  const handleStartProduction = (order) => {
    setUploadingOrder(order);
    setProductionSheet(null);
    setProductionNotes('');
  };

  const handleUploadProductionSheet = async () => {
    if (!productionSheet) {
      alert('请选择生产面单文件');
      return;
    }

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('production_sheet', productionSheet);
      formData.append('production_notes', productionNotes);

      await api.put(`/api/orders/${uploadingOrder.id}/upload-production-sheet/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('生产面单上传成功，订单已转为生产中状态');
      setUploadingOrder(null);
      setProductionSheet(null);
      setProductionNotes('');
      
      await fetchOrders();
    } catch (err) {
      console.error('上传失败:', err);
      alert(err.response?.data?.error || '上传生产面单失败');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
        case 'approved':
            return <span className="badge bg-success">已批准</span>;
        case 'ready_for_production':
            return <span className="badge bg-secondary">待生产</span>;
        case 'completed':
            return <span className="badge bg-info">已完成</span>;
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
          <h2 className="mb-0">生产管理</h2>
          <p className="text-muted">管理已批准订单的生产流程</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* 标签页导航 */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            <i className="bi bi-check-circle me-1"></i>
            已批准订单 ({approvedOrders.length})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'ready_for_production' ? 'active' : ''}`}
            onClick={() => setActiveTab('ready_for_production')}
          >
            <i className="bi bi-gear-fill me-1"></i>
            待生产订单 ({ReadyProductionOrders.length})
          </button>
        </li>
      </ul>

      {/* 已批准订单 - 可开始生产 */}
      {activeTab === 'approved' && (
        <div className="tab-content">
          <div className="tab-pane fade show active">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <i className="bi bi-check-circle me-2"></i>
                已批准订单 - 可开始生产
              </h5>
              <button className="btn btn-outline-primary" onClick={fetchOrders}>
                <i className="bi bi-arrow-clockwise me-1"></i>
                刷新
              </button>
            </div>
            
            {approvedOrders.length === 0 ? (
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                暂无已批准的订单
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>订单号</th>
                      <th>项目名称</th>
                      <th>下单人</th>
                      <th>状态</th>
                      <th>审核时间</th>
                      <th>审核人员</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedOrders.map(order => (
                      <tr key={order.id}>
                        <td>
                          <strong className="text-success">{order.order_number}</strong>
                        </td>
                        <td>{order.project_name}</td>
                        <td>{order.ordered_by}</td>
                        <td>{getStatusBadge(order.status)}</td>
                        <td>{new Date(order.review_date).toLocaleDateString('zh-CN')}</td>
                        <td>{order.reviewed_by?.username || '-'}</td>
                        <td>
                          <div className="btn-group btn-group-sm" role="group">
                            {/* 查看详情按钮 */}
                            <Link 
                              to={`/orders/${order.id}`}
                              className="btn btn-outline-secondary btn-sm"
                            >
                              <i className="bi bi-eye me-1"></i>
                              查看详情
                            </Link>
                            {/* 下载下料单按钮 */}
                            {order.order_file && (
                              <a
                                href={order.order_file }
                                className="btn btn-outline-info"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="下载下料单"
                                onClick={(e) => {
                                    console.log("下载下料单:", order.id);
                                }}
                              >
                                <i className="bi bi-download me-1"></i>
                                下载下料单
                              </a>
                            )}
                            
                            {/* 开始生产按钮 */}
                            <button
                              className="btn btn-primary"
                              onClick={() => handleStartProduction(order)}
                              title="准备生产"
                            >
                              <i className="bi bi-play-circle me-1"></i>
                              准备生产
                            </button>
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
      )}

      {/* 待生产订单 - 可上传生产面单 */}
      {activeTab === 'ready_for_production' && (
        <div className="tab-content">
          <div className="tab-pane fade show active">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <i className="bi bi-gear me-2"></i>
                待生产订单 - 可上传生产面单
              </h5>
              <button className="btn btn-outline-primary" onClick={fetchOrders}>
                <i className="bi bi-arrow-clockwise me-1"></i>
                刷新
              </button>
            </div>
            
            {ReadyProductionOrders.length === 0 ? (
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                暂无待生产的订单
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>订单号</th>
                      <th>项目名称</th>
                      <th>下单人</th>
                      <th>状态</th>
                      <th>待生产开始时间</th>
                      <th>待生产开始人</th>
                      <th>生产面单</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ReadyProductionOrders.map(order => (
                      <tr key={order.id}>
                        <td>
                          <strong className="text-primary">{order.order_number}</strong>
                        </td>
                        <td>{order.project_name}</td>
                        <td>{order.ordered_by}</td>
                        <td>{getStatusBadge(order.status)}</td>
                        <td>{new Date(order.production_started_at).toLocaleDateString('zh-CN')}</td>
                        <td>{order.production_started_by?.username || '-'}</td>
                        <td>
                          {order.production_sheet ? (
                            <span className="badge bg-success">
                              <i className="bi bi-check-circle me-1"></i>
                              已上传
                            </span>
                          ) : (
                            <span className="badge bg-warning">
                              <i className="bi bi-clock me-1"></i>
                              未上传
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm" role="group">
                            {/* 查看详情按钮 */}
                            <Link 
                              to={`/orders/${order.id}`}
                              className="btn btn-outline-secondary btn-sm"
                            >
                              <i className="bi bi-eye me-1"></i>
                              查看详情
                            </Link>
                            {/* 下载下料单按钮 */}
                            {order.order_file && (
                              <a
                                href={order.order_file }
                                className="btn btn-outline-info"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="下载下料单"
                                onClick={(e) => {
                                    console.log("下载出库单:", order.id);
                                    // 不阻止默认行为，让链接正常工作
                                }}
                              >
                                <i className="bi bi-download me-1"></i>
                                下料单
                              </a>
                            )}
                            
                            {/* 下载生产面单按钮（如果已上传） */}
                            {order.production_sheet && (
                              <a
                                href={order.production_sheet}
                                className="btn btn-outline-success"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="下载生产面单"
                              >
                                <i className="bi bi-download me-1"></i>
                                生产面单
                              </a>
                            )}
                            
                            {/* 上传生产面单按钮 */}
                            <button
                              className="btn btn-warning"
                              onClick={() => handleStartProduction(order)}
                              title="上传生产面单"
                            >
                              <i className="bi bi-upload me-1"></i>
                              {order.production_sheet ? '重新上传' : '上传面单'}
                            </button>
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
      )}

      {/* 上传生产面单模态框 */}
      {uploadingOrder && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-upload me-2"></i>
                  上传生产面单
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setUploadingOrder(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>订单信息：</strong>
                  <div className="mt-2 p-3 bg-light rounded">
                    <div className="row">
                      <div className="col-6">
                        <small className="text-muted">订单号：</small>
                        <div>{uploadingOrder.order_number}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">项目名称：</small>
                        <div>{uploadingOrder.project_name}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">生产面单文件 *</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setProductionSheet(e.target.files[0])}
                    required
                  />
                  <small className="form-text text-muted">
                    支持PDF、Word、Excel格式文件
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label">生产备注</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={productionNotes}
                    onChange={(e) => setProductionNotes(e.target.value)}
                    placeholder="可选：添加生产相关备注..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setUploadingOrder(null)}
                  disabled={isUploading}
                >
                  取消
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleUploadProductionSheet}
                  disabled={isUploading || !productionSheet}
                >
                  {isUploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      上传中...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-upload me-1"></i>
                      确认上传
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 模态框背景 */}
      {uploadingOrder && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
};

export default ProductionManagement;