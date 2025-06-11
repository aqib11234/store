-- PostgreSQL Setup Commands for Store Management System
-- Run these commands in PostgreSQL shell (psql -U postgres)

-- Create database
CREATE DATABASE store_db;

-- Create user with password
CREATE USER store_user WITH PASSWORD 'store_password123';

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE store_db TO store_user;

-- Grant additional permissions for Django
ALTER USER store_user CREATEDB;

-- Connect to the database
\c store_db;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO store_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO store_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO store_user;

-- Set default privileges for future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO store_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO store_user;

-- Display confirmation
SELECT 'PostgreSQL setup completed successfully!' AS status;
