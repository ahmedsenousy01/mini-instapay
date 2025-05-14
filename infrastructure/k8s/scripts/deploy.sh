#!/bin/bash
set -euo pipefail

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
K8S_DIR="$(dirname "$SCRIPT_DIR")"

# Function to build and load an image
build_and_load_image() {
    local service=$1
    local tag="mini-instapay/$service:latest"

    echo "🏗️  Building $service image..."
    if [ "$service" = "frontend" ]; then
        docker build -t "$tag" "${K8S_DIR}/../../frontend"
    else
        docker build -t "$tag" "${K8S_DIR}/../../services/$service"
    fi

    # No need to load the image since we're using minikube's docker daemon
    echo "✅ Image $tag built successfully"
}

# Function to wait for Helm deployment
wait_for_helm_deployment() {
    local release=$1
    local namespace=$2
    local timeout=$3

    echo "⏳ Waiting for Helm release $release to be ready..."
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))

    while true; do
        if helm status "$release" -n "$namespace" | grep -q 'STATUS: deployed'; then
            echo "✅ Helm release $release is ready"
            return 0
        fi

        current_time=$(date +%s)
        if [ $current_time -gt $end_time ]; then
            echo "⚠️  Timeout waiting for Helm release $release"
            return 1
        fi

        echo "⏳ Waiting for Helm release $release..."
        sleep 5
    done
}

# Function to push database schema
push_database_schema() {
    echo "📊 Pushing database schema..."

    # Build db-service image
    echo "🏗️  Building db-service image..."
    build_and_load_image "db-service"

    # Delete any existing job
    minikube kubectl -- delete job db-schema-push --ignore-not-found

    # Apply the job
    echo "📊 Running schema push job..."
    minikube kubectl -- apply -f "${K8S_DIR}/base/db-service-job.yaml"

    # Wait for job completion
    echo "⏳ Waiting for schema push job to complete..."
    minikube kubectl -- wait --for=condition=complete job/db-schema-push --timeout=60s

    # Check job status
    if minikube kubectl -- get job db-schema-push -o jsonpath='{.status.succeeded}' | grep -q "1"; then
        echo "✅ Database schema pushed successfully"
    else
        echo "❌ Schema push failed. Job logs:"
        POD_NAME=$(minikube kubectl -- get pods -l job-name=db-schema-push -o jsonpath='{.items[0].metadata.name}')
        minikube kubectl -- logs $POD_NAME
        exit 1
    fi
}

wait_for_pods() {
    local app=$1
    local timeout=$2
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))

    echo "⏳ Waiting for $app pods to be ready..."
    while true; do
        current_time=$(date +%s)
        if [ $current_time -gt $end_time ]; then
            echo "⚠️  Timeout waiting for $app pods. Current status:"
            minikube kubectl -- get pods -l app=$app
            echo "📑 Pod logs:"
            POD_NAME=$(minikube kubectl -- get pods -l app=$app -o jsonpath='{.items[0].metadata.name}')
            if [ -n "$POD_NAME" ]; then
                minikube kubectl -- logs $POD_NAME
            fi
            return 1
        fi

        # Get pod status
        local pod_status
        pod_status=$(minikube kubectl -- get pods -l app=$app -o json)

        # Count ready and total pods using jq
        local ready_pods=0
        local total_pods=0

        if echo "$pod_status" | grep -q "items"; then
            total_pods=$(echo "$pod_status" | jq '.items | length')
            ready_pods=$(echo "$pod_status" | jq '[.items[] | select(.status.containerStatuses[0].ready==true)] | length')
        fi

        if [ "$ready_pods" -eq "$total_pods" ] && [ "$total_pods" -gt 0 ]; then
            echo "✅ All $ready_pods pods for $app are ready"
            return 0
        fi

        echo "⏳ Waiting for $app: $ready_pods/$total_pods pods ready..."
        sleep 5
    done
}

echo "🔄 Setting up minikube docker environment..."
eval $(minikube docker-env)

echo "📊 Setting up monitoring stack..."
# Create monitoring namespace
minikube kubectl -- create namespace monitoring --dry-run=client -o yaml | minikube kubectl -- apply -f -

# Add Helm repositories
echo "📦 Adding Helm repositories..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus Stack (includes Grafana)
echo "🚀 Installing Prometheus Stack..."
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
    --namespace monitoring \
    --create-namespace \
    --values "${K8S_DIR}/monitoring/values-override.yaml" \
    --set prometheus.prometheusSpec.additionalScrapeConfigsSecret.enabled=true \
    --set prometheus.prometheusSpec.additionalScrapeConfigsSecret.name=additional-scrape-configs \
    --set prometheus.prometheusSpec.additionalScrapeConfigsSecret.key=prometheus-additional-scrape-configs.yaml

# Wait for Prometheus Stack
wait_for_helm_deployment "prometheus" "monitoring" 300

# Apply AlertManager config
echo "⚡ Applying AlertManager configuration..."
minikube kubectl -- apply -f "${K8S_DIR}/monitoring/alertmanager-config.yaml"

echo "🏗️  Building service images..."
build_and_load_image "frontend"
build_and_load_image "api-gateway"
build_and_load_image "transaction-service"
build_and_load_image "notification-service"
build_and_load_image "reporting-service"

echo "🔐 Setting up Kubernetes secrets..."
"${SCRIPT_DIR}/setup-k8s-secrets.sh"

echo "📦 Applying Kubernetes configurations..."

# Apply configurations in order
echo "📊 Setting up database..."
minikube kubectl -- apply -f "${K8S_DIR}/database/postgres.yaml"

echo "⏳ Waiting for postgres to be ready (this may take a few minutes)..."
wait_for_pods "postgres" 300

# Push database schema after postgres is ready
push_database_schema

echo "🚀 Deploying backend services..."
minikube kubectl -- apply -f "${K8S_DIR}/services/api-gateway.yaml"
minikube kubectl -- apply -f "${K8S_DIR}/services/transaction-service.yaml"
minikube kubectl -- apply -f "${K8S_DIR}/services/notification-service.yaml"
minikube kubectl -- apply -f "${K8S_DIR}/services/reporting-service.yaml"

echo "🌐 Deploying frontend..."
minikube kubectl -- apply -f "${K8S_DIR}/services/frontend.yaml"
minikube kubectl -- apply -f "${K8S_DIR}/ingress/ingress.yaml"

echo "⏳ Waiting for backend services to be ready..."
wait_for_pods "api-gateway" 180
wait_for_pods "transaction-service" 180
wait_for_pods "notification-service" 180
wait_for_pods "reporting-service" 180

echo "⏳ Waiting for frontend to be ready..."
wait_for_pods "frontend" 180

echo "📊 Pod Status:"
minikube kubectl -- get pods

echo "🔌 Service Status:"
minikube kubectl -- get services

echo "🌐 Ingress Status:"
minikube kubectl -- get ingress

echo "⚡ HPA Status:"
minikube kubectl -- get hpa

# Apply monitoring ingress
echo "🌐 Applying monitoring ingress..."
minikube kubectl -- apply -f "${K8S_DIR}/monitoring/monitoring-ingress.yaml"

# Set up local host entries
echo "📝 Adding local host entries..."
echo "⚠️  The following entries need to be added to your /etc/hosts file:"
echo "$(minikube ip) grafana.monitoring prometheus.monitoring"
echo "Run: 'sudo echo \"$(minikube ip) grafana.monitoring prometheus.monitoring\" >> /etc/hosts'"

# Get monitoring stack access
GRAFANA_PASSWORD=$(minikube kubectl -- get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode)
echo "🔍 Monitoring Stack Access:"
echo "Method 1 - Using Ingress (recommended):"
echo "Grafana URL: http://grafana.monitoring/"
echo "Prometheus URL: http://prometheus.monitoring/"
echo ""
echo "Method 2 - Using port-forward (if Ingress doesn't work):"
echo "Run these commands in separate terminals:"
echo "kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80"
echo "kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090"
echo "Then access:"
echo "Grafana: http://localhost:3000"
echo "Prometheus: http://localhost:9090"
echo ""
echo "Grafana Credentials:"
echo "Username: admin"
echo "Password: $GRAFANA_PASSWORD"

echo "✅ Deployment completed successfully!"