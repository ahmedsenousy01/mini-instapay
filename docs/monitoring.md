# End-to-End Monitoring with Prometheus, Grafana, and Loki

This document outlines the roadmap for adding comprehensive monitoring to every microservice in the mini-instapay application. The process is divided into several phases, covering instrumentation, packaging, deployment of the monitoring stack, and creation of dashboards and alerts.

## 1. Instrumentation (per‐service)

For each microservice:

a. **Choose and install a Prometheus client library** suitable for the service's programming language (e.g., `prom-client` for Node.js/TypeScript, `prometheus_client` for Python, `micrometer-registry-prometheus` for Java/Spring Boot). \* Example for Node.js/TypeScript: `npm install prom-client`

b. **Expose a `/metrics` HTTP endpoint** in each service's `src/` directory:
_ This endpoint should be served by the Prometheus client library.
_ **Default Metrics:** Expose default process metrics provided by the client library (e.g., heap usage, CPU utilization, garbage collection statistics).
_ **HTTP Request Metrics:** Expose counters and histograms for HTTP requests, including status codes, request durations, and request counts.
_ **Business-Specific Metrics:** Define and expose any custom gauges, counters, or histograms relevant to the service's business logic (e.g., `transactions_processed_total`, `active_users_gauge`).

c. **Switch to structured logging (JSON format)** if not already implemented. This is crucial for Loki to effectively parse, index, and query log fields. Ensure timestamps, log levels, and relevant context are included in the JSON output.

d. **Update Dockerfile:**
_ Ensure the Dockerfile (typically located in `infrastructure/docker/` or within the service's directory) `EXPOSE`s the new metrics port (e.g., `9180`).
_ Set appropriate environment variables for production, such as `NODE_ENV=production`.

## 2. Packaging & Deployment Manifests (Kubernetes)

a. **Choose a manifest management strategy:** Helm charts are recommended for managing Kubernetes manifests due to their templating and release management capabilities. Alternatively, raw Kubernetes YAML files can be used. All manifests should reside under `infrastructure/k8s/`.

b. **For each microservice, update/create Kubernetes manifests:**
_ **Service for Metrics:** Define a Kubernetes `Service` that exposes the `/metrics` port (e.g., port `9180`).
_ **Prometheus Scrape Annotations/ServiceMonitor:**
_ **Option 1 (Annotations):** Add annotations to the `Deployment` or `Pod` template metadata to enable Prometheus to discover and scrape the metrics endpoint.
`yaml
            # Example annotations for a Pod/Deployment
            # metadata:
            #   annotations:
            #     prometheus.io/scrape: "true"
            #     prometheus.io/path: "/metrics"
            #     prometheus.io/port: "9180" # Or your chosen metrics port
            `
_ **Option 2 (ServiceMonitor):** If using the Prometheus Operator, plan to create a `ServiceMonitor` custom resource (see step 3.c). \* **Standardized Labels:** Apply consistent labels to all pods for easier selection and grouping in Prometheus and Grafana (e.g., `app: <service-name>`, `team: instapay`, `environment: <dev/staging/prod>`).

c. **Version Control:** Commit all new and modified Kubernetes manifests to Git.

## 3. Provision the Monitoring Stack (infrastructure/k8s/)

This involves setting up Prometheus, Alertmanager, Loki, and Promtail/FluentBit within your Kubernetes cluster.

a. **Install Prometheus Operator:**
_ The recommended way is using the `kube-prometheus-stack` Helm chart, which bundles Prometheus, Grafana, Alertmanager, and the Prometheus Operator.
_ Alternatively, you can install the Prometheus Operator manually by applying its upstream CRDs and Deployment manifests.

b. **Create `Prometheus` Custom Resource (CR):**
_ Define a `Prometheus` CR to configure your Prometheus instance(s).
_ Specify global settings like scrape interval, evaluation interval, external labels, and persistent storage configuration (retention, resource limits). \* Configure `serviceMonitorSelector` or `podMonitorSelector` to tell Prometheus which `ServiceMonitors` or `PodMonitors` to use for discovering targets.

c. **Create `ServiceMonitor` (or `PodMonitor`) CRs:**
_ For each microservice, create a `ServiceMonitor` CR (if using the Prometheus Operator and you opted for this in 2.b).
_ This CR tells Prometheus how to find and scrape the metrics endpoints for a set of services.
_ It should specify:
_ A `selector` to match the labels of the Kubernetes `Service` exposing the metrics. \* The `endpoints` configuration, including the port name (e.g., `metrics`), path (e.g., `/metrics`), and interval.

d. **Install and Configure Alertmanager:**
_ Alertmanager is usually included with the `kube-prometheus-stack` Helm chart.
_ Define an `AlertmanagerConfig` CR (or update the configuration provided by the Helm chart).
_ Configure:
_ **Routes:** Define how alerts are grouped and routed.
_ **Receivers:** Specify notification channels (e.g., Slack, email, PagerDuty) and their configurations.
_ **Inhibition Rules:** (Optional) Define rules to suppress redundant alerts.

e. **Install Loki:**
_ Deploy Loki, typically as a `StatefulSet`, for log aggregation.
_ **Storage:** Configure a persistent storage backend for Loki (e.g., a `PersistentVolumeClaim` (PVC), or cloud storage like AWS S3, Google Cloud Storage). \* Ensure a Kubernetes `Service` exposes Loki (default port `3100`).

f. **Deploy Promtail (or FluentBit/Fluentd) as a Log Collection Agent:**
_ Deploy Promtail (or another log shipper like FluentBit) as a `DaemonSet` on each node in your Kubernetes cluster.
_ **Configuration:**
_ Configure it to tail container logs, typically from `/var/log/containers/_.log` on the nodes.
        *   Use Kubernetes discovery to automatically enrich logs with metadata like pod name, namespace, labels (`app`, `container`, etc.).
        *   Define relabeling rules if necessary to format log streams or add/modify labels.
        *   Configure the agent to send logs to your Loki service endpoint (e.g., `http://loki.<namespace>.svc.cluster.local:3100/loki/api/v1/push`).

## 4. Grafana, Dashboards & Alerting

a. **Deploy Grafana:**
_ Grafana is usually included with the `kube-prometheus-stack` Helm chart. If not, deploy it via its own Helm chart or Kubernetes manifests (Deployment + Service).
_ Ensure it's accessible (e.g., via an Ingress or LoadBalancer Service).

b. **Add Data Sources in Grafana:**
_ **Prometheus:** Configure a Prometheus data source pointing to your Prometheus service (e.g., `http://prometheus-operated.<namespace>.svc.cluster.local:9090` or the name given by the Helm chart).
_ **Loki:** Configure a Loki data source pointing to your Loki service (e.g., `http://loki.<namespace>.svc.cluster.local:3100`).

c. **Create and Version-Control Dashboards:**
_ **Provisioning:** Use Grafana's dashboard provisioning feature to manage dashboards as code. Store dashboard JSON models in `ConfigMaps` and label them so Grafana discovers them automatically. These ConfigMaps can be part of your Helm charts or k8s manifests under `infrastructure/k8s/grafana/dashboards/`.
_ **Import Community Dashboards:** Leverage existing community dashboards for common components like Node.js, NGINX, PostgreSQL, Kubernetes cluster health, etc.
_ **Build Custom Dashboards:** Create dashboards tailored to your application, visualizing:
_ Key service metrics: Request rates (RPS), latencies (e.g., p95, p99), error rates (per HTTP status code, per service).
_ Resource usage: Pod/container CPU and memory usage, network I/O.
_ Business metrics: `transactions_processed_total`, active users, queue lengths, etc. \* Correlate metrics with logs: Add Logs panels (using the Loki data source) to dashboards to show logs relevant to the selected time range and filters, enabling quick correlation between metrics spikes and log entries.

d. **Define Alerting Rules in Prometheus:**
_ Create `PrometheusRule` CRDs to define alerting rules (if using the Prometheus Operator).
_ Common alerts to define:
_ High error rates (e.g., 5xx status codes exceeding a certain threshold).
_ High request latency (e.g., p95 latency > X ms).
_ Service down/unavailability (e.g., `up` metric is 0 for a certain duration, or no scrapes for > Y minutes).
_ Resource exhaustion (e.g., CPU/memory usage consistently high).
_ Business metric anomalies (e.g., transaction volume drops unexpectedly).
_ These rules will be evaluated by Prometheus, and if triggered, alerts will be sent to Alertmanager.

## 5. CI/CD & Documentation

a. **Update Documentation:**
_ Maintain this `docs/monitoring.md` document.
_ Add details on:
_ How to run the monitoring stack locally (e.g., using `kind` or `minikube` along with `helm install` commands).
_ Procedures for updating dashboards or adding new ones. \* Guidelines for developers on how to add new metrics or alerts for their services.

b. **CI/CD Pipeline Integration:**
_ Add steps to your CI/CD pipeline to:
_ Lint/validate Kubernetes YAML and Helm charts (`kubeval`, `helm lint`). \* (Optional) Test that dashboards can be imported into a test Grafana instance.

c. **Helm Chart Repository (Optional):** \* If using Helm, consider packaging your application and monitoring stack configurations into a private Helm chart repository for better versioning and reproducible deployments.

## 6. Validation & Rollout

a. **Test Environment:**
_ Set up a dedicated test or staging namespace in your Kubernetes cluster.
_ Deploy the complete monitoring stack (Prometheus, Grafana, Loki, etc.) and a few representative microservices instrumented with metrics and logging.

b. **Verification:**
_ **Prometheus Targets:** Check the Prometheus UI (Targets page) to ensure all instrumented services and their `/metrics` endpoints are discovered and successfully scraped (`UP`).
_ **Grafana Data:** Verify that you can query metrics from Prometheus and logs from Loki in Grafana. Test existing and newly created dashboards. \* **Alerting Pipeline:** Trigger sample alerts (e.g., by intentionally causing errors in a service, scaling down a deployment to 0 replicas, or using `curl` to send a test alert to Alertmanager) to ensure they are routed correctly and notifications are received via the configured channels (Slack, email).

c. **Phased Rollout:** \* Once thoroughly validated in the test/staging environment, plan a phased rollout to production namespaces. Monitor closely during and after the rollout.

This plan provides a comprehensive approach to establishing a robust monitoring system. Each step will require careful consideration of your specific application architecture and requirements.
