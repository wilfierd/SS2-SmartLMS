# 🚀 Quick Start Guide: ML Recommendation System

Get your real-time ML recommendation system up and running in minutes!

## 📋 Prerequisites

- ✅ Python 3.8+ installed
- ✅ Node.js 16+ installed  
- ✅ MySQL database running
- ✅ Git Bash or Terminal

## ⚡ 5-Minute Setup

### 1. Clone and Navigate
```bash
cd e:/Uni/SS/SS2-SmartLMS
```

### 2. Set Up Environment Variables
```bash
# Copy environment templates
cp .env.example .env
cp nestjs-backend/.env.example nestjs-backend/.env
cp ml-service/.env.example ml-service/.env

# Edit each .env file with your database credentials
# Minimum required: DB_PASSWORD, JWT_SECRET
```

### 3. Set Up ML Service
```bash
cd ml-service

# Windows
setup.bat

# Linux/Mac/Git Bash  
bash setup.sh
```

### 4. Start the System

#### Option A: Docker (Recommended for Production)
```bash
# Start everything with Docker
docker-compose up -d

# Check all services are running
docker-compose ps
```

#### Option B: Development Mode
```bash
# Terminal 1: Database & Redis
docker-compose up mysql-db redis-cache

# Terminal 2: ML Service
cd ml-service
source venv/Scripts/activate  # Windows
source venv/bin/activate       # Linux/Mac
python app.py

# Terminal 3: NestJS Backend
cd nestjs-backend
npm install
npm run start:dev

# Terminal 4: Frontend (optional)
cd frontend
npm install
npm start
```

### 5. Test the System
```bash
# Run the test script
bash test-system.sh

# Or test manually
curl http://localhost:5000/health
curl http://localhost:5000/recommendations/1
```

## 🎯 Quick Tests

### Test ML Service Directly
```bash
# Health check
curl http://localhost:5000/health

# Get recommendations for student ID 1
curl http://localhost:5000/recommendations/1?limit=3

# Get service statistics
curl http://localhost:5000/stats

# Clear cache (admin function)
curl -X POST http://localhost:5000/cache/clear
```

### Test via NestJS Backend
```bash
# Get recommendations through NestJS
curl http://localhost:5001/recommendations/1

# Batch recommendations
curl -X POST http://localhost:5001/recommendations/batch \
  -H "Content-Type: application/json" \
  -d '{"studentIds": [1, 2, 3], "limit": 3}'
```

## 🌐 Access URLs

- **ML Service**: http://localhost:5000
- **NestJS Backend**: http://localhost:5001  
- **Frontend**: http://localhost:3000 (if running)
- **Database**: localhost:3306
- **Redis**: localhost:6379

## 🔧 Common Issues & Solutions

### "ML Service not responding"
```bash
# Check if ML service is running
curl http://localhost:5000/health

# If not, start it manually
cd ml-service
source venv/Scripts/activate
python app.py
```

### "Database connection failed"
```bash
# Check database is running
docker-compose up mysql-db

# Verify credentials in .env files
# Check database has data
mysql -u root -p -e "USE lms_db; SELECT COUNT(*) FROM enrollments;"
```

### "No recommendations returned"
```bash
# Check if you have data
curl http://localhost:5000/stats

# Force refresh recommendations
curl http://localhost:5000/recommendations/1?refresh=true

# Check logs
docker-compose logs ml-service
```

### "NestJS can't connect to ML service"
```bash
# Check ML_SERVICE_URL in nestjs-backend/.env
# For local development: http://localhost:5000
# For Docker: http://ml-service:5000
```

## 📊 Monitoring

### View Logs
```bash
# Docker logs
docker-compose logs -f ml-service
docker-compose logs -f nestjs-backend

# Local development
# Check terminal outputs where services are running
```

### Performance Stats
```bash
# ML service statistics
curl http://localhost:5000/stats

# Response should include:
# - total_students, total_courses
# - cache hit rates
# - algorithm performance
```

## 🎮 Try Different Features

### Basic Recommendations
```bash
curl http://localhost:5000/recommendations/1?limit=5
```

### Force Refresh (bypass cache)
```bash
curl http://localhost:5000/recommendations/1?refresh=true
```

### Batch Processing
```bash
curl -X POST http://localhost:5000/recommendations/batch \
  -H "Content-Type: application/json" \
  -d '{"student_ids": [1, 2, 3, 4, 5], "limit": 3}'
```

### Admin Functions
```bash
# Retrain ML model
curl -X POST http://localhost:5000/model/retrain

# Clear all caches
curl -X POST http://localhost:5000/cache/clear
```

## 🔄 Development Workflow

1. **Make changes** to ML algorithms in `ml-service/recommendation_engine.py`
2. **Restart ML service**: `Ctrl+C` then `python app.py`
3. **Test changes**: `curl http://localhost:5000/recommendations/1?refresh=true`
4. **Clear cache** if needed: `curl -X POST http://localhost:5000/cache/clear`

## 📈 Production Deployment

### VPS Deployment
```bash
# Copy to VPS
scp -r . user@your-vps:/path/to/project

# On VPS
docker-compose up -d
```

### Environment Variables for Production
```bash
# Update .env for production
NODE_ENV=production
DB_HOST=your-production-db-host
REDIS_HOST=your-production-redis-host
JWT_SECRET=your-strong-production-secret
```

## 🆘 Get Help

1. **Check logs**: `docker-compose logs ml-service`
2. **Run tests**: `bash test-system.sh`
3. **Read guides**: 
   - `MIGRATION.md` - Migration from old system
   - `ENVIRONMENT.md` - Environment configuration
   - `DEPLOYMENT.md` - Production deployment

## 🎉 Success!

If everything is working, you should see:
- ✅ ML service responding at http://localhost:5000/health
- ✅ Recommendations being generated with real-time data
- ✅ Caching working (faster subsequent requests)
- ✅ Integration between NestJS and ML service
- ✅ Advanced hybrid algorithms providing quality recommendations

Your smart LMS now has a production-ready, scalable ML recommendation system! 🚀
