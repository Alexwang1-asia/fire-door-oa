from rest_framework import serializers
from .models import Order
from users.serializers import UserSerializer


class OrderSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    production_started_by = UserSerializer(read_only=True)
    inbound_by = UserSerializer(read_only=True)  # 新增
    outbound_by = UserSerializer(read_only=True)  # 新增
    
    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user', 'project_name', 'status',
            'reviewed_by', 'review_notes', 'review_date', 'created_at',
            'order_file', 'ordered_by', 'production_sheet', 
            'production_started_by', 'production_started_at', 'production_notes',
            'updated_at', 'inbound_by', 'inbound_at', 'outbound_by',  # 新增字段
            'outbound_at', 'outbound_file', 'outbound_notes'  # 新增字段
        ]
        read_only_fields = ['id', 'created_at', 'user']
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # 确保所有字段都有默认值
        data['order_number'] = data.get('order_number') or ''
        data['project_name'] = data.get('project_name') or ''
        data['ordered_by'] = data.get('ordered_by') or ''
        data['production_notes'] = data.get('production_notes') or ''
        
        # 格式化日期
        for date_field in ['created_at', 'review_date', 'production_started_at', 'inbound_at', 'outbound_at']:  # 新增字段
            if data.get(date_field):
                try:
                    from datetime import datetime
                    date_obj = datetime.fromisoformat(data[date_field].replace('Z', '+00:00'))
                    data[date_field] = date_obj.isoformat()
                except:
                    pass
                    
        return data


class OrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['project_name', 'ordered_by']
    
    def validate_project_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("项目名称不能为空")
        return value.strip()
    
    def validate_ordered_by(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("下单人不能为空")
        return value.strip()


class OrderReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status', 'review_notes']
    
    def validate_status(self, value):
        if value not in ['approved', 'rejected']:
            raise serializers.ValidationError("状态只能是 approved 或 rejected")
        return value
    
    def validate(self, attrs):
        if attrs.get('status') == 'rejected' and not attrs.get('review_notes'):
            raise serializers.ValidationError({
                'review_notes': '拒绝订单时必须填写审核意见'
            })
        return attrs


class ProductionSheetSerializer(serializers.ModelSerializer):
    """生产面单上传序列化器"""
    production_notes = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Order
        fields = ['production_notes']
    
    def validate(self, attrs):
        # 在视图中处理文件上传
        return attrs
