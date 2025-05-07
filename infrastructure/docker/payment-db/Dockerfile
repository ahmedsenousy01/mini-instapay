FROM postgres:17-alpine

# Environment variables for database configuration
ENV POSTGRES_DB=payment_db
ENV POSTGRES_USER=instapay
ENV INIT_MODE=reset

# Copy initialization scripts
COPY init-scripts/ /docker-entrypoint-initdb.d/

# Make scripts executable
RUN chmod +x /docker-entrypoint-initdb.d/*