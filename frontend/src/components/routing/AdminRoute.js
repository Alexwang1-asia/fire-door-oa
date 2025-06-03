import React, { useContext } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const AdminRoute = ({ component: Component, ...rest }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) {
    return <div className="d-flex justify-content-center mt-5"><div className="spinner-border"></div></div>;
  }
  
  return (
    <Route
      {...rest}
      render={props =>
        user && user.role === 'admin' ? (
          <Component {...props} />
        ) : (
          <Redirect to="/dashboard" />
        )
      }
    />
  );
};

export default AdminRoute;