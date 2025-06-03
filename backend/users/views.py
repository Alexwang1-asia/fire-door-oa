from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model

from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    PasswordChangeSerializer, CustomTokenObtainPairSerializer
)
from .permissions import IsAdminUser

User = get_user_model()


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UserView(APIView):
    """获取当前用户信息"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserListCreateView(generics.ListCreateAPIView):
    """管理员查看和创建用户"""
    permission_classes = [IsAdminUser]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer
    
    def get_queryset(self):
        return User.objects.all().order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        try:
            # 检查权限
            if not request.user.is_authenticated:
                return Response({
                    'error': '请先登录'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if request.user.role != 'admin':
                return Response({
                    'error': '您没有权限查看用户列表',
                    'detail': f'当前角色: {request.user.role}, 需要角色: admin'
                }, status=status.HTTP_403_FORBIDDEN)
            
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            
            print(f"用户列表查询成功，共 {queryset.count()} 个用户")
            
            return Response(serializer.data)
            
        except Exception as e:
            import traceback
            print(f"获取用户列表错误: {str(e)}")
            print(traceback.format_exc())
            return Response({
                'error': f'获取用户列表失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request, *args, **kwargs):
        try:
            # 检查权限
            if not request.user.is_authenticated:
                return Response({
                    'error': '请先登录'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if request.user.role != 'admin':
                return Response({
                    'error': '您没有权限创建用户'
                }, status=status.HTTP_403_FORBIDDEN)
            
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'error': '数据验证失败',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user = serializer.save()
            
            return Response({
                'message': '用户创建成功',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import traceback
            print(f"创建用户错误: {str(e)}")
            print(traceback.format_exc())
            return Response({
                'error': f'创建用户失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """管理员查看、更新、删除用户"""
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer
    
    def update(self, request, *args, **kwargs):
        try:
            user = self.get_object()
            serializer = self.get_serializer(user, data=request.data, partial=True)
            
            if not serializer.is_valid():
                return Response({
                    'error': '数据验证失败',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            serializer.save()
            
            return Response({
                'message': '用户信息更新成功',
                'user': UserSerializer(user).data
            })
            
        except Exception as e:
            return Response({
                'error': f'更新用户失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, *args, **kwargs):
        try:
            user = self.get_object()
            if user.role == 'admin':
                return Response({
                    'error': '不能删除管理员账户'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user.delete()
            return Response({
                'message': '用户删除成功'
            }, status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            return Response({
                'error': f'删除用户失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PasswordChangeView(APIView):
    """用户修改自己的密码"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({
                    'error': '原密码错误'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({
                'message': '密码修改成功'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResetPasswordView(APIView):
    """管理员重置用户密码"""
    permission_classes = [IsAdminUser]
    
    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            new_password = request.data.get('new_password', '123456')
            
            if len(new_password) < 6:
                return Response({
                    'error': '密码长度不能少于6位'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(new_password)
            user.save()
            
            return Response({
                'message': '密码重置成功',
                'new_password': new_password
            })
        except User.DoesNotExist:
            return Response({
                'error': '用户不存在'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'重置密码失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def user_stats(request):
    """获取用户统计数据"""
    try:
        total_users = User.objects.count()
        admin_users = User.objects.filter(role='admin').count()
        reviewer_users = User.objects.filter(role='reviewer').count()
        order_clerk_users = User.objects.filter(role='order_clerk').count()
        technician_users = User.objects.filter(role='technician').count()
        warehouse_clerk_users = User.objects.filter(role='warehouse_clerk').count()
        workshop_tracker_users = User.objects.filter(role='workshop_tracker').count()
        active_users = User.objects.filter(is_active=True).count()
        
        stats = {
            'total_users': total_users,
            'admin_users': admin_users,
            'reviewer_users': reviewer_users,
            'order_clerk_users': order_clerk_users,
            'technician_users': technician_users,
            'warehouse_clerk_users': warehouse_clerk_users,
            'workshop_tracker_users': workshop_tracker_users,
            'active_users': active_users,
        }
        
        return Response(stats, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        print(f"获取用户统计错误: {str(e)}")
        print(traceback.format_exc())
        return Response({
            'error': f'获取统计数据失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
