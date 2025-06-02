#!/bin/bash

# VPS Deployment Script for Smart LMS
# This script sets up the complete Docker stack on a VPS

set -e

echo "🚀 Starting Smart LMS deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    
    print_warning "Please edit the .env file with your production values:"
    print_warning "- Set secure passwords for DB_PASSWORD and JWT_SECRET"
    print_warning "- Update DOMAIN_NAME if you have one"
    print_warning "- Configure SMTP settings if needed"
    
    read -p "Press Enter after you've updated the .env file..."
fi

# Create necessary directories
print_status "Creating required directories..."
mkdir -p volumes/mysql
mkdir -p volumes/redis
mkdir -p uploads
mkdir -p ssl

# Set proper permissions
print_status "Setting permissions..."
chmod -R 755 uploads
chmod -R 755 volumes

# Pull latest images
print_status "Pulling Docker images..."
docker-compose pull

# Build custom images
print_status "Building application images..."
docker-compose build

# Start the services
print_status "Starting services..."
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check MySQL
if docker-compose exec -T mysql-db mysqladmin ping -h localhost --silent; then
    print_status "✅ MySQL is running"
else
    print_error "❌ MySQL is not responding"
fi

# Check Redis
if docker-compose exec -T redis-cache redis-cli ping | grep -q PONG; then
    print_status "✅ Redis is running"
else
    print_error "❌ Redis is not responding"
fi

# Check ML Service
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    print_status "✅ ML Service is running"
else
    print_error "❌ ML Service is not responding"
fi

# Check NestJS Backend
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    print_status "✅ NestJS Backend is running"
else
    print_error "❌ NestJS Backend is not responding"
fi

# Show running services
print_status "Running services:"
docker-compose ps

# Show logs for any failed services
print_status "Checking for any failed services..."
if docker-compose ps | grep -q "Exit"; then
    print_warning "Some services have exited. Showing logs:"
    docker-compose logs
fi

print_status "🎉 Deployment completed!"
print_status "Your LMS is available at:"
print_status "- Backend API: http://your-server-ip:3000"
print_status "- ML Service: http://your-server-ip:5000"
print_status "- Nginx Proxy: http://your-server-ip:80"

print_warning "Next steps:"
print_warning "1. Set up SSL certificates in the ssl/ directory"
print_warning "2. Update nginx.conf with your domain name"
print_warning "3. Configure your firewall to allow ports 80, 443"
print_warning "4. Set up automatic backups for the database"
print_warning "5. Monitor the services with 'docker-compose logs -f'"

echo ""
print_status "Useful commands:"
echo "- View logs: docker-compose logs -f [service-name]"
echo "- Restart services: docker-compose restart"
echo "- Stop services: docker-compose down"
echo "- Update services: ./deploy.sh"
echo "- Backup database: docker-compose exec mysql-db mysqldump -u root -p lms_db > backup.sql"
