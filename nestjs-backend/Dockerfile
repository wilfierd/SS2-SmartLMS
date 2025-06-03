# Multi-stage build for optimized NestJS backend
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

# Copy package files
COPY nestjs-backend/package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code and build
COPY nestjs-backend/src ./src
COPY nestjs-backend/tsconfig*.json nestjs-backend/nest-cli.json ./
COPY key.json ./
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install only runtime dependencies
RUN apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Copy package files and install only production dependencies
COPY nestjs-backend/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/key.json ./

EXPOSE 5000

# Health check - using the correct status endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/status || exit 1

CMD ["node", "dist/main"]
