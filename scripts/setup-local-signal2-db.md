# Setting Up Local signal2 Database

## Current Configuration

The `.env` file has been updated to use:
- **Database**: `signal2`
- **User**: `signal2_user`
- **Password**: `Mands2002!`
- **Host**: `localhost`
- **Port**: `5432`

## Setup Options

### Option 1: Use Cloud SQL Proxy (Recommended for Development)

This connects to the production Cloud SQL database securely:

```bash
# Install Cloud SQL Proxy if not already installed
# macOS: brew install cloud-sql-proxy

# Start the proxy
cloud-sql-proxy signal2-479718:us-central1:signal2-db

# In another terminal, the DATABASE_URL in .env will work
# The proxy creates a Unix socket at /cloudsql/...
```

### Option 2: Create Local PostgreSQL Database

If you want a local database for development:

```bash
# Connect to PostgreSQL as superuser
psql -U postgres -h localhost

# Create database and user
CREATE DATABASE signal2;
CREATE USER signal2_user WITH PASSWORD 'Mands2002!';
GRANT ALL PRIVILEGES ON DATABASE signal2 TO signal2_user;

# Connect to the new database
\c signal2

# Grant schema privileges
GRANT ALL ON SCHEMA public TO signal2_user;
```

Then run migrations:
```bash
npm run db:push
```

### Option 3: Use Docker (Easiest for Clean Setup)

```bash
# Start PostgreSQL in Docker
docker run --name signal2-postgres \
  -e POSTGRES_USER=signal2_user \
  -e POSTGRES_PASSWORD=Mands2002! \
  -e POSTGRES_DB=signal2 \
  -p 5432:5432 \
  -d postgres:15

# Wait a few seconds for it to start, then run migrations
npm run db:push
```

## Verify Connection

After setup, verify the connection:

```bash
export $(cat .env | grep DATABASE_URL | xargs)
npx tsx scripts/check-db-schema.ts
```

## Important Notes

- The local database should match the Cloud SQL schema
- Run `npm run db:push` after creating the database to set up the schema
- The password matches Cloud SQL for consistency
- Never commit the `.env` file with real credentials

