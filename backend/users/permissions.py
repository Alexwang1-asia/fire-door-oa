from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """只有管理员可以访问"""
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                request.user.role == 'admin')


class IsAdminOrReviewer(permissions.BasePermission):
    """管理员或审核员权限"""
    def has_permission(self, request, view):
        return (request.user.is_authenticated and 
                request.user.role in ['admin', 'reviewer'])


class IsOrderClerk(permissions.BasePermission):
    """下单员权限"""
    def has_permission(self, request, view):
        return (request.user.is_authenticated and 
                request.user.role in ['admin', 'order_clerk'])


class IsTechnician(permissions.BasePermission):
    """技术员权限"""
    def has_permission(self, request, view):
        return (request.user.is_authenticated and 
                request.user.role in ['admin', 'technician'])
    
class IsWarehouseClerk(permissions.BasePermission):
    """仓库员权限"""
    def has_permission(self, request, view):
        return (request.user.is_authenticated and 
                request.user.role in ['admin', 'warehouse_clerk'])


class CanViewOwnOrders(permissions.BasePermission):
    """可以查看自己的订单"""
    def has_permission(self, request, view):
        return request.user.is_authenticated


class CanDownloadOrderFiles(permissions.BasePermission):
    """可以下载订单文件"""
    def has_permission(self, request, view):
        return (request.user.is_authenticated and 
                request.user.role in ['admin', 'technician', 'reviewer', 'order_clerk', 'warehouse_clerk', 'workshop_tracker'])