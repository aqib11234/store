@echo off
setlocal enabledelayedexpansion

REM Store Management System - One-Click Setup and Run Script (Windows)
REM This script will clone, setup, and run the entire project

echo.
echo ================================================
echo 🏪 STORE MANAGEMENT SYSTEM - AUTO SETUP
echo ================================================
echo.

REM Check if project already exists
if exist "store" if exist "backend" (
    echo [INFO] Project already exists. Skipping clone...
) else (
    echo [INFO] Cloning project from GitHub...
    git clone https://github.com/aqib11234/store.git temp_store
    if errorlevel 1 (
        echo [ERROR] Failed to clone repository. Make sure Git is installed.
        pause
        exit /b 1
    )
    
    REM Move files from temp directory
    move temp_store\* . >nul 2>&1
    rmdir temp_store /s /q >nul 2>&1
    echo [SUCCESS] Project cloned successfully!
)

REM Check dependencies
echo [INFO] Checking dependencies...

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed. Please install Git first.
    pause
    exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
    where python3 >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python is not installed. Please install Python 3.8+ first.
        pause
        exit /b 1
    )
    set PYTHON_CMD=python3
) else (
    set PYTHON_CMD=python
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo [SUCCESS] All dependencies are available!

REM Setup backend
if not exist "backend\venv" (
    echo [INFO] Setting up Python virtual environment...
    cd backend
    
    %PYTHON_CMD% -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    
    call venv\Scripts\activate.bat
    
    echo [INFO] Installing Python dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install Python dependencies.
        pause
        exit /b 1
    )
    
    echo [INFO] Setting up database...
    python manage.py migrate
    
    cd ..
    echo [SUCCESS] Backend setup completed!
) else (
    echo [INFO] Backend already setup. Skipping...
)

REM Setup frontend
if not exist "store\node_modules" (
    echo [INFO] Setting up Node.js environment...
    cd store
    
    echo [INFO] Installing Node.js dependencies...
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install Node.js dependencies.
        pause
        exit /b 1
    )
    
    cd ..
    echo [SUCCESS] Frontend setup completed!
) else (
    echo [INFO] Frontend already setup. Skipping...
)

REM Start application
echo [INFO] Starting the application...

REM Start backend
echo [INFO] Starting Django backend...
cd backend
call venv\Scripts\activate.bat
start "Django Backend" cmd /k "python manage.py runserver 127.0.0.1:8000"
cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo [INFO] Starting Next.js frontend...
cd store
start "Next.js Frontend" cmd /k "npm run dev"
cd ..

REM Print success message
echo.
echo ================================================
echo 🚀 STORE MANAGEMENT SYSTEM IS RUNNING!
echo ================================================
echo.
echo 📱 Frontend (Main App): http://localhost:3000
echo 🔧 Backend API:         http://localhost:8000
echo 👤 Admin Panel:         http://localhost:8000/admin
echo.
echo 🎯 Features Available:
echo    • Dashboard ^& Analytics
echo    • Product Management
echo    • POS System
echo    • Invoice Generation
echo    • Customer Management
echo.
echo ⚠️  Close the terminal windows to stop the servers
echo ================================================
echo.

echo [SUCCESS] Setup completed! The application should open in your browser shortly.
echo Press any key to exit this setup script...
pause >nul
