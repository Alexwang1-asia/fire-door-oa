@echo off
echo ================================
echo 停止所有服务
echo ================================

echo 停止Nginx服务...
taskkill /F /IM nginx.exe 2>nul
if %errorlevel% equ 0 (
    echo Nginx服务已停止
) else (
    echo Nginx服务未运行或停止失败
)

echo 停止Python/Django服务...
taskkill /F /IM python.exe 2>nul
if %errorlevel% equ 0 (
    echo Django服务已停止
) else (
    echo Django服务未运行或停止失败
)

echo.
echo 所有服务已停止
echo.
pause