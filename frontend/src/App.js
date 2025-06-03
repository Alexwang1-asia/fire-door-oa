import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import OrderList from './components/orders/OrderList';
import OrderForm from './components/orders/OrderForm';
import OrderDetail from './components/orders/OrderDetail';
import OrderReview from './components/admin/OrderReview';
import UserManagement from './components/admin/UserManagement';
import ProductionManagement from './components/production/ProductionManagement';
import WarehouseControl from './components/warehouse/WarehouseControl';
import OrderEdit from './components/orders/OrderEdit';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navbar />
          <Switch>
            <Route path="/login" component={Login} />
            <ProtectedRoute exact path="/dashboard" component={Dashboard} />
            
            {/* 修复：具体的管理路由要放在通用的 /admin 路由之前 */}
            <ProtectedRoute 
              exact
              path="/admin/orders/review" 
              component={OrderReview} 
              allowedRoles={['admin', 'reviewer']} 
            />
            <ProtectedRoute 
              exact
              path="/admin/users" 
              component={UserManagement} 
              allowedRoles={['admin']} 
            />
            
            {/* 通用的管理面板路由放在后面 */}
            <ProtectedRoute 
              exact
              path="/admin" 
              component={AdminDashboard} 
              allowedRoles={['admin', 'reviewer']} 
            />
            
            {/* 订单相关路由 */}
            <ProtectedRoute exact path="/orders" component={OrderList} />
            <ProtectedRoute exact path="/orders/:id/edit" component={OrderEdit} />
            <ProtectedRoute 
              exact
              path="/orders/new" 
              component={OrderForm} 
              allowedRoles={['admin', 'order_clerk']} 
            />
            
            {/* 生产管理路由 */}
            <ProtectedRoute 
              exact
              path="/production" 
              component={ProductionManagement} 
              allowedRoles={['admin', 'technician']} 
            />

            {/* 仓库管理路由 */}
            <ProtectedRoute 
              exact
              path="/warehouse" 
              component={WarehouseControl} 
              allowedRoles={['admin', 'warehouse_clerk']} 
            />
            
            {/* UUID订单详情路由放在最后，避免冲突 */}
            <ProtectedRoute 
              path="/orders/:id" 
              component={OrderDetail} 
            />
          </Switch>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
