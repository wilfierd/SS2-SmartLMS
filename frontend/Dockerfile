# Ultra-optimized React frontend build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --silent && npm cache clean --force

# Copy source and build (minimize build context)
COPY public ./public
COPY src ./src
RUN npm run build

# Ultra-minimal production stage
FROM nginx:alpine AS production

# Copy built app
COPY --from=builder /app/build /usr/share/nginx/html

# Use custom minimal nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove unnecessary nginx modules and files and set permissions
RUN rm -rf /var/cache/apk/* /tmp/* /var/tmp/* && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 3000

# Minimal health check (force IPv4)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]