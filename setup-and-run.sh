#!/bin/bash

# Store Management System - One-Click Setup and Run Script
# This script will clone, setup, and run the entire project

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install dependencies on different systems
install_dependencies() {
    print_status "Checking and installing dependencies..."
    
    # Check for Git
    if ! command_exists git; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    # Check for Python
    if ! command_exists python3 && ! command_exists python; then
        print_error "Python is not installed. Please install Python 3.8+ first."
        exit 1
    fi
    
    # Check for Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 16+ first."
        exit 1
    fi
    
    # Check for npm
    if ! command_exists npm; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check for pip
    if ! command_exists pip3 && ! command_exists pip; then
        print_warning "pip not found. Attempting to install..."
        if command_exists python3; then
            python3 -m ensurepip --upgrade
        else
            python -m ensurepip --upgrade
        fi
    fi
    
    print_success "All dependencies are available!"
}

# Function to setup Python virtual environment
setup_python_env() {
    print_status "Setting up Python virtual environment..."
    
    cd backend
    
    # Create virtual environment
    if command_exists python3; then
        python3 -m venv venv
    else
        python -m venv venv
    fi
    
    # Activate virtual environment
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi
    
    # Install Python dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Run migrations
    print_status "Setting up database..."
    python manage.py migrate
    
    # Create superuser (optional)
    print_status "Creating admin user (optional - press Ctrl+C to skip)..."
    python manage.py createsuperuser --noinput --username admin --email admin@example.com || true
    
    cd ..
    print_success "Backend setup completed!"
}

# Function to setup Node.js environment
setup_node_env() {
    print_status "Setting up Node.js environment..."
    
    cd store
    
    # Install Node.js dependencies
    print_status "Installing Node.js dependencies..."
    npm install
    
    cd ..
    print_success "Frontend setup completed!"
}

# Function to start the application
start_application() {
    print_status "Starting the application..."
    
    # Start backend in background
    print_status "Starting Django backend..."
    cd backend
    
    # Activate virtual environment
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        source venv/Scripts/activate
    else
        source venv/bin/activate
    fi
    
    python manage.py runserver 127.0.0.1:8000 &
    BACKEND_PID=$!
    cd ..
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend
    print_status "Starting Next.js frontend..."
    cd store
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    # Print success message
    print_success "🎉 Application is starting up!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 STORE MANAGEMENT SYSTEM IS RUNNING!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📱 Frontend (Main App): http://localhost:3000"
    echo "🔧 Backend API:         http://localhost:8000"
    echo "👤 Admin Panel:         http://localhost:8000/admin"
    echo ""
    echo "🎯 Features Available:"
    echo "   • Dashboard & Analytics"
    echo "   • Product Management"
    echo "   • POS System"
    echo "   • Invoice Generation"
    echo "   • Customer Management"
    echo ""
    echo "⚠️  Press Ctrl+C to stop both servers"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Wait for user to stop
    trap 'print_status "Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT
    wait
}

# Main execution
main() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🏪 STORE MANAGEMENT SYSTEM - AUTO SETUP"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Check if project already exists
    if [ -d "store" ] && [ -d "backend" ]; then
        print_status "Project already exists. Skipping clone..."
    else
        print_status "Cloning project from GitHub..."
        git clone https://github.com/aqib11234/store.git temp_store
        mv temp_store/* .
        mv temp_store/.* . 2>/dev/null || true
        rmdir temp_store
        print_success "Project cloned successfully!"
    fi
    
    # Install dependencies
    install_dependencies
    
    # Setup backend
    if [ ! -d "backend/venv" ]; then
        setup_python_env
    else
        print_status "Backend already setup. Skipping..."
    fi
    
    # Setup frontend
    if [ ! -d "store/node_modules" ]; then
        setup_node_env
    else
        print_status "Frontend already setup. Skipping..."
    fi
    
    # Start application
    start_application
}

# Run main function
main "$@"
