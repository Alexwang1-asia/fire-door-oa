from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('用户名是必须的')
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        return self.create_user(username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('admin', '管理员'),
        ('order_clerk', '下单员'),
        ('reviewer', '审核员'),
        ('technician', '技术员'),  # 新增技术员角色
        ('warehouse_clerk', '出入库员'),
        ('workshop_tracker', '车间跟单员'),
    )
    
    username = models.CharField(max_length=50, unique=True, verbose_name='用户名')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='order_clerk', verbose_name='角色')
    full_name = models.CharField(max_length=100, blank=True, verbose_name='姓名')
    email = models.EmailField(blank=True, verbose_name='邮箱')
    phone = models.CharField(max_length=20, blank=True, verbose_name='电话')
    department = models.CharField(max_length=50, blank=True, verbose_name='部门')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    created_by = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='created_users',
        verbose_name='创建者'
    )
    is_active = models.BooleanField(default=True, verbose_name='是否激活')
    is_staff = models.BooleanField(default=False, verbose_name='员工状态')
    last_login_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name='最后登录IP')
    
    objects = UserManager()
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []
    
    class Meta:
        verbose_name = '用户'
        verbose_name_plural = '用户'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    def get_role_display_with_icon(self):
        """获取带图标的角色显示"""
        role_icons = {
            'admin': 'bi-shield-fill-check',
            'order_clerk': 'bi-plus-circle',
            'reviewer': 'bi-clipboard-check',
            'technician': 'bi-wrench-adjustable',  # 技术员图标
            'warehouse_clerk': 'bi-box-seam',
            'workshop_tracker': 'bi-gear',
        }
        icon = role_icons.get(self.role, 'bi-person')
        return {
            'role': self.get_role_display(),
            'icon': icon
        }
    
    def has_permission(self, permission):
        """检查用户是否有特定权限"""
        if self.role == 'admin':
            return True
        
        permissions = {
            'order_clerk': ['create_order', 'view_own_orders', 'edit_rejected_orders'],
            'reviewer': ['view_all_orders', 'review_orders', 'approve_orders', 'reject_orders'],
            'technician': ['view_approved_orders', 'download_order_files', 'upload_production_sheets', 'update_production_status'],  # 技术员权限
            'warehouse_clerk': ['view_approved_orders', 'mark_shipped', 'manage_inventory'],
            'workshop_tracker': ['view_approved_orders', 'track_production', 'update_progress'],
        }
        
        return permission in permissions.get(self.role, [])
    
    def can_access_admin(self):
        """检查用户是否可以访问管理功能"""
        return self.role in ['admin', 'reviewer']
