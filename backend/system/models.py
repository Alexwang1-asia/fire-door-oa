from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class SystemLog(models.Model):
    LOG_TYPES = (
        ('info', '信息'),
        ('warning', '警告'),
        ('error', '错误'),
        ('critical', '严重'),
    )
    
    LOG_MODULES = (
        ('orders', '订单'),
        ('users', '用户'),
        ('system', '系统'),
        ('auth', '认证'),
    )
    
    type = models.CharField(max_length=20, choices=LOG_TYPES, verbose_name='日志类型')
    module = models.CharField(max_length=20, choices=LOG_MODULES, verbose_name='模块')
    message = models.TextField(verbose_name='日志内容')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name='操作用户')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP地址')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '系统日志'
        verbose_name_plural = '系统日志'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"[{self.type}][{self.module}] {self.message[:50]}..."