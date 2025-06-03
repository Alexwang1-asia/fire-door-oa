from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView, UserView, UserListCreateView, UserDetailView,
    PasswordChangeView, ResetPasswordView, user_stats
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserView.as_view(), name='me'),
    path('change-password/', PasswordChangeView.as_view(), name='change_password'),
    
    # 管理员功能
    path('admin/users/', UserListCreateView.as_view(), name='admin_users'),
    path('admin/users/<int:pk>/', UserDetailView.as_view(), name='admin_user_detail'),
    path('admin/users/<int:pk>/reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('admin/stats/', user_stats, name='user_stats'),
]
