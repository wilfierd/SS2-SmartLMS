# Smart LMS - Production Deployment Guide

## Overview

This guide covers deploying the Smart LMS with real-time ML recommendations to a VPS using Docker.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │  NestJS Backend │    │   ML Service    │
│   (Port 80/443) │────│   (Port 3000)   │────│   (Port 5000)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │  MySQL Database │    │  Redis Cache    │
                       │   (Port 3306)   │    │   (Port 6379)   │
                       └─────────────────┘    └─────────────────┘
```

## ML Recommendation System Features

- **Real-time recommendations** using live database queries (replaces Jupyter notebook)
- **Hybrid ML approach** combining collaborative filtering, content-based filtering, and popularity-based recommendations
- **Redis caching** for improved performance
- **Explainable AI** with recommendation reasons
- **Automatic model retraining** capabilities

## Quick VPS Deployment

### 1. VPS Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB+ recommended
- **Storage**: 20GB+ SSD
- **OS**: Ubuntu 20.04+ or CentOS 8+

### 2. Install Docker & Docker Compose
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl enable docker
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install docker docker-compose
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 3. Deploy the Application
```bash
# Clone repository
git clone <your-repo>
cd SS2-SmartLMS

# Configure environment
cp .env.example .env
nano .env  # Edit with your secure passwords

# Deploy with one command
chmod +x deploy.sh
./deploy.sh
```

### 4. Access Your Application
- **Backend API**: `http://your-server-ip:3000`
- **ML Service**: `http://your-server-ip:5000`
- **Web Interface**: `http://your-server-ip:80`

## API Endpoints for ML Recommendations

### Get Student Recommendations
```http
GET /api/recommendations/{studentId}?limit=3&refresh=false
```

Example response:
```json
{
  "success": true,
  "student_id": 1,
  "recommendations": [
    {
      "course_id": 5,
      "title": "Advanced JavaScript",
      "description": "Deep dive into JavaScript frameworks",
      "department_name": "Computer Science",
      "instructor_name": "John Doe",
      "credits": 3,
      "difficulty_level": "advanced",
      "score": 0.85,
      "strategies": ["collaborative", "content"],
      "reason": "Recommended because students with similar interests also took this course and matches your learning preferences"
    }
  ],
  "timestamp": "2025-06-02T10:30:00.000Z"
}
```

### Batch Recommendations (Admin/Instructor)
```http
POST /api/recommendations/batch
{
  "studentIds": [1, 2, 3],
  "limit": 3
}
```

### Admin Controls
```http
POST /api/recommendations/retrain       # Retrain ML model
POST /api/recommendations/cache/clear   # Clear cache
GET  /api/recommendations/service/stats # Get statistics
GET  /api/recommendations/service/health # Health check
```

## Environment Configuration

Create `.env` file with these values:

```env
# Database Configuration
DB_HOST=mysql-db
DB_USER=lms_user
DB_PASSWORD=your_secure_mysql_password_here
DB_NAME=lms_db

# Security
JWT_SECRET=your_very_secure_jwt_secret_key_here_at_least_32_characters

# ML Service
ML_SERVICE_URL=http://ml-service:5000

# Redis Cache
REDIS_HOST=redis-cache
REDIS_PORT=6379

# Optional: SSL Domain
DOMAIN_NAME=your-domain.com
```

## SSL Setup (Production)

### 1. Obtain SSL Certificate
```bash
# Using Let's Encrypt (recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

### 2. Configure Nginx for HTTPS
```bash
# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem

# Update nginx.conf with your domain
nano nginx.conf

# Restart nginx
docker-compose restart nginx
```

## Monitoring & Maintenance

### View Service Logs
```bash
docker-compose logs -f [service-name]
docker-compose logs -f ml-service
docker-compose logs -f nestjs-backend
```

### Monitor Performance
```bash
# Resource usage
docker stats

# Service health
curl http://your-server/health
curl http://your-server:5000/health
curl http://your-server:3000/health
```

### Database Backup
```bash
# Create backup
docker-compose exec mysql-db mysqldump -u root -p lms_db > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose exec -T mysql-db mysql -u root -p lms_db < backup.sql
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

## Troubleshooting

### Service Not Starting
```bash
# Check specific service logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]

# Check service status
docker-compose ps
```

### Database Issues
```bash
# Access MySQL shell
docker-compose exec mysql-db mysql -u root -p

# Check database tables
USE lms_db;
SHOW TABLES;
```

### ML Service Issues
```bash
# Check ML service health
curl http://localhost:5000/health

# View ML service logs
docker-compose logs ml-service

# Manually retrain model
curl -X POST http://localhost:5000/model/retrain
```

### Performance Issues
```bash
# Clear Redis cache
curl -X POST http://localhost:5000/cache/clear

# Restart services
docker-compose restart

# Check resource usage
docker stats
```

## Security Best Practices

1. **Change Default Passwords**: Update all passwords in `.env`
2. **Enable Firewall**: Configure UFW or iptables
3. **SSL/HTTPS**: Use certificates for production
4. **Regular Updates**: Keep Docker images updated
5. **Backup Strategy**: Automated database backups
6. **Monitor Logs**: Regular log monitoring for security

## Advanced Configuration

### Scaling for Higher Load
```yaml
# Add to docker-compose.yml
  nestjs-backend:
    deploy:
      replicas: 3
    
  ml-service:
    deploy:
      replicas: 2
```

### Load Balancing
```nginx
# In nginx.conf
upstream nestjs_backend {
    server nestjs-backend-1:3000;
    server nestjs-backend-2:3000;
    server nestjs-backend-3:3000;
}
```

### Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_enrollments_student_course ON enrollments(student_id, course_id);
CREATE INDEX idx_courses_department ON courses(department_id);
CREATE INDEX idx_enrollments_status ON enrollments(completion_status);
```

This deployment provides a production-ready Smart LMS with real-time ML recommendations, replacing the Jupyter notebook approach with a scalable microservice architecture.
