#!/bin/bash
# Security check script for Docker images

echo "🔒 Building and checking Docker images for security vulnerabilities..."

# Build ML Service
echo "Building ML Service..."
cd ml-service
docker build -t smartlms-ml:latest .
if [ $? -eq 0 ]; then
    echo "✅ ML Service built successfully"
    echo "🔍 Checking for vulnerabilities..."
    docker scout quickview smartlms-ml:latest || echo "Docker Scout not available - install for vulnerability scanning"
else
    echo "❌ ML Service build failed"
fi

# Build NestJS Backend
echo "Building NestJS Backend..."
cd ../nestjs-backend
docker build -t smartlms-backend:latest .
if [ $? -eq 0 ]; then
    echo "✅ NestJS Backend built successfully"
    echo "🔍 Checking for vulnerabilities..."
    docker scout quickview smartlms-backend:latest || echo "Docker Scout not available - install for vulnerability scanning"
else
    echo "❌ NestJS Backend build failed"
fi

echo "🎯 Build process completed!"
echo ""
echo "💡 To scan for vulnerabilities, install Docker Scout:"
echo "   docker scout quickview <image-name>"
echo ""
echo "🚀 To run the full stack:"
echo "   docker-compose up -d"
