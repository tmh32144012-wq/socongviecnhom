@echo off
chcp 65001 >nul
title KanoFlow - He thong Quan ly Cong viec Nhom Kanban
cd /d "%~dp0"

echo ========================================================
echo   KANOFLOW - QUAN LY CONG VIEC NHOM KIEU KANBAN
echo   Node.js + React.js + SQL Server + Socket.io Realtime
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Node.js. Vui long cai dat Node.js ^(>= 18^) truoc!
    pause
    exit /b 1
)

if not exist "server\.env" (
    if exist "server\.env.example" (
        copy "server\.env.example" "server\.env" >nul
        echo [CHU Y] Da tu dong tao file server\.env tu mau server\.env.example.
        echo Vui long mo server\.env de dien DB_PASSWORD cua SQL Server neu can, sau do chay lai!
        echo.
    ) else (
        echo [CANH BAO] Khong tim thay file server\.env. Hay tao file server\.env truoc khi chay!
        echo.
    )
)

if not exist "node_modules" (
    echo Dang cai dat goi goc...
    call npm install
)
if not exist "server\node_modules" (
    echo Dang cai dat goi cho server...
    call npm install --prefix server
)
if not exist "client\node_modules" (
    echo Dang cai dat goi cho client...
    call npm install --prefix client
)

echo Dang khoi dong Backend ^(http://localhost:5000^) va Frontend ^(http://localhost:5173^)...
echo Trinh duyet se tu dong mo sau vai giay.
echo.
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5173"
call npm run dev
pause
