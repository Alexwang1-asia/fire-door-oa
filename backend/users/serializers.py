from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """用户基本信息序列化器"""
    
    class Meta:
        model = User
        fields = (
            'id', 'username', 'full_name', 'email', 'phone', 'role', 
            'department', 'is_active', 'is_staff', 'created_at', 'last_login'
        )
        read_only_fields = ('id', 'created_at', 'last_login')


class UserCreateSerializer(serializers.ModelSerializer):
    """管理员创建用户的序列化器"""
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = (
            'username', 'password', 'confirm_password', 'role', 'full_name', 
            'email', 'phone', 'department'
        )
    
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError('两次输入的密码不一致')
        return attrs
    
    def validate_role(self, value):
        if value == 'admin':
            raise serializers.ValidationError('不能通过此接口创建管理员账户')
        return value
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            password=password,
            created_by=self.context.get('request').user if self.context.get('request') else None,
            **validated_data
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """更新用户信息的序列化器"""
    
    class Meta:
        model = User
        fields = ('role', 'full_name', 'email', 'phone', 'department', 'is_active')
    
    def validate_role(self, value):
        user = self.instance
        if user and user.role == 'admin' and value != 'admin':
            raise serializers.ValidationError('不能修改管理员的角色')
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """修改密码的序列化器"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """自定义登录序列化器"""
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # 添加用户信息到响应中
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'full_name': self.user.full_name,
            'role': self.user.role,
            'email': self.user.email,
            'phone': self.user.phone,
            'department': self.user.department,
            'is_active': self.user.is_active,
            'permissions': {
                'can_create_order': self.user.has_permission('create_order'),
                'can_review_order': self.user.has_permission('review_orders'),
                'can_access_admin': self.user.can_access_admin(),
                'can_manage_users': self.user.role == 'admin',
            }
        }
        
        # 记录登录IP
        request = self.context.get('request')
        if request:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')
            self.user.last_login_ip = ip
            self.user.save(update_fields=['last_login_ip'])
        
        return data
