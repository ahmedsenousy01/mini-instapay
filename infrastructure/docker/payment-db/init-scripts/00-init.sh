#!/bin/bash
set -e

# Function to create tables
create_tables() {
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS accounts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            currency CHAR(3) NOT NULL,
            balance NUMERIC(18,2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            from_account_id UUID REFERENCES accounts(id),
            to_account_id UUID REFERENCES accounts(id),
            amount NUMERIC(18,2) NOT NULL,
            currency CHAR(3) NOT NULL,
            status VARCHAR(20) NOT NULL,
            initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id BIGSERIAL PRIMARY KEY,
            service VARCHAR(50) NOT NULL,
            event VARCHAR(50) NOT NULL,
            payload JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
EOSQL
}

# Function to insert sample data
insert_sample_data() {
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        -- Insert a sample account
        INSERT INTO accounts (user_id, currency, balance)
        VALUES
            ('11111111-1111-1111-1111-111111111111', 'USD', 1000.00),
            ('22222222-2222-2222-2222-222222222222', 'USD', 500.00)
        ON CONFLICT DO NOTHING;

        -- Insert a sample transaction
        INSERT INTO transactions (from_account_id, to_account_id, amount, currency, status)
        SELECT
            (SELECT id FROM accounts LIMIT 1),
            (SELECT id FROM accounts OFFSET 1 LIMIT 1),
            100.00,
            'USD',
            'COMPLETED'
        WHERE EXISTS (SELECT 1 FROM accounts);
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