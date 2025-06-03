import React, { useContext } from 'react';
import { Link, Redirect } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const Landing = () => {
  const { user } = useContext(AuthContext);

  // 如果用户已登录，重定向到仪表板
  if (user) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-lg border-0">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <i className="bi bi-fire text-warning" style={{fontSize: '4rem'}}></i>
                  </div>
                  <h2 className="fw-bold text-dark mb-2">防火门OA系统</h2>
                  <p className="text-muted mb-0">员工内部管理系统</p>
                </div>
                
                <div className="d-grid gap-3">
                  <Link to="/login" className="btn btn-primary btn-lg">
                    <i className="bi bi-box-arrow-in-right me-2"></i>
                    员工登录
                  </Link>
                </div>
                
                <hr className="my-4" />
                
                <div className="text-center">
                  <small className="text-muted d-block mb-2">
                    <i className="bi bi-info-circle me-1"></i>
                    仅限公司内部员工使用
                  </small>
                  <small className="text-muted">
                    如需技术支持，请联系系统管理员
                  </small>
                </div>
              </div>
            </div>
            
            {/* 系统信息卡片 */}
            <div className="card mt-4 border-0 bg-transparent">
              <div className="card-body p-0">
                <div className="row text-center">
                  <div className="col-4">
                    <div className="p-3">
                      <i className="bi bi-shield-check text-success d-block mb-2" style={{fontSize: '1.5rem'}}></i>
                      <small className="text-muted">安全可靠</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3">
                      <i className="bi bi-lightning text-warning d-block mb-2" style={{fontSize: '1.5rem'}}></i>
                      <small className="text-muted">高效便捷</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3">
                      <i className="bi bi-people text-primary d-block mb-2" style={{fontSize: '1.5rem'}}></i>
                      <small className="text-muted">协同办公</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;