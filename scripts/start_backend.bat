@echo off
echo ================================
echo 启动防火门订单管理系统后端
echo ================================

cd F:\yp-fire-door-oa\backend
call venv\Scripts\activate

echo 检查数据库连接...
python manage.py check --database default

if %errorlevel% neq 0 (
    echo 数据库连接失败，请检查配置
    pause
    exit /b 1
)

echo 启动Django服务器...
echo 服务器将在 http://192.168.9.100:8000 启动
echo 按 Ctrl+C 停止服务器

python manage.py runserver 0.0.0.0:8000

pause