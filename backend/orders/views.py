# filepath: f:\wangzheng\图标\fire-door-oa\orders\views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import api_view, permission_classes
from django.utils import timezone
from django.db.models import Q, Count
from django.contrib.auth import get_user_model
from django.http import HttpResponse, FileResponse, Http404
from django.utils.cache import add_never_cache_headers  # 导入 add_never_cache_headers
from django.core.cache import cache
import mimetypes
import os
import logging
from users.permissions import IsAdminUser

from .models import Order
from .serializers import OrderSerializer, OrderCreateSerializer, OrderReviewSerializer, ProductionSheetSerializer
from users.permissions import IsAdminOrReviewer, IsOrderClerk, CanViewOwnOrders, IsTechnician, CanDownloadOrderFiles, IsWarehouseClerk

User = get_user_model()

logger = logging.getLogger(__name__)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class OrderCreateView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderCreateSerializer
    
    def create(self, request, *args, **kwargs):
        try:
            # 检查用户权限
            if request.user.role not in ['admin', 'order_clerk']:
                return Response({
                    'error': '您没有权限创建订单',
                    'detail': f'当前角色: {request.user.role}, 需要角色: admin 或 order_clerk'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 检查文件
            order_file = request.FILES.get('order_file')
            if not order_file:
                return Response({
                    'error': '请上传下料单文件'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 验证序列化器
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'error': '数据验证失败',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            
            # 创建订单
            order = serializer.save(
                user=request.user,
                order_file=order_file
            )
            
            return Response({
                'message': '订单创建成功',
                'order': OrderSerializer(order).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': f'创建订单失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MyOrdersView(generics.ListAPIView):
    """所有登录用户都可以查看所有订单"""
    serializer_class = OrderSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if not user.is_authenticated:
            return Order.objects.none()
        
        return Order.objects.all().order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        try:
            if not request.user.is_authenticated:
                return Response({
                    'error': '请先登录'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            queryset = self.get_queryset()
            page = self.paginate_queryset(queryset)
            
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({
                'error': f'获取订单列表失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OrderDetailView(generics.RetrieveAPIView):
    """查看订单详情 - 所有登录用户都可以查看"""
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        try:
            obj = super().get_object()
            user = self.request.user
            
            if not user.is_authenticated:
                from django.core.exceptions import PermissionDenied
                raise PermissionDenied("请先登录")
            
            return obj
        except Exception as e:
            from django.http import Http404
            raise Http404(f"订单不存在: {str(e)}")

class PendingOrdersView(generics.ListAPIView):
    """待审核订单 - 仅管理员和审核员"""
    serializer_class = OrderSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAdminOrReviewer]
    
    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Order.objects.none()
        
        if self.request.user.role not in ['admin', 'reviewer']:
            return Order.objects.none()
        
        return Order.objects.filter(status='pending').order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        try:
            # 检查权限
            if not request.user.is_authenticated:
                return Response({
                    'error': '请先登录'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if request.user.role not in ['admin', 'reviewer']:
                return Response({
                    'error': '您没有权限查看待审核订单',
                    'detail': f'当前角色: {request.user.role}, 需要角色: admin 或 reviewer'
                }, status=status.HTTP_403_FORBIDDEN)
            
            queryset = self.get_queryset()
            page = self.paginate_queryset(queryset)
            
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'results': serializer.data,
                'count': queryset.count()
            })
            
        except Exception as e:
            import traceback
            print(f"获取待审核订单错误: {str(e)}")
            print(traceback.format_exc())
            return Response({
                'error': f'获取待审核订单失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OrderReviewView(generics.UpdateAPIView):
    """订单审核视图"""
    queryset = Order.objects.all()
    serializer_class = OrderReviewSerializer
    permission_classes = [IsAdminOrReviewer]
    
    def perform_update(self, serializer):
        # 设置审核人和审核时间
        serializer.save(
            reviewed_by=self.request.user,
            review_date=timezone.now()
        )
    
    def update(self, request, *args, **kwargs):
        try:
            # 检查权限
            if not request.user.is_authenticated:
                return Response({
                    'error': '请先登录'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if request.user.role not in ['admin', 'reviewer']:
                return Response({
                    'error': '您没有权限审核订单',
                    'detail': f'当前角色: {request.user.role}, 需要角色: admin 或 reviewer'
                }, status=status.HTTP_403_FORBIDDEN)
            
            instance = self.get_object()
            
            # 检查订单状态
            if instance.status != 'pending':
                return Response({
                    'error': f'订单状态不是待审核，当前状态: {instance.get_status_display()}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response({
                    'error': '数据验证失败',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            self.perform_update(serializer)
            
            return Response({
                'message': f'订单{serializer.validated_data["status"] == "approved" and "批准" or "拒绝"}成功',
                'order': OrderSerializer(instance).data
            })
            
        except Exception as e:
            import traceback
            print(f"审核订单错误: {str(e)}")
            print(traceback.format_exc())
            return Response({
                'error': f'审核订单失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OrderListPaginated(generics.ListAPIView):
    """分页订单列表 - 所有登录用户都可以查看所有订单"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        user = self.request.user
        return Order.objects.all().order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response({
                'error': '请先登录'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        return super().list(request, *args, **kwargs)

class OrderResubmitView(generics.UpdateAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer  # 使用合适的序列化器
    permission_classes = [permissions.IsAuthenticated]  # 根据需要调整权限
    
    def update(self, request, *args, **kwargs):
        try:
            order = self.get_object()
            
            # 检查用户是否有权修改此订单
            if order.user != request.user:
                return Response({
                    'error': '您只能重新提交自己的订单'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 检查订单状态是否为拒绝
            if order.status != 'rejected':
                return Response({
                    'error': '只有被拒绝的订单可以重新提交'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = self.get_serializer(order, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            # 处理文件上传
            order_file = request.FILES.get('order_file')
            
            # 修改这一行，将 review_notes 设置为空字符串而不是 None
            order = serializer.save(
                status='pending',
                reviewed_by=None,
                review_date=None,
                review_notes=''  # 改为空字符串，而不是 None
            )
            
            # 如果上传了新文件，保存它
            if order_file:
                order.order_file = order_file
                order.save()
            
            logger.info(f"订单 {order.order_number} (ID: {order.id}) 已被用户 {request.user.username} 重新提交")
            
            return Response({
                'message': '订单已成功重新提交',
                'order_id': order.id,
                'order_number': order.order_number
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"重新提交订单失败: {str(e)}")
            return Response({
                'error': f'重新提交订单失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DownloadOrderFileView(APIView):
    """下载订单文件 - 统一下载接口"""
    permission_classes = [permissions.IsAuthenticated, CanDownloadOrderFiles]
    
    def get(self, request, pk, file_type):
        logger.info(f"Download request received for order PK: {pk}, file_type: {file_type}, user: {request.user.username}")
        
        try:
            order = Order.objects.get(pk=pk)
            logger.debug(f"Order found: {order.order_number}")
        except Order.DoesNotExist:
            logger.error(f"Order not found for PK: {pk}")
            return HttpResponse("订单未找到。", status=status.HTTP_404_NOT_FOUND)
        
        # 确定文件字段和基础文件名
        if file_type == 'order_file':
            file_field = order.order_file
            base_filename = f"下料单_{order.order_number}"
        elif file_type == 'production_sheet':
            file_field = order.production_sheet
            base_filename = f"生产面单_{order.order_number}"
        elif file_type == 'outbound_file':
            file_field = order.outbound_file
            base_filename = f"出库单_{order.order_number}"
            logger.debug(f"Attempting to serve outbound_file: {file_field.name if file_field else 'No file'}")
        else:
            logger.warning(f"Unsupported file_type: {file_type} for order PK: {pk}")
            return HttpResponse("不支持的文件类型", status=status.HTTP_400_BAD_REQUEST)
        
        if not file_field or not file_field.name:
            logger.error(f"File field is empty or has no name for file_type: {file_type}, order PK: {pk}")
            return HttpResponse("文件未找到或未正确关联。", status=status.HTTP_404_NOT_FOUND)
        
        file_path = file_field.path
        logger.debug(f"Resolved file path: {file_path}")

        if not os.path.exists(file_path):
            logger.error(f"File does not exist at path: {file_path} for order PK: {pk}, file_type: {file_type}")
            return HttpResponse("文件在服务器上不存在。", status=status.HTTP_404_NOT_FOUND)
        
        # 获取原始文件名（保持原始编码）
        original_filename = os.path.basename(file_field.name)
        
        logger.debug(f"Original filename: {original_filename}")
        
        try:
            response = FileResponse(
                open(file_path, 'rb'),
                as_attachment=True,
                filename=original_filename  # 直接使用原始文件名
            )
            
            logger.info(f"File download initiated for order PK: {pk}, file_type: {file_type}, filename: {original_filename}")
            return response
            
        except Exception as e:
            logger.error(f"Error creating file response for order PK: {pk}, file_type: {file_type}: {str(e)}")
            return HttpResponse("文件读取失败。", status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def order_stats(request):
    """获取订单统计数据 - 所有登录用户都可以查看"""
    try:
        if not request.user.is_authenticated:
            return Response({
                'error': '请先登录'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # 尝试从缓存获取统计数据
        cache_key = 'order_stats'
        cached_stats = cache.get(cache_key)
        
        if cached_stats:
            logger.debug("返回缓存的统计数据")
            return Response(cached_stats, status=status.HTTP_200_OK)
        
        # 缓存未命中，重新计算
        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status='pending').count()
        approved_orders = Order.objects.filter(status='approved').count()
        rejected_orders = Order.objects.filter(status='rejected').count()
        ready_for_production_orders = Order.objects.filter(status='ready_for_production').count()
        in_production_orders = Order.objects.filter(status='in_production').count()
        completed_orders = Order.objects.filter(status='completed').count()
        total_users = User.objects.count()
        
        status_stats = Order.objects.values('status').annotate(count=Count('id'))
        
        stats = {
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'approved_orders': approved_orders,
            'rejected_orders': rejected_orders,
            'ready_for_production_orders': ready_for_production_orders,
            'in_production_orders': in_production_orders,
            'completed_orders': completed_orders,
            'total_users': total_users,
            'status_breakdown': list(status_stats),
            'last_updated': timezone.now().isoformat(),
        }
        
        # 设置缓存，有效期5分钟
        cache.set(cache_key, stats, 300)
        
        return Response(stats, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"获取统计数据失败: {str(e)}")
        return Response({
            'error': f'获取统计数据失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ApprovedOrdersView(generics.ListAPIView):
    """已批准订单列表 - 技术员使用"""
    serializer_class = OrderSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsTechnician]
    
    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Order.objects.none()
        
        return Order.objects.filter(status='approved').order_by('-review_date')
    
    def list(self, request, *args, **kwargs):
        try:
            # 检查权限
            if not request.user.is_authenticated:
                return Response({
                    'error': '请先登录'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            queryset = self.get_queryset()
            page = self.paginate_queryset(queryset)
            
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'results': serializer.data,
                'count': queryset.count()
            })
            
        except Exception as e:
            import traceback
            print(f"获取已批准订单错误: {str(e)}")
            print(traceback.format_exc())
            return Response({
                'error': f"获取已批准订单失败: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UploadProductionSheetView(generics.UpdateAPIView):
    """上传生产面单 - 技术员使用"""
    queryset = Order.objects.all()
    serializer_class = ProductionSheetSerializer
    permission_classes = [IsTechnician]
    
    def update(self, request, *args, **kwargs):
        try:
            # 检查权限
            if not request.user.is_authenticated:
                return Response({
                    'error': '请先登录'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if request.user.role not in ['admin', 'technician']:
                return Response({
                    'error': '您没有权限上传生产面单',
                    'detail': f'当前角色: {request.user.role}, 需要角色: admin 或 technician'
                }, status=status.HTTP_403_FORBIDDEN)
            
            instance = self.get_object()
            
            # 检查订单状态
            if instance.status != 'approved':
                return Response({
                    'error': f'只有已批准的订单才能开始生产，当前状态: {instance.get_status_display()}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 检查是否上传了文件
            production_sheet = request.FILES.get('production_sheet')
            if not production_sheet:
                return Response({
                    'error': '请上传生产面单文件'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 验证序列化器
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response({
                    'error': '数据验证失败',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 更新订单状态并保存文件
            serializer.save(
                status='ready_for_production',
                production_started_by=request.user,
                production_started_at=timezone.now(),
                production_sheet=production_sheet
            )
            
            return Response({
                'message': '生产面单上传成功，订单已转为待生产状态',
                'order': OrderSerializer(instance).data
            })
            
        except Exception as e:
            import traceback
            print(f"上传生产面单错误: {str(e)}")
            print(traceback.format_exc())
            return Response({
                'error': f'上传生产面单失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ReadyProductionOrdersView(generics.ListAPIView):
    """待生产订单列表 - 技术员使用"""
    serializer_class = OrderSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsWarehouseClerk, IsTechnician]
    
    
    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Order.objects.none()
        
        if self.request.user.role not in ['admin', 'technician', 'warehouse_clerk']:
            return Order.objects.none()
        
        return Order.objects.filter(status='ready_for_production').order_by('-production_started_at')
    
    @api_view(['POST'])
    def order_start_production(request, order_id):
        """订单开始生产操作"""
        if request.user.role not in ['admin', 'warehouse_clerk']:
            return Response({
                'error': '您没有权限进行开始生产操作'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({
                'error': '订单不存在'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if order.status != 'ready_for_production':
            return Response({
                'error': f'订单状态错误，当前状态：{order.get_status_display()}，只有待生产的订单才能开始生产'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 更新订单状态
        order.status = 'in_production'
        order.inbound_by = request.user
        order.inbound_at = timezone.now()
        order.save()
        
        return Response({
            'message': '开始生产成功',
            'order': OrderSerializer(order).data
        })

class InProductionOrdersView(generics.ListAPIView):
    """生产中订单列表"""
    serializer_class = OrderSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsWarehouseClerk]
    
    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Order.objects.none()
        
        if self.request.user.role not in ['admin', 'warehouse_clerk']:
            return Order.objects.none()
        
        return Order.objects.filter(status='in_production').order_by('-production_started_at')
    

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def warehouse_orders(request):
    """获取出入库员可操作的订单列表"""
    if request.user.role not in ['admin', 'warehouse_clerk']:
        return Response({
            'error': '您没有权限访问此功能'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # 获取生产中、已入库的订单
    orders = Order.objects.filter(
        status__in=['ready_for_production','in_production', 'in_warehouse', 'out_warehouse']
    ).order_by('-created_at')
    
    paginator = StandardResultsSetPagination()
    result_page = paginator.paginate_queryset(orders, request)
    serializer = OrderSerializer(result_page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def order_inbound(request, order_id):
    """订单入库操作"""
    if request.user.role not in ['admin', 'warehouse_clerk']:
        return Response({
            'error': '您没有权限进行入库操作'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({
            'error': '订单不存在'
        }, status=status.HTTP_404_NOT_FOUND)
    
    if order.status != 'in_production':
        return Response({
            'error': f'订单状态错误，当前状态：{order.get_status_display()}，只有生产中的订单才能入库'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # 更新订单状态
    order.status = 'in_warehouse'
    order.inbound_by = request.user
    order.inbound_at = timezone.now()
    order.save()
    
    return Response({
        'message': '入库成功',
        'order': OrderSerializer(order).data
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def order_outbound(request, order_id):
    """订单出库操作"""
    print(f"出库请求: 订单ID={order_id}, 用户={request.user.username}")
    
    if request.user.role not in ['admin', 'warehouse_clerk']:
        return Response({
            'error': '您没有权限进行出库操作'
        }, status=status.HTTP_403_FORBIDDEN)
    
    try:
        order = Order.objects.get(id=order_id)
        print(f"找到订单: {order.order_number}, 状态: {order.status}")
    except Order.DoesNotExist:
        return Response({
            'error': '订单不存在'
        }, status=status.HTTP_404_NOT_FOUND)
    
    if order.status != 'in_warehouse':
        return Response({
            'error': f'订单状态错误，当前状态：{order.get_status_display()}，只有已入库的订单才能出库'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # 检查出库单文件
    outbound_file = request.FILES.get('outbound_file')
    print(f"上传的文件: {outbound_file}")
    
    if not outbound_file:
        return Response({
            'error': '请上传出库单文件'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # 先保存文件
        old_outbound_file = order.outbound_file
        order.outbound_file = outbound_file
        order.save(update_fields=['outbound_file'])
        
        # 验证文件是否正确保存
        order.refresh_from_db()  # 刷新数据
        if not order.outbound_file:
            print("文件保存失败")
            return Response({
                'error': '文件保存失败'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 更新其他信息
        order.status = 'out_warehouse'
        order.outbound_by = request.user
        order.outbound_at = timezone.now()
        order.outbound_notes = request.data.get('outbound_notes', '')
        order.save()
        
        # 打印调试信息
        print(f"出库成功: {order.order_number}")
        print(f"文件名: {order.outbound_file.name}")
        print(f"文件路径: {order.outbound_file.path}")
        print(f"文件URL: {order.outbound_file.url}")
        print(f"文件大小: {order.outbound_file.size} bytes")
        
        return Response({
            'message': '出库成功',
            'order': OrderSerializer(order).data
        })
        
    except Exception as e:
        import traceback
        print(f"出库操作失败: {str(e)}")
        traceback.print_exc()
        return Response({
            'error': f'出库操作失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
class OrderDeleteView(generics.DestroyAPIView):
    """订单删除视图 - 只有管理员可以删除订单"""
    queryset = Order.objects.all()
    permission_classes = [IsAdminUser]
    
    def destroy(self, request, *args, **kwargs):
        try:
            order = self.get_object()
            order_number = order.order_number
            order_id = order.id
            
            # 记录删除操作
            logger.warning(f"管理员 {request.user.username} 正在删除订单 {order_number} (ID: {order_id})")
            
            # 执行删除
            self.perform_destroy(order)
            
            # 记录删除成功
            logger.warning(f"订单 {order_number} (ID: {order_id}) 已被管理员 {request.user.username} 删除")
            
            return Response({
                'message': f'订单 {order_number} 已成功删除',
                'deleted_id': str(order_id),
                'deleted_number': order_number
            }, status=status.HTTP_200_OK)
            
        except Http404:
            return Response({
                'error': '订单不存在'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"删除订单时出错: {str(e)}")
            return Response({
                'error': f'删除订单失败: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)