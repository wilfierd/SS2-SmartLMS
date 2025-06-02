@echo off
REM ML Recommendation Service Setup Script for Windows
REM Run this to set up the Python ML service

echo 🤖 Setting up ML Recommendation Service...

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Check Python version
for /f "tokens=2" %%i in ('python --version') do set python_version=%%i
echo ✅ Python version: %python_version%

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔄 Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️ Upgrading pip...
python -m pip install --upgrade pip

REM Install requirements
echo 📚 Installing Python packages...
pip install -r requirements.txt

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo ⚙️ Creating .env file...
    copy .env.example .env
    echo 📝 Please edit .env file with your database credentials
)

echo ✅ ML Service setup complete!
echo.
echo To start the ML service:
echo 1. Edit the .env file with your database credentials
echo 2. Run: venv\Scripts\activate.bat
echo 3. Run: python app.py
echo.
echo The service will be available at: http://localhost:5000
pause
