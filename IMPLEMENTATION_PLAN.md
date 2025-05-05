# Mini-InstaPay Implementation Plan

## 1. Project Overview

**Objective:**
Mini-InstaPay is a secure, scalable, and user-friendly digital money transfer platform enabling instant money sending and receiving, balance management, transaction history tracking, and basic reporting.

**Scope:**

- Containerize each service using Docker
- Define multiple environments (Development, Staging, Production) via Docker Compose
- Orchestrate services with Kubernetes
- Provide comprehensive documentation, monitoring, and logging

## 2. Architecture

### 2.1 Microservices

- **User Management Service**: Profile management (user data, preferences)
- **Auth Service**: Custom authentication server for registration, login, JWT/OAuth2 issuance, and session management
- **Transaction Service**: Send/receive money, update balances, transaction logs
- **Reporting Service**: Analyze account usage, generate transaction summaries
- **Notification Service**: Send email/SMS/push notifications on events
- **(Optional) Analytics Service**: Gather metrics and usage data
- **API Gateway**: Custom-built gateway for unified RESTful API, routing, authentication checks, and rate limiting

### 2.2 Communication

- Frontend ⇄ API Gateway over HTTPS
- API Gateway ⇄ Microservices (HTTP/REST)
- Services ⇄ Database (PostgreSQL)
- Internal metrics: Prometheus scraping endpoints

### 2.3 Data Storage

- **Primary Database**: PostgreSQL for transactional data
- **Time-series DB**: Prometheus for metrics
- **Logging**: Loki for log aggregation

## 3. Technology Stack

| Layer            | Technology                                                   |
| ---------------- | ------------------------------------------------------------ |
| Frontend         | React + TypeScript                                           |
| API Gateway      | Custom Node.js + Express Gateway                             |
| Auth Service     | Node.js + Express (TS), JWT/OAuth2                           |
| Services         | Node.js + Express (TS)                                       |
| Database         | PostgreSQL                                                   |
| Containerization | Docker                                                       |
| Orchestration    | Kubernetes (+ Helm)                                          |
| CI/CD            | GitHub Actions                                               |
| Observability    | Prometheus (metrics) + Loki (logs) + Grafana (visualization) |

## 4. Repository & Directory Layout

```
/mini-instapay
│
├─ /services
│  ├─ /user-service
│  ├─ /auth-service
│  ├─ /api-gateway
│  ├─ /transaction-service
│  ├─ /reporting-service
│  └─ /notification-service
│
├─ /frontend
│
├─ /infrastructure
│  ├─ /docker
│  │  ├─ Dockerfile.base
│  │  ├─ docker-compose.dev.yml
│  │  ├─ docker-compose.staging.yml
│  │  └─ docker-compose.prod.yml
│  └─ /k8s
│     ├─ namespaces.yaml
│     ├─ user-service-deployment.yaml
│     ├─ auth-service-deployment.yaml
│     ├─ api-gateway-deployment.yaml
│     ├─ transaction-service-deployment.yaml
│     ├─ reporting-service-deployment.yaml
│     ├─ notification-service-deployment.yaml
│     └─ ingress.yaml
│
├─ /docs
│  └─ API_REFERENCE.md
│
├─ .github/workflows
│  └─ ci-cd-pipeline.yml
│
└─ README.md
```

## 5. Containerization

### 5.1 Dockerfiles

- **Multi-stage builds** per service to optimize image size
- Common base image (e.g., `node:16-alpine`)
- Separate dev and prod targets

### 5.2 Docker Compose

- `docker-compose.dev.yml`: mount code, use dev dependencies, hot reload
- `docker-compose.staging.yml` & `docker-compose.prod.yml`: no mounts, environment variables, secrets
- Shared network `instapay-net` for inter-service communication

## 6. Kubernetes Orchestration

### 6.1 Namespace and Config

- Create `instapay` namespace
- Use ConfigMaps and Secrets for environment-specific configuration

### 6.2 Deployments & Services

- One `Deployment` + `Service` per microservice
- Liveness and readiness probes
- Resource requests/limits

### 6.3 Ingress

- Ingress controller (NGINX) to route external traffic to API Gateway
- TLS via cert-manager

## 7. CI/CD Pipeline

- **Build**: lint, test, build Docker images
- **Push**: tag and push images to Docker registry (Docker Hub/GCR)
- **Deploy**: apply k8s manifests to dev/staging/production clusters
- **Rollback**: automated rollback on failed health checks

## 8. Documentation

- **README.md**: project overview, setup, local dev
- **API_REFERENCE.md**: endpoints, request/response schemas, auth
- **CONTRIBUTING.md**: development workflow, code standards
- **K8S_GUIDE.md**: instructions for deploying to k8s

## 9. Monitoring & Logging

- **Prometheus**

  - Scrape `/metrics` endpoints from all services
  - Store time-series metrics data
  - Handle alerting rules

- **Loki**

  - Collect container logs (stdout/stderr)
  - Label-based log querying
  - Efficient log storage and indexing

- **Grafana**
  - Unified dashboards for metrics and logs
  - Prometheus data source for metrics visualization
  - Loki data source for log querying and exploration
  - Alert management UI

## 10. Security & Best Practices

- JWT-based authentication and authorization
- HTTPS everywhere (Let's Encrypt)
- Secrets management (Kubernetes Secrets or Vault)
