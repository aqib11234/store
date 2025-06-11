#!/usr/bin/env python3
"""
Script to migrate from SQLite to PostgreSQL
"""
import os
import sys
import subprocess
import django
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'store_backend.settings')
django.setup()

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
            cwd=cwd or backend_dir
        )
        print(f"✅ {description} completed successfully")
        if result.stdout.strip():
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed")
        print(f"Error: {e.stderr}")
        return False

def main():
    print("🐘 Migrating to PostgreSQL Database")
    print("=" * 50)
    
    print("\n📋 Prerequisites:")
    print("1. PostgreSQL server is running")
    print("2. Database 'store_db' is created")
    print("3. User 'store_user' has permissions")
    print("\nIf not done, run these PostgreSQL commands:")
    print("CREATE DATABASE store_db;")
    print("CREATE USER store_user WITH PASSWORD 'store_password123';")
    print("GRANT ALL PRIVILEGES ON DATABASE store_db TO store_user;")
    print("ALTER USER store_user CREATEDB;")
    
    input("\nPress Enter to continue after setting up PostgreSQL...")
    
    # Test database connection
    print("\n🔍 Testing PostgreSQL connection...")
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print("✅ PostgreSQL connection successful")
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        print("\nPlease check:")
        print("- PostgreSQL is running")
        print("- Database credentials are correct")
        print("- Database 'store_db' exists")
        sys.exit(1)
    
    # Remove old migrations (optional)
    migrations_dir = backend_dir / "inventory" / "migrations"
    migration_files = list(migrations_dir.glob("0*.py"))
    if migration_files:
        print(f"\n🗑️  Found {len(migration_files)} existing migration files")
        response = input("Remove old migrations? (y/N): ").lower()
        if response == 'y':
            for migration_file in migration_files:
                migration_file.unlink()
                print(f"Removed: {migration_file.name}")
    
    # Create fresh migrations
    if not run_command("python manage.py makemigrations", "Creating fresh migrations"):
        sys.exit(1)
    
    # Apply migrations
    if not run_command("python manage.py migrate", "Applying migrations to PostgreSQL"):
        sys.exit(1)
    
    # Populate sample data
    if not run_command("python manage.py populate_data", "Populating sample data"):
        print("⚠️  Sample data population failed, but this is not critical")
    
    # Create superuser prompt
    print("\n🔐 Create Django superuser for admin access:")
    try:
        subprocess.run("python manage.py createsuperuser", shell=True, cwd=backend_dir)
        print("✅ Superuser created successfully")
    except KeyboardInterrupt:
        print("⏭️  Skipped superuser creation")
    
    print("\n🎉 PostgreSQL migration completed successfully!")
    print("\n📋 Next steps:")
    print("1. Restart your Django server: python manage.py runserver")
    print("2. Test the application at: http://localhost:3000")
    print("3. Access admin panel at: http://127.0.0.1:8000/admin/")
    print("\n💡 Your data is now stored in PostgreSQL!")

if __name__ == "__main__":
    main()
