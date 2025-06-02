# Use Node.js 22 with Alpine 3.21 for zero high vulnerabilities
FROM node:22-alpine3.21

WORKDIR /app

# Install security updates and dependencies
RUN apk update && apk upgrade && apk add --no-cache curl dumb-init && \
    rm -rf /var/cache/apk/*

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code and build
COPY . .
RUN npm run build && \
    rm -rf src test examples *.md

# Create non-root user with proper permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs && \
    chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["dumb-init", "node", "dist/main"]
