#!/usr/bin/env python3
"""
Complete setup script for Store Management System
"""
import os
import sys
import subprocess
import platform

def run_command(command, description, cwd=None):
    """Run a command and handle errors"""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            check=True, 
            capture_output=True, 
            text=True,
            cwd=cwd
        )
        print(f"✅ {description} completed successfully")
        if result.stdout.strip():
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed")
        print(f"Error: {e.stderr}")
        return False

def check_prerequisites():
    """Check if required software is installed"""
    print("🔍 Checking prerequisites...")
    
    # Check Python
    try:
        python_version = subprocess.check_output([sys.executable, "--version"], text=True).strip()
        print(f"✅ {python_version}")
    except:
        print("❌ Python not found")
        return False
    
    # Check Node.js
    try:
        node_version = subprocess.check_output(["node", "--version"], text=True).strip()
        print(f"✅ Node.js {node_version}")
    except:
        print("❌ Node.js not found. Please install Node.js v18 or higher")
        return False
    
    # Check PostgreSQL
    try:
        pg_version = subprocess.check_output(["psql", "--version"], text=True).strip()
        print(f"✅ {pg_version}")
    except:
        print("⚠️  PostgreSQL not found in PATH. Make sure it's installed and running")
    
    return True

def setup_backend():
    """Setup Django backend"""
    print("\n🐍 Setting up Django Backend...")
    
    backend_dir = "backend"
    if not os.path.exists(backend_dir):
        print(f"❌ Backend directory '{backend_dir}' not found")
        return False
    
    # Install Python dependencies
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies", backend_dir):
        return False
    
    # Create .env file if it doesn't exist
    env_file = os.path.join(backend_dir, ".env")
    if not os.path.exists(env_file):
        print("📝 Creating .env file...")
        with open(env_file, "w") as f:
            f.write("""DEBUG=True
SECRET_KEY=django-insecure-u#e06^5+9sgs3$*m6q%tt83=b8d@hs*p5h@or6eguaw3y_x$_f
DATABASE_NAME=store_db
DATABASE_USER=postgres
DATABASE_PASSWORD=password123
DATABASE_HOST=localhost
DATABASE_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
""")
        print("✅ Created .env file")
    
    # Run migrations
    if not run_command("python manage.py makemigrations", "Creating database migrations", backend_dir):
        return False
    
    if not run_command("python manage.py migrate", "Applying database migrations", backend_dir):
        print("❌ Database migration failed. Please ensure PostgreSQL is running and the database 'store_db' exists.")
        print("Create database with: CREATE DATABASE store_db;")
        return False
    
    # Populate sample data
    if not run_command("python manage.py populate_data", "Populating sample data", backend_dir):
        print("⚠️  Sample data population failed, but this is not critical")
    
    return True

def setup_frontend():
    """Setup Next.js frontend"""
    print("\n⚛️  Setting up Next.js Frontend...")
    
    frontend_dir = "store"
    if not os.path.exists(frontend_dir):
        print(f"❌ Frontend directory '{frontend_dir}' not found")
        return False
    
    # Install Node.js dependencies
    if not run_command("npm install", "Installing Node.js dependencies", frontend_dir):
        return False
    
    # Create .env.local file if it doesn't exist
    env_file = os.path.join(frontend_dir, ".env.local")
    if not os.path.exists(env_file):
        print("📝 Creating .env.local file...")
        with open(env_file, "w") as f:
            f.write("NEXT_PUBLIC_API_URL=http://localhost:8000/api\n")
        print("✅ Created .env.local file")
    
    return True

def main():
    """Main setup function"""
    print("🚀 Store Management System Setup")
    print("=" * 50)
    
    # Check prerequisites
    if not check_prerequisites():
        print("\n❌ Prerequisites check failed. Please install missing software.")
        sys.exit(1)
    
    # Setup backend
    if not setup_backend():
        print("\n❌ Backend setup failed.")
        sys.exit(1)
    
    # Setup frontend
    if not setup_frontend():
        print("\n❌ Frontend setup failed.")
        sys.exit(1)
    
    # Success message
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Start the backend server:")
    print("   cd backend")
    print("   python manage.py runserver")
    print("\n2. In a new terminal, start the frontend server:")
    print("   cd store")
    print("   npm run dev")
    print("\n3. Open your browser:")
    print("   Frontend: http://localhost:3000")
    print("   Backend API: http://localhost:8000/api/")
    print("   Admin Panel: http://localhost:8000/admin/")
    print("\n🔐 Create a Django superuser to access the admin panel:")
    print("   cd backend")
    print("   python manage.py createsuperuser")

if __name__ == "__main__":
    main()
