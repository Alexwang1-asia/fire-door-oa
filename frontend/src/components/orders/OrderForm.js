import React, { useState, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const OrderForm = () => {
  const { user } = useContext(AuthContext);
  const history = useHistory();
  const [formData, setFormData] = useState({
    project_name: '',
    ordered_by: user?.full_name || user?.username || ''
  });
  const [orderFile, setOrderFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setOrderFile(file);
    
    // 清除之前的错误
    setError('');
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
    
    if (!orderFile) {
      setError('请选择下料单文件');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 创建FormData对象
      const submitData = new FormData();
      submitData.append('project_name', formData.project_name.trim());
      submitData.append('ordered_by', formData.ordered_by.trim());
      submitData.append('order_file', orderFile);

      console.log('提交数据:', {
        project_name: formData.project_name,
        ordered_by: formData.ordered_by,
        order_file: orderFile.name
      });

      const response = await api.post('/api/orders/new/', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      console.log('创建成功:', response.data);
      
      // 显示成功消息
      alert('订单创建成功！');
      
      // 跳转到订单详情页
      if (response.data.order && response.data.order.id) {
        history.push(`/orders/${response.data.order.id}`);
      } else {
        history.push('/orders');
      }

    } catch (err) {
      console.error('创建订单失败:', err);
      
      let errorMessage = '创建订单失败，请重试';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.details) {
        const details = err.response.data.details;
        errorMessage = Object.values(details).flat().join(', ');
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      project_name: '',
      ordered_by: user?.full_name || user?.username || ''
    });
    setOrderFile(null);
    setError('');
    
    // 重置文件输入框
    const fileInput = document.getElementById('orderFile');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4 className="card-title mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                创建新订单
              </h4>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="project_name" className="form-label">
                        项目名称 <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="project_name"
                        name="project_name"
                        value={formData.project_name}
                        onChange={handleInputChange}
                        placeholder="请输入项目名称"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="ordered_by" className="form-label">
                        下单人 <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="ordered_by"
                        name="ordered_by"
                        value={formData.ordered_by}
                        onChange={handleInputChange}
                        placeholder="请输入下单人姓名"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="orderFile" className="form-label">
                    下料单文件 <span className="text-danger">*</span>
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    id="orderFile"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    required
                    disabled={loading}
                  />
                  <div className="form-text">
                    支持PDF、Word、Excel格式文件，文件大小不超过10MB
                  </div>
                  {orderFile && (
                    <div className="mt-2">
                      <small className="text-success">
                        <i className="bi bi-check-circle me-1"></i>
                        已选择文件: {orderFile.name}
                      </small>
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    重置表单
                  </button>
                  
                  <div>
                    <button
                      type="button"
                      className="btn btn-secondary me-2"
                      onClick={() => history.push('/orders')}
                      disabled={loading}
                    >
                      <i className="bi bi-arrow-left me-1"></i>
                      返回列表
                    </button>
                    
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !formData.project_name.trim() || !formData.ordered_by.trim() || !orderFile}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          创建中...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-1"></i>
                          创建订单
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* 帮助信息 */}
          <div className="card mt-4">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="bi bi-info-circle me-2"></i>
                填写说明
              </h6>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                <li><i className="bi bi-check text-success me-2"></i>项目名称：请填写具体的项目或工程名称</li>
                <li><i className="bi bi-check text-success me-2"></i>下单人：填写实际下单人的姓名</li>
                <li><i className="bi bi-check text-success me-2"></i>下料单文件：上传包含详细规格的文件</li>
                <li><i className="bi bi-check text-success me-2"></i>订单提交后将进入待审核状态</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;
