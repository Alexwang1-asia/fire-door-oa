import React, { useState, useEffect } from 'react';
import { useParams, useHistory, Link } from 'react-router-dom';
import api from '../../utils/api';

const OrderEdit = () => {
  const { id } = useParams();
  const history = useHistory();
  const [order, setOrder] = useState(null);
  const [formData, setFormData] = useState({
    project_name: '',
    ordered_by: ''
  });
  const [orderFile, setOrderFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 加载订单数据
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/api/orders/${id}/`);
        setOrder(res.data);
        setFormData({
          project_name: res.data.project_name || '',
          ordered_by: res.data.ordered_by || ''
        });
        setLoading(false);
      } catch (err) {
        console.error('获取订单数据失败:', err);
        setError('无法加载订单数据，请刷新重试');
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setOrderFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.project_name.trim()) {
      setError('请填写项目名称');
      return;
    }
    
    if (!formData.ordered_by.trim()) {
      setError('请填写下单人');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      // 创建FormData对象用于文件上传
      const submitData = new FormData();
      submitData.append('project_name', formData.project_name.trim());
      submitData.append('ordered_by', formData.ordered_by.trim());
      
      // 只有在选择了新文件时才添加文件
      if (orderFile) {
        submitData.append('order_file', orderFile);
      }

      // 调用重新提交API
      await api.put(`/api/orders/${id}/resubmit/`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('订单已成功重新提交，等待审核');
      
      // 2秒后跳转到订单详情页
      setTimeout(() => {
        history.push(`/orders/${id}`);
      }, 2000);
      
    } catch (err) {
      console.error('重新提交订单失败:', err);
      setError(err.response?.data?.error || '重新提交订单失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary"></div>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">{error}</div>
        <Link to="/orders" className="btn btn-secondary">返回订单列表</Link>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row mb-4">
        <div className="col">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/orders">订单管理</Link></li>
              <li className="breadcrumb-item"><Link to={`/orders/${id}`}>订单详情</Link></li>
              <li className="breadcrumb-item active">修改订单</li>
            </ol>
          </nav>
          <h2 className="mb-0">修改并重新提交订单</h2>
          <p className="text-muted">修改订单信息后重新提交审核</p>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      <div className="card">
        <div className="card-header bg-light">
          <h5 className="card-title mb-0">
            <i className="bi bi-pencil-square me-2"></i>
            编辑订单
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row mb-3">
              <div className="col-md-6">
                <label htmlFor="orderNumber" className="form-label">订单号</label>
                <input
                  type="text"
                  className="form-control"
                  id="orderNumber"
                  value={order?.order_number || ''}
                  readOnly
                  disabled
                />
                <div className="form-text">订单号不可修改</div>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label htmlFor="projectName" className="form-label">项目名称 <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  id="projectName"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="orderedBy" className="form-label">下单人 <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  id="orderedBy"
                  name="ordered_by"
                  value={formData.ordered_by}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="orderFile" className="form-label">下料单文件</label>
              <input
                type="file"
                className="form-control"
                id="orderFile"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                disabled={submitting}
              />
              <div className="form-text">
                {order?.order_file ? (
                  <>
                    已有下料单文件，如需更新请重新选择文件，否则保持原文件不变
                  </>
                ) : (
                  <>
                    支持PDF、Word、Excel格式文件，文件大小不超过10MB
                  </>
                )}
              </div>
              {orderFile && (
                <div className="mt-2">
                  <small className="text-success">
                    <i className="bi bi-check-circle me-1"></i>
                    已选择新文件: {orderFile.name}
                  </small>
                </div>
              )}
              {order?.order_file && !orderFile && (
                <div className="mt-2">
                  <small>
                    <i className="bi bi-file-earmark me-1"></i>
                    当前文件: {order.order_file.split('/').pop()}
                  </small>
                </div>
              )}
            </div>

            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              修改后将重置审核状态，订单将重新进入待审核队列。
            </div>

            <div className="d-flex justify-content-between mt-4">
              <Link to={`/orders/${id}`} className="btn btn-outline-secondary">
                <i className="bi bi-x me-1"></i>
                取消修改
              </Link>
              
              <button
                type="submit"
                className="btn btn-warning"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    提交中...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-1"></i>
                    重新提交订单
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrderEdit;