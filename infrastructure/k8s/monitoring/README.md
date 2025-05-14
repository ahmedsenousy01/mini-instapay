# Monitoring Configuration

This directory contains the Kubernetes configuration files for the monitoring stack of Mini-InstaPay application.

## Files

- `grafana-dashboard-config.yaml`: ConfigMap containing Grafana dashboard configurations
- `monitoring-ingress.yaml`: Ingress configuration for monitoring services
- `prometheus-additional-scrape-config.yaml`: Additional scrape configurations for Prometheus
- `prometheus-values.yaml`: Values override file for Prometheus Helm chart

## Components

The monitoring stack consists of:

- Prometheus for metrics collection and storage
- Grafana for metrics visualization
- Node Exporter for hardware and OS metrics
- Kube State Metrics for Kubernetes cluster metrics

## Metrics

The following metrics are collected:

- Transaction metrics (count, amount, duration)
- Account balance metrics
- Error metrics
- Node metrics
- Kubernetes cluster metrics

## Access

- Grafana UI: http://localhost:3000
- Prometheus UI: http://localhost:9090

## Setup

1. Apply the monitoring configurations:

```bash
kubectl apply -f infrastructure/k8s/monitoring/
```

2. Install Prometheus using Helm:

```bash
helm install prometheus prometheus-community/kube-prometheus-stack -f infrastructure/k8s/monitoring/prometheus-values.yaml -n monitoring
```

3. Access the dashboards using port-forwarding:

```bash
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 -n monitoring
```
