#!/bin/bash

# Script to set up local PostgreSQL database for signal2
# This creates a dedicated database for local development

set -e

DB_NAME="signal2"
DB_USER="signal2_user"
DB_PASSWORD="signal2_local_dev"
DB_HOST="localhost"
DB_PORT="5432"

# Try to connect to PostgreSQL
# First, try with the existing user from .env
EXISTING_USER="intellimap"
EXISTING_PASSWORD="Mands2002!"

echo "=== Setting up local signal2 database ==="

# Check if we can connect to PostgreSQL
if command -v psql &> /dev/null; then
    echo "Using psql to create database..."
    
    # Try to create database (will fail if it exists, which is fine)
    PGPASSWORD="$EXISTING_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$EXISTING_USER" -d postgres <<EOF 2>&1 || true
-- Create database if it doesn't exist
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Create user if it doesn't exist
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF

    echo "✅ Database setup complete!"
    echo ""
    echo "New DATABASE_URL:"
    echo "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    
elif command -v docker &> /dev/null; then
    echo "psql not found. Checking if PostgreSQL is running in Docker..."
    
    # Check if there's a PostgreSQL container
    if docker ps | grep -q postgres; then
        echo "Found PostgreSQL container. Please run migrations manually."
    else
        echo "⚠️  PostgreSQL not found. Please install PostgreSQL or use Docker."
        echo ""
        echo "To use Docker, run:"
        echo "docker run --name signal2-postgres -e POSTGRES_PASSWORD=signal2_local_dev -e POSTGRES_USER=signal2_user -e POSTGRES_DB=signal2 -p 5432:5432 -d postgres:15"
    fi
else
    echo "⚠️  Neither psql nor docker found."
    echo "Please install PostgreSQL or use Docker to set up the database."
fi

