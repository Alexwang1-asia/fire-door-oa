from django.urls import path
from . import views

urlpatterns = [
    # 订单创建和列表
    path('new/', views.OrderCreateView.as_view(), name='order-create'),
    path('my/', views.MyOrdersView.as_view(), name='my-orders'),
    path('paginated/', views.OrderListPaginated.as_view(), name='order-list-paginated'),
    
    # 订单详情和操作
    path('<uuid:pk>/', views.OrderDetailView.as_view(), name='order-detail'),
    path('<uuid:pk>/resubmit/', views.OrderResubmitView.as_view(), name='order-resubmit'),
    
    # 审核相关
    path('pending/', views.PendingOrdersView.as_view(), name='pending-orders'),
    # 修复：审核URL也使用UUID
    path('<uuid:pk>/review/', views.OrderReviewView.as_view(), name='order-review'),
    
    # 技术员相关
    path('approved/', views.ApprovedOrdersView.as_view(), name='approved-orders'),
    path('<uuid:pk>/upload-production-sheet/', views.UploadProductionSheetView.as_view(), name='upload-production-sheet'),
    path('ready-for-production/', views.ReadyProductionOrdersView.as_view(), name='ready-production-orders'),
    path('<uuid:order_id>/start-production/', views.ReadyProductionOrdersView.order_start_production, name='start-production'),
    
    path('in-production/', views.InProductionOrdersView.as_view(), name='in_production_orders'),
    
    # 下载
    path('<uuid:pk>/download/<str:file_type>/', views.DownloadOrderFileView.as_view(), name='download-order-file'),

    # 出入库相关路由
    path('warehouse-orders/', views.warehouse_orders, name='warehouse-orders'),
    path('<uuid:order_id>/inbound/', views.order_inbound, name='order-inbound'),
    path('<uuid:order_id>/outbound/', views.order_outbound, name='order-outbound'),
    # 兼容性路由
    # path('<uuid:order_id>/download-outbound-file/', views.download_outbound_file, name='download-outbound-file'),
    
    # 统计
    path('admin/stats/', views.order_stats, name='order-stats'),
    path('stats/', views.order_stats, name='orders-stats'),
    # 管理员删除订单路由
    path('<uuid:pk>/delete/', views.OrderDeleteView.as_view(), name='order-delete'),
]
