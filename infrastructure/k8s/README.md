# Kubernetes Configuration

This directory contains all Kubernetes manifests and configurations for the Mini-InstaPay application.

## Directory Structure

- `base/`: Base configurations and jobs

  - `db-service-job.yaml`: Database migration and setup job

- `database/`: Database configurations

  - `postgres.yaml`: PostgreSQL deployment and service

- `ingress/`: Ingress configurations

  - `ingress.yaml`: Main application ingress rules
  - `cluster-issuer.yaml`: Cert-manager cluster issuer

- `monitoring/`: Monitoring stack

  - See monitoring/README.md for details

- `scripts/`: Deployment scripts

  - `deploy.sh`: Main deployment script
  - `setup-k8s-secrets.sh`: Script to set up Kubernetes secrets

- `security/`: Security configurations

  - `secrets.yaml`: Application secrets

- `services/`: Service deployments
  - `api-gateway.yaml`: API Gateway service
  - `transaction-service.yaml`: Transaction service
  - `reporting-service.yaml`: Reporting service
  - `notification-service.yaml`: Notification service
  - `frontend.yaml`: Frontend application

## Prerequisites

- Kubernetes cluster (v1.20+)
- kubectl configured to access your cluster
- Helm v3
- cert-manager installed for TLS
- Ingress controller (nginx)

## Deployment

1. Set up secrets:

```bash
./scripts/setup-k8s-secrets.sh
```

2. Deploy the application:

```bash
./scripts/deploy.sh
```

3. Deploy individual components:

```bash
# Deploy base configurations
kubectl apply -f base/

# Deploy database
kubectl apply -f database/

# Deploy services
kubectl apply -f services/

# Deploy ingress
kubectl apply -f ingress/

# Deploy monitoring
kubectl apply -f monitoring/
```

## Monitoring

The monitoring stack can be deployed separately:

```bash
kubectl apply -f monitoring/
```

See `monitoring/README.md` for more details about the monitoring setup.
