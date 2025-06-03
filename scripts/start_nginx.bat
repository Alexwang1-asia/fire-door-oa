@echo off
echo ================================
echo 启动Nginx Web服务器
echo ================================

set NGINX_PATH=D:\nginx-1.28.0\nginx-1.28.0

echo 检查Nginx配置...

if exist "%NGINX_PATH%\nginx.exe" (
    cd /d "%NGINX_PATH%"
    echo 启动Nginx服务...
    nginx.exe
    if %errorlevel% == 0 (
        echo Nginx启动成功！
    ) else (
        echo Nginx启动失败，请检查配置文件
    )
) else (
    echo 错误：找不到Nginx可执行文件
    echo 请确认Nginx已正确安装在: %NGINX_PATH%
)

echo.




echo 启动Nginx...
start nginx

echo Nginx已启动
echo 网站访问地址: http://192.168.9.100
echo.
echo 按任意键关闭此窗口...
pause > nul