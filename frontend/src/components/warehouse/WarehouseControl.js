import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const WarehouseControl = () => {
  const { user } = useContext(AuthContext);
  const [warehouseOrders, setWarehouseOrders] = useState([]);
  const [ReadyProductionOrders, setReadyProductionOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('in_production');
  const [outboundingOrder, setOutboundingOrder] = useState(null);
  const [outboundFile, setOutboundFile] = useState(null);
  const [outboundNotes, setOutboundNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // 获取仓库相关的订单
      const response = await api.get('/api/orders/warehouse-orders/');
      setWarehouseOrders(response.data.results || response.data);
      

      setLoading(false);
    } catch (err) {
      setError('获取订单列表失败');
      setLoading(false);
    }
  };

  const handleReadyProduction = async (order) => {
    if (!window.confirm(`确定要将订单 ${order.order_number} 标记为生产中吗？`)) {
      return;
    }

    try {
      setIsProcessing(true);
      
      await api.post(`/api/orders/${order.id}/start-production/`);
      
      alert('标记生产中成功');
      await fetchOrders();
    } catch (err) {
      console.error('标记生产中失败:', err);
      alert(err.response?.data?.error || '标记生产中失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInbound = async (order) => {
    if (!window.confirm(`确定要将订单 ${order.order_number} 标记为已入库吗？`)) {
      return;
    }

    try {
      setIsProcessing(true);
      
      await api.post(`/api/orders/${order.id}/inbound/`);
      
      alert('入库成功');
      await fetchOrders();
    } catch (err) {
      console.error('入库失败:', err);
      alert(err.response?.data?.error || '入库失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadOutboundFile = async (orderId, order_number) => {
    try {
        console.log(`开始下载 order_id: ${orderId}, order_number: ${order_number}...`);
        
        const response = await api.get(`/api/orders/${orderId}/download/outbound_file/`, {
            responseType: 'blob',
        });
        
        // 直接使用服务器返回的响应类型
        const serverContentType = response.headers['content-type'];
        console.log('服务器返回的 Content-Type:', serverContentType);
        
        // 从Content-Disposition中提取文件名
        const contentDisposition = response.headers['content-disposition'];
        console.log('Content-Disposition:', contentDisposition);
        
        // 提取文件名并设置默认值
        let filename = `出库单_${order_number}`;
        let fileExtension = '';
        
        if (contentDisposition) {
            // 尝试从 Content-Disposition 中提取文件名
            const filenameMatch = contentDisposition.match(/filename[*]?=(?:utf-8''|")?([^";]+)/i);
            if (filenameMatch && filenameMatch.length > 1) {
                try {
                    let extractedName = filenameMatch[1];
                    if (extractedName.includes("%")) {
                        extractedName = decodeURIComponent(extractedName);
                    }
                    console.log('提取到的文件名:', extractedName);
                    
                    // 如果成功提取到文件名，使用它
                    if (extractedName && extractedName.trim() !== '') {
                        filename = extractedName;
                    }
                } catch (e) {
                    console.error('文件名解码失败:', e);
                }
            }
        }
        
        // 从文件名中提取扩展名
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            fileExtension = filename.substring(lastDotIndex + 1).toLowerCase();
        } else {
            // 如果文件名中没有扩展名，尝试从Content-Type推断
            if (serverContentType) {
                if (serverContentType.includes('spreadsheetml') || 
                    serverContentType.includes('excel')) {
                    fileExtension = 'xlsx';
                    filename += '.xlsx';
                } else if (serverContentType.includes('pdf')) {
                    fileExtension = 'pdf';
                    filename += '.pdf';
                } else {
                    // 默认扩展名
                    fileExtension = 'bin';
                    filename += '.bin';
                }
            }
        }
        
        console.log('最终文件名:', filename);
        console.log('文件扩展名:', fileExtension);
        
        // 根据扩展名设置正确的MIME类型
        let mimeType = 'application/octet-stream'; // 默认MIME类型
        
        switch (fileExtension) {
            case 'pdf':
                mimeType = 'application/pdf';
                break;
            case 'xlsx':
                mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                break;
            case 'xls':
                mimeType = 'application/vnd.ms-excel';
                break;
            case 'docx':
                mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                break;
            case 'doc':
                mimeType = 'application/msword';
                break;
            default:
                // 使用服务器返回的Content-Type(如果有)
                mimeType = serverContentType || 'application/octet-stream';
        }
        
        console.log('使用MIME类型:', mimeType);
        
        // 创建指定MIME类型的Blob
        const blob = new Blob([response.data], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        
        // 创建并触发下载链接
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        console.log('开始下载...');
        link.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            console.log('下载链接已清理');
        }, 100);
    } catch (error) {
        console.error("下载出库单失败:", error);
        
        // 详细记录错误信息
        if (error.response) {
            console.error('错误状态:', error.response.status);
            console.error('错误数据:', error.response.data);
            console.error('错误头信息:', error.response.headers);
        } else if (error.request) {
            console.error('请求错误:', error.request);
        } else {
            console.error('错误消息:', error.message);
        }
        
        if (error.response && error.response.status === 401) {
            alert("下载失败：您可能需要重新登录。");
        } else if (error.response && error.response.status === 404) {
            alert("下载失败：文件未找到。");
        } else {
            alert("下载出库单时发生错误，请稍后再试。");
        }
    }
  };

  const handleStartOutbound = (order) => {
    setOutboundingOrder(order);
    setOutboundFile(null);
    setOutboundNotes('');
  };

  const handleOutbound = async () => {
    if (!outboundFile) {
      alert('请选择出库单文件');
      return;
    }

    try {
      setIsProcessing(true);
      
      const formData = new FormData();
      formData.append('outbound_file', outboundFile);
      formData.append('outbound_notes', outboundNotes);

      await api.post(`/api/orders/${outboundingOrder.id}/outbound/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('出库成功');
      setOutboundingOrder(null);
      setOutboundFile(null);
      setOutboundNotes('');
      
      await fetchOrders();
    } catch (err) {
      console.error('出库失败:', err);
      alert(err.response?.data?.error || '出库失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
        case 'ready_for_production':
            return <span className="badge bg-secondary">待生产</span>;
        case 'in_production':
            return <span className="badge bg-primary">生产中</span>;
        case 'in_warehouse':
            return <span className="badge bg-success">已入库</span>;
        case 'out_warehouse':
            return <span className="badge bg-info">已出库</span>;
        default:
            return <span className="badge bg-secondary">未知</span>;
        }
    };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 按状态过滤订单
  const getFilteredOrders = (status) => {
    return warehouseOrders.filter(order => order.status === status);
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          {error}
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
            <i className="bi bi-box-seam me-2"></i>
            仓库管理
          </h2>
          <p className="text-muted">出入库员可以管理生产中和已入库的订单，进行入库和出库操作</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card border-success">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title text-success">待生产订单</h5>
                  <h3 className="mb-0">{getFilteredOrders('ready_for_production').length}</h3>
                </div>
                <div className="text-success">
                  <i className="bi bi-box" style={{fontSize: '2rem'}}></i>
                </div>
              </div>
              <p className="text-muted mb-0 mt-2">可执行生产操作</p>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-primary">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title text-primary">生产中订单</h5>
                  <h3 className="mb-0">{getFilteredOrders('in_production').length}</h3>
                </div>
                <div className="text-primary">
                  <i className="bi bi-gear-fill" style={{fontSize: '2rem'}}></i>
                </div>
              </div>
              <p className="text-muted mb-0 mt-2">可执行入库操作</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card border-success">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title text-success">已入库订单</h5>
                  <h3 className="mb-0">{getFilteredOrders('in_warehouse').length}</h3>
                </div>
                <div className="text-success">
                  <i className="bi bi-box" style={{fontSize: '2rem'}}></i>
                </div>
              </div>
              <p className="text-muted mb-0 mt-2">可执行出库操作</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card border-info">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title text-info">已出库订单</h5>
                  <h3 className="mb-0">{getFilteredOrders('out_warehouse').length}</h3>
                </div>
                <div className="text-info">
                  <i className="bi bi-truck" style={{fontSize: '2rem'}}></i>
                </div>
              </div>
              <p className="text-muted mb-0 mt-2">历史记录</p>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="card">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs" id="warehouseTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'ready_for_production' ? 'active' : ''}`}
                onClick={() => setActiveTab('ready_for_production')}
                type="button"
              >
                <i className="bi bi-box me-1"></i>
                待生产订单 ({getFilteredOrders('ready_for_production').length})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'in_production' ? 'active' : ''}`}
                onClick={() => setActiveTab('in_production')}
                type="button"
              >
                <i className="bi bi-gear me-1"></i>
                生产中订单 ({getFilteredOrders('in_production').length})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'in_warehouse' ? 'active' : ''}`}
                onClick={() => setActiveTab('in_warehouse')}
                type="button"
              >
                <i className="bi bi-box me-1"></i>
                已入库订单 ({getFilteredOrders('in_warehouse').length})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'out_warehouse' ? 'active' : ''}`}
                onClick={() => setActiveTab('out_warehouse')}
                type="button"
              >
                <i className="bi bi-truck me-1"></i>
                已出库订单 ({getFilteredOrders('out_warehouse').length})
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
        {/* 待生产订单 - 可生产 */}
          {activeTab === 'ready_for_production' && (
            <div className="tab-content">
              <div className="tab-pane fade show active">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">
                    <i className="bi bi-gear me-2"></i>
                    待生产订单 - 可执行生产操作
                  </h5>
                  <button className="btn btn-outline-primary" onClick={fetchOrders}>
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    刷新
                  </button>
                </div>
                
                {getFilteredOrders('ready_for_production').length === 0 ? (
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
                          <th>待生产操作人</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredOrders('ready_for_production').map(order => (
                          <tr key={order.id}>
                            <td>
                              <strong className="text-primary">{order.order_number}</strong>
                            </td>
                            <td>{order.project_name}</td>
                            <td>{order.ordered_by}</td>
                            <td>{getStatusBadge(order.status)}</td>
                            <td>{formatDateTime(order.production_started_at)}</td>
                            <td>{order.production_started_by?.username || '-'}</td>
                            <td>
                              <div className="d-flex gap-1 flex-wrap mb-2">
                                {/* 查看详情按钮 */}
                                <Link 
                                  to={`/orders/${order.id}`}
                                  className="btn btn-outline-secondary btn-sm"
                                >
                                  <i className="bi bi-eye me-1"></i>
                                  查看详情
                                </Link>

                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleReadyProduction(order)}
                                disabled={isProcessing}
                              >
                                <i className="bi bi-box-arrow-in-down me-1"></i>
                                开始生产
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

          {/* 生产中订单 - 可入库 */}
          {activeTab === 'in_production' && (
            <div className="tab-content">
              <div className="tab-pane fade show active">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">
                    <i className="bi bi-gear me-2"></i>
                    生产中订单 - 可执行入库操作
                  </h5>
                  <button className="btn btn-outline-primary" onClick={fetchOrders}>
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    刷新
                  </button>
                </div>
                
                {getFilteredOrders('in_production').length === 0 ? (
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    暂无生产中的订单
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
                          <th>生产开始时间</th>
                          <th>生产操作人</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredOrders('in_production').map(order => (
                          <tr key={order.id}>
                            <td>
                              <strong className="text-primary">{order.order_number}</strong>
                            </td>
                            <td>{order.project_name}</td>
                            <td>{order.ordered_by}</td>
                            <td>{getStatusBadge(order.status)}</td>
                            <td>{formatDateTime(order.production_started_at)}</td>
                            <td>{order.production_started_by?.username || '-'}</td>
                            <td>
                              <div className="d-flex gap-1 flex-wrap mb-2">
                                {/* 查看详情按钮 */}
                                <Link 
                                  to={`/orders/${order.id}`}
                                  className="btn btn-outline-secondary btn-sm"
                                >
                                  <i className="bi bi-eye me-1"></i>
                                  查看详情
                                </Link>
                              
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleInbound(order)}
                                disabled={isProcessing}
                              >
                                <i className="bi bi-box-arrow-in-down me-1"></i>
                                入库
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

          {/* 已入库订单 - 可出库 */}
          {activeTab === 'in_warehouse' && (
            <div className="tab-content">
              <div className="tab-pane fade show active">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">
                    <i className="bi bi-box me-2"></i>
                    已入库订单 - 可执行出库操作
                  </h5>
                  <button className="btn btn-outline-primary" onClick={fetchOrders}>
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    刷新
                  </button>
                </div>
                
                {getFilteredOrders('in_warehouse').length === 0 ? (
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    暂无已入库的订单
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
                          <th>入库时间</th>
                          <th>入库操作人</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredOrders('in_warehouse').map(order => (
                          <tr key={order.id}>
                            <td>
                              <strong className="text-success">{order.order_number}</strong>
                            </td>
                            <td>{order.project_name}</td>
                            <td>{order.ordered_by}</td>
                            <td>{getStatusBadge(order.status)}</td>
                            <td>{formatDateTime(order.inbound_at)}</td>
                            <td>{order.inbound_by?.username || '-'}</td>
                            <td>
                              <div className="d-flex gap-1 flex-wrap mb-2">
                                {/* 查看详情按钮 */}
                                <Link 
                                  to={`/orders/${order.id}`}
                                  className="btn btn-outline-secondary btn-sm"
                                >
                                  <i className="bi bi-eye me-1"></i>
                                  查看详情
                                </Link>
                              
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleStartOutbound(order)}
                                disabled={isProcessing}
                              >
                                <i className="bi bi-box-arrow-up me-1"></i>
                                出库
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

          {/* 已出库订单 - 历史记录 */}
          {activeTab === 'out_warehouse' && (
            <div className="tab-content">
              <div className="tab-pane fade show active">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">
                    <i className="bi bi-truck me-2"></i>
                    已出库订单 - 历史记录
                  </h5>
                  <button className="btn btn-outline-primary" onClick={fetchOrders}>
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    刷新
                  </button>
                </div>
                
                {getFilteredOrders('out_warehouse').length === 0 ? (
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    暂无已出库的订单
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
                          <th>出库时间</th>
                          <th>出库操作人</th>
                          <th>出库备注</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredOrders('out_warehouse').map(order => (
                          <tr key={order.id}>
                            <td>
                              <strong className="text-info">{order.order_number}</strong>
                            </td>
                            <td>{order.project_name}</td>
                            <td>{order.ordered_by}</td>
                            <td>{getStatusBadge(order.status)}</td>
                            <td>{formatDateTime(order.outbound_at)}</td>
                            <td>{order.outbound_by?.username || '-'}</td>
                            <td>
                              {order.outbound_notes ? (
                                <span title={order.outbound_notes}>
                                  {order.outbound_notes.length > 20 
                                    ? order.outbound_notes.substring(0, 20) + '...' 
                                    : order.outbound_notes}
                                </span>
                              ) : '-'}
                            </td>
                            <td>
                              <div className="d-flex gap-1 flex-wrap mb-2">
                                {/* 查看详情按钮 */}
                                <Link 
                                  to={`/orders/${order.id}`}
                                  className="btn btn-outline-secondary btn-sm"
                                >
                                  <i className="bi bi-eye me-1"></i>
                                  查看详情
                                </Link>
                              
                                {order.outbound_file && (
                                <button
                                    // href={`/api/orders/${order.id}/download/outbound_file/`} // 移除 href
                                    className="btn btn-outline-secondary btn-sm"
                                    title="下载出库单文件"
                                    onClick={() => handleDownloadOutboundFile(order.id, order.order_number)} // 添加 onClick 事件处理器
                                >
                                    <i className="bi bi-download me-1"></i>
                                    下载出库单
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
          )}
        </div>
      </div>

      {/* 出库模态框 */}
      {outboundingOrder && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-box-arrow-up me-2"></i>
                  出库操作
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setOutboundingOrder(null)}
                  disabled={isProcessing}
                ></button>
              </div>
              <div className="modal-body">
                {/* 订单信息 */}
                <div className="alert alert-info">
                  <h6 className="alert-heading">
                    <i className="bi bi-info-circle me-2"></i>
                    订单信息
                  </h6>
                  <hr />
                  <div className="row">
                    <div className="col-md-4">
                      <strong>订单号：</strong><br />
                      <span className="text-primary">{outboundingOrder.order_number}</span>
                    </div>
                    <div className="col-md-4">
                      <strong>项目名称：</strong><br />
                      {outboundingOrder.project_name}
                    </div>
                    <div className="col-md-4">
                      <strong>下单人：</strong><br />
                      {outboundingOrder.ordered_by}
                    </div>
                  </div>
                </div>

                {/* 出库单文件上传 */}
                <div className="mb-3">
                  <label className="form-label">
                    <i className="bi bi-file-earmark-arrow-up me-1"></i>
                    出库单文件 <span className="text-danger">*</span>
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setOutboundFile(e.target.files[0])}
                    disabled={isProcessing}
                  />
                  <div className="form-text">支持 PDF、Word、Excel 格式文件</div>
                </div>

                {/* 出库备注 */}
                <div className="mb-3">
                  <label className="form-label">
                    <i className="bi bi-chat-text me-1"></i>
                    出库备注
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={outboundNotes}
                    onChange={(e) => setOutboundNotes(e.target.value)}
                    placeholder="可选：添加出库相关备注..."
                    disabled={isProcessing}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setOutboundingOrder(null)}
                  disabled={isProcessing}
                >
                  取消
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleOutbound}
                  disabled={isProcessing || !outboundFile}
                >
                  {isProcessing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      处理中...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-up me-1"></i>
                      确认出库
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 模态框背景 */}
      {outboundingOrder && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
};

export default WarehouseControl;