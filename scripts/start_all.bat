@echo off
echo ================================
echo 防火门订单管理系统一键启动
echo ================================

echo 1. 启动后端服务...
start "Django Backend" "F:\yp-fire-door-oa\scripts\start_backend.bat"

echo 等待后端服务启动...
timeout /t 10 /nobreak

echo 检查后端服务状态...
netstat -ano | findstr :8000 > nul
if %errorlevel% == 0 (
    echo 后端服务启动成功！
) else (
    echo 警告：后端服务可能未正常启动
    echo 请手动检查Django服务状态
)

echo.
echo 2. 启动前端服务...
start "Nginx Frontend" "F:\yp-fire-door-oa\scripts\start_nginx.bat"

echo 等待前端服务启动...
timeout /t 3 /nobreak

echo.
echo ================================
echo 系统启动完成！
echo ================================
echo.
echo 访问地址: http://192.168.9.100
echo 管理后台: http://192.168.9.100/admin
echo.
echo 如果遇到500错误，请检查Nginx错误日志：
echo nginx\logs\error.log
echo.
echo 注意：请不要关闭弹出的窗口
echo.
pause