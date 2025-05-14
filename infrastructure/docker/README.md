# Docker Compose Configurations

This directory contains Docker Compose configurations for different environments of the Mini-InstaPay application.

## Files

- `docker-compose.dev.yml`: Development environment

  - Hot-reloading enabled
  - Debug ports exposed
  - Local volume mounts
  - Development-specific environment variables

- `docker-compose.staging.yml`: Staging environment

  - Production-like setup
  - Staging-specific configurations
  - Health checks enabled
  - Staging environment variables

- `docker-compose.prod.yml`: Production environment
  - Optimized for production
  - Resource limits set
  - Health checks enabled
  - Production environment variables

## Usage

### Development

```bash
docker-compose -f docker-compose.dev.yml up
```

### Staging

```bash
docker-compose -f docker-compose.staging.yml up -d
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Services

Each compose file includes:

- Frontend
- API Gateway
- Transaction Service
- Reporting Service
- Notification Service
- PostgreSQL Database
- Redis Cache

## Environment Variables

Each environment requires its own `.env` file. Copy the appropriate example:

```bash
cp .env.example .env.dev    # For development
cp .env.example .env.staging    # For staging
cp .env.example .env.prod    # For production
```

## Volumes

- Development: Uses local bind mounts for hot-reloading
- Staging/Production: Uses named volumes for persistence

## Networks

- Frontend network
- Backend network
- Database network

Each environment maintains isolation between different network segments.
