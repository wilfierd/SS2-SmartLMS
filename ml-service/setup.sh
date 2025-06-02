#!/bin/bash
# ML Recommendation Service Setup Script
# Run this to set up the Python ML service

set -e

echo "🤖 Setting up ML Recommendation Service..."

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check Python version
python_version=$(python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "✅ Python version: $python_version"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Upgrade pip
echo "⬆️ Upgrading pip..."
python -m pip install --upgrade pip

# Install requirements
echo "📚 Installing Python packages..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️ Creating .env file..."
    cp .env.example .env
    echo "📝 Please edit .env file with your database credentials"
fi

echo "✅ ML Service setup complete!"
echo ""
echo "To start the ML service:"
echo "1. Edit the .env file with your database credentials"
echo "2. Run: source venv/Scripts/activate (Windows) or source venv/bin/activate (Linux/Mac)"
echo "3. Run: python app.py"
echo ""
echo "The service will be available at: http://localhost:5000"
