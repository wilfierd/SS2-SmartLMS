# Ultra-optimized ML service using Alpine multi-stage build
FROM python:3.12-alpine AS builder

WORKDIR /app

# Install minimal build dependencies
RUN apk add --no-cache --virtual .build-deps \
    gcc \
    musl-dev \
    linux-headers \
    libffi-dev \
    openssl-dev \
    mariadb-dev \
    g++ \
    make

# Copy requirements and install with optimizations
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --user --no-warn-script-location \
    --compile --no-deps -r requirements.txt && \
    pip install --no-cache-dir --user --no-warn-script-location \
    --only-binary=all -r requirements.txt

# Clean up build dependencies immediately
RUN apk del .build-deps

# Ultra-minimal production stage
FROM python:3.12-alpine AS production

WORKDIR /app

# Install only absolute essentials for runtime
RUN apk add --no-cache \
    mariadb-connector-c \
    libstdc++ \
    libgomp \
    wget \
    tini && \
    addgroup -g 1001 -S appgroup && \
    adduser -S app -u 1001 -G appgroup && \
    rm -rf /var/cache/apk/* /tmp/*

# Copy only the compiled packages
COPY --from=builder /root/.local /home/app/.local

# Copy application files with minimal footprint
COPY --chown=app:appgroup *.py ./

# Optimize Python environment
ENV PATH=/home/app/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Switch to non-root user
USER app

# Remove health check for now to avoid conflicts
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#     CMD wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1

EXPOSE 8000

# Use tini for proper signal handling and start gunicorn
ENTRYPOINT ["/sbin/tini", "--", "gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--timeout", "60", "--preload", "app:app"]
