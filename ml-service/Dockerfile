# Use Python 3.12 with Debian Bookworm for better security
FROM python:3.12-slim-bookworm

WORKDIR /app

# Install system dependencies with security updates
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    curl \
    tini \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Create non-root user first
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /bin/bash app

# Copy application code and cleanup
COPY --chown=app:appgroup . .
RUN rm -rf *.md setup.* .git* && \
    find . -name "*.pyc" -delete

# Switch to non-root user
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

EXPOSE 5000

# Use tini as init system and gunicorn for production
ENTRYPOINT ["tini", "--"]
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "60", "app:app"]
