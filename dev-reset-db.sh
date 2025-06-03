#!/bin/bash

# Development Database Reset Script
# This script helps you quickly drop and recreate the database for testing

echo "🔧 Development Database Reset"
echo "=============================="

# Stop only the database container
echo "📍 Stopping MySQL container..."
docker-compose stop mysql-db

# Remove the database volume to clear all data
echo "🗑️  Removing database volume..."
docker volume rm ss2-smartlms_mysql_data 2>/dev/null || echo "Volume doesn't exist, continuing..."

# Start the database container (will recreate with fresh schema)
echo "🚀 Starting MySQL container with fresh schema..."
docker-compose up -d mysql-db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Check if database is ready
echo "🔍 Checking database status..."
docker-compose exec mysql-db mysqladmin ping -h localhost --silent

if [ $? -eq 0 ]; then
    echo "✅ Database is ready!"
    echo "📊 Database has been reset with fresh schema"
    echo ""
    echo "You can now:"
    echo "  - Run your NestJS app: npm run start:dev"
    echo "  - Check tables: docker-compose exec mysql-db mysql -u lms_user -p lms_db"
    echo "  - View logs: docker-compose logs mysql-db"
else
    echo "❌ Database is not ready. Check logs:"
    docker-compose logs mysql-db
fi
