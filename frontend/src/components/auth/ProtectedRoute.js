import React, { useContext } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ component: Component, allowedRoles, ...rest }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <Route
      {...rest}
      render={(props) => {
        if (!user) {
          return <Redirect to="/login" />;
        }

        if (allowedRoles && !allowedRoles.includes(user.role)) {
          return (
            <div className="container mt-5">
              <div className="alert alert-danger">
                <h4>访问被拒绝</h4>
                <p>您没有权限访问此页面。</p>
                <p>需要的角色: {allowedRoles.join(', ')}</p>
                <p>您的角色: {user.role}</p>
              </div>
            </div>
          );
        }

        return <Component {...props} />;
      }}
    />
  );
};

export default ProtectedRoute;