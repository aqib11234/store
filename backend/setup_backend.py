#!/usr/bin/env python3
"""
Setup script for Django backend
"""
import os
import sys
import subprocess

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed")
        print(f"Error: {e.stderr}")
        return False

def main():
    print("🚀 Setting up Django Backend for Store Application")
    print("=" * 50)
    
    # Check if we're in the backend directory
    if not os.path.exists('manage.py'):
        print("❌ Please run this script from the backend directory")
        sys.exit(1)
    
    # Install dependencies
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        print("❌ Failed to install dependencies. Please check your Python environment.")
        sys.exit(1)
    
    # Make migrations
    if not run_command("python manage.py makemigrations", "Creating database migrations"):
        print("❌ Failed to create migrations")
        sys.exit(1)
    
    # Apply migrations
    if not run_command("python manage.py migrate", "Applying database migrations"):
        print("❌ Failed to apply migrations. Please check your PostgreSQL connection.")
        print("Make sure PostgreSQL is running and the database 'store_db' exists.")
        sys.exit(1)
    
    # Create superuser (optional)
    print("\n🔐 Creating Django superuser...")
    print("You can skip this by pressing Ctrl+C")
    try:
        subprocess.run("python manage.py createsuperuser", shell=True, check=True)
        print("✅ Superuser created successfully")
    except (subprocess.CalledProcessError, KeyboardInterrupt):
        print("⏭️  Skipped superuser creation")
    
    # Populate sample data
    if not run_command("python manage.py populate_data", "Populating sample data"):
        print("⚠️  Failed to populate sample data, but this is not critical")
    
    print("\n🎉 Backend setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Make sure PostgreSQL is running")
    print("2. Update the .env file with your database credentials")
    print("3. Run: python manage.py runserver")
    print("4. Your API will be available at: http://localhost:8000/api/")
    print("5. Admin panel: http://localhost:8000/admin/")

if __name__ == "__main__":
    main()
