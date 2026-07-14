-- Database initialization script for PostgreSQL
-- This runs automatically on first container startup

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log initialization
SELECT now() as initialization_time, 'Database initialized' as status;
