#!/bin/bash
set -euo pipefail

# Source environment variables
set -o allexport
source .env
set +o allexport

# Function to create or update a secret
create_or_update_secret() {
    local name=$1
    shift
    local args=("$@")

    # Delete existing secret if it exists
    minikube kubectl -- delete secret "$name" --ignore-not-found

    # Create new secret
    minikube kubectl -- create secret generic "$name" "${args[@]}"
}

# Create Clerk secrets
create_or_update_secret "clerk-secrets" \
    --from-literal=CLERK_SECRET_KEY="$CLERK_SECRET_KEY" \
    --from-literal=NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$CLERK_PUBLISHABLE_KEY"

# Create DB secrets
create_or_update_secret "db-secrets" \
    --from-literal=database-url="$DATABASE_URL" \
    --from-literal=database-name="$POSTGRES_DB" \
    --from-literal=username="$POSTGRES_USER" \
    --from-literal=password="$POSTGRES_PASSWORD"

# Create email secrets
create_or_update_secret "email-secrets" \
    --from-literal=sending-email="$SENDING_EMAIL" \
    --from-literal=google-email="$GOOGLE_EMAIL" \
    --from-literal=google-app-password="$GOOGLE_APP_PASSWORD"

echo "✅ Kubernetes secrets created successfully"