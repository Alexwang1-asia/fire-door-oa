from rest_framework import permissions
from django.contrib import admin
from .models import Order

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    # 现有配置...
    
    def has_delete_permission(self, request, obj=None):
        # 只有超级管理员或管理员角色可以删除
        return request.user.is_superuser or request.user.role == 'admin'

class IsAdminUser(permissions.BasePermission):
    """
    只允许管理员访问
    """
    def has_permission(self, request, view):
        return request.user and request.user.role == 'admin'
