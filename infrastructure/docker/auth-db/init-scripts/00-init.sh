#!/bin/bash
set -e

# Function to create tables
create_tables() {
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id),
            token TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL
        );
EOSQL
}

# Function to insert sample data
insert_sample_data() {
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        -- Insert a test user (password is 'test123')
        INSERT INTO users (email, password_hash, full_name)
        VALUES ('test@example.com', '\$2b\$10\$rMt4bd6YnK4LM/yfuGNyZeD8gZzPxPyxJJwYS4qxPMXqTqH2kNZQy', 'Test User')
        ON CONFLICT (email) DO NOTHING;
EOSQL
}

# Main initialization logic
echo "Database initialization mode: $INIT_MODE"

if [ "$INIT_MODE" = "reset" ]; then
    echo "Creating fresh tables..."
    create_tables
elif [ "$INIT_MODE" = "preserve" ]; then
    echo "Creating tables if they don't exist and preserving data..."
    create_tables
    insert_sample_data
fi