# Infrastructure

This directory contains all infrastructure-related configurations for the Mini-InstaPay application.

## Directory Structure

```
infrastructure/
├── docker/             # Docker compose files for different environments
│   ├── docker-compose.dev.yml
│   ├── docker-compose.staging.yml
│   └── docker-compose.prod.yml
└── k8s/               # Kubernetes manifests and configurations
    ├── base/          # Base configurations and jobs
    ├── database/      # Database-related configurations
    ├── ingress/       # Ingress and cert-manager configurations
    ├── monitoring/    # Prometheus and Grafana configurations
    ├── scripts/       # Deployment and setup scripts
    ├── security/      # Secrets and security configurations
    └── services/      # Service-specific deployments
```

## Docker

The `docker` directory contains Docker Compose files for different environments:

- `docker-compose.dev.yml`: Development environment setup
- `docker-compose.staging.yml`: Staging environment setup
- `docker-compose.prod.yml`: Production environment setup

## Kubernetes

The `k8s` directory contains all Kubernetes-related configurations:

- `base/`: Contains base configurations and jobs like database migrations
- `database/`: Database-related configurations including PostgreSQL deployment
- `ingress/`: Ingress controllers and TLS certificate configurations
- `monitoring/`: Prometheus and Grafana setup for monitoring
- `scripts/`: Deployment and setup scripts
- `security/`: Secrets and security-related configurations
- `services/`: Individual service deployments

## Usage

1. For local development:

```bash
docker-compose -f docker/docker-compose.dev.yml up
```

2. For Kubernetes deployment:

```bash
./k8s/scripts/deploy.sh
```

See individual directory READMEs for more detailed information.
