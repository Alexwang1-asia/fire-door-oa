from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


def order_file_path(instance, filename):
    """下料单文件存储路径"""
    return f'orders/{instance.id}/order_files/{filename}'


def production_sheet_path(instance, filename):
    """生产面单文件存储路径"""
    return f'orders/{instance.id}/production_sheets/{filename}'


def outbound_file_path(instance, filename):
    """出库单文件存储路径"""
    return f'orders/{instance.id}/outbound_files/{filename}'


class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', '待审核'),
        ('approved', '已批准'),
        ('rejected', '已拒绝'),
        ('ready_for_production', '待生产'),
        ('in_production', '生产中'),
        ('in_warehouse', '已入库'),  # 新增已入库状态
        ('out_warehouse', '已出库'),  # 新增已出库状态
        ('completed', '已完成'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=50, unique=True, verbose_name='订单号')
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='创建用户')
    project_name = models.CharField(max_length=200, verbose_name='项目名称')
    ordered_by = models.CharField(max_length=100, verbose_name='下单人')
    
    # 订单文件
    order_file = models.FileField(
        upload_to=order_file_path, 
        verbose_name='下料单文件',
        help_text='支持PDF、Word、Excel等格式'
    )
    
    # 生产面单 - 新增字段
    production_sheet = models.FileField(
        upload_to=production_sheet_path,
        verbose_name='生产面单',
        blank=True,
        null=True,
        help_text='技术员上传的生产面单文件'
    )
    
    # 状态和审核信息
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='状态')
    reviewed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='reviewed_orders',
        verbose_name='审核人'
    )
    review_date = models.DateTimeField(null=True, blank=True, verbose_name='审核时间')
    review_notes = models.TextField(blank=True, null=True, verbose_name='审核意见')
    
    # 生产信息 - 新增字段
    production_started_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='started_production_orders',
        verbose_name='开始生产操作人'
    )
    production_started_at = models.DateTimeField(null=True, blank=True, verbose_name='开始生产时间')
    production_notes = models.TextField(blank=True, verbose_name='生产备注')
    
    # 出入库信息 - 新增字段
    inbound_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inbound_orders',
        verbose_name='入库操作人'
    )
    inbound_at = models.DateTimeField(null=True, blank=True, verbose_name='入库时间')
    
    outbound_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='outbound_orders',
        verbose_name='出库操作人'
    )
    outbound_at = models.DateTimeField(null=True, blank=True, verbose_name='出库时间')
    outbound_file = models.FileField(
        upload_to=outbound_file_path,
        verbose_name='出库单文件',
        blank=True,
        null=True,
        help_text='出入库员上传的出库单文件'
    )
    outbound_notes = models.TextField(blank=True, verbose_name='出库备注')
    
    # 时间戳
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '订单'
        verbose_name_plural = '订单'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.order_number} - {self.project_name}"
    
    def save(self, *args, **kwargs):
        if not self.order_number:
            # 生成订单号逻辑
            from datetime import datetime
            from django.db.models import Max
            from django.db.models.functions import Substr, Cast
            from django.db.models import IntegerField
            
            now = datetime.now()
            year_month = now.strftime('%Y%m')
            order_prefix = f"YP{year_month}"
            
            # 获取当前年份的所有订单
            same_year_orders = Order.objects.filter(
                order_number__startswith=order_prefix
            )
            
            if same_year_orders.exists():
                # 提取序号部分并找出最大值
                # 假设订单号格式为 YYYYMM####，序号从第9位开始，共4位
                max_seq_order = same_year_orders.annotate(
                    seq_number=Cast(Substr('order_number', 9, 4), IntegerField())
                ).aggregate(Max('seq_number'))
                
                next_seq = max_seq_order['seq_number__max'] + 1 if max_seq_order['seq_number__max'] is not None else 1
            else:
                # 当年第一个订单
                next_seq = 1
            
            # 生成4位序号（带前导零）
            seq_str = f"{next_seq:04d}"
            
            # 组合订单号：年月+序列号
            self.order_number = f"{order_prefix}{seq_str}"
            
        super().save(*args, **kwargs)
    
    def can_start_production(self, user):
        """检查是否可以开始生产"""
        return (self.status == 'approved' and 
                user.role in ['admin', 'technician'])
    
    def can_download_files(self, user):
        """检查是否可以下载文件"""
        return user.role in ['admin', 'technician', 'reviewer', 'order_clerk', 'warehouse_clerk', 'workshop_tracker']
