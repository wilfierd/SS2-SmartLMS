# Migration Guide: From Jupyter Notebook to ML Microservice

This guide helps you migrate from the old Jupyter notebook + pickle model approach to the new real-time ML microservice.

## 🔄 What's Changing

### Before (Old System)
- ✅ `ai/course_recommendation.ipynb` - Jupyter notebook with static analysis
- ✅ `ai/recommend.py` - Python script called by Node.js
- ✅ `backend/services/recommendation-service.js` - Node.js service spawning Python
- ✅ Pickle files (`recommendation_model.pkl`) for static models
- ✅ CSV/static data processing

### After (New System)
- 🆕 `ml-service/` - Flask microservice with real-time ML
- 🆕 `nestjs-backend/src/recommendations/` - NestJS integration
- 🆕 Redis caching for performance
- 🆕 Live database queries (no more static files)
- 🆕 Docker containerization
- 🆕 Advanced hybrid recommendation algorithms

## 🚀 Migration Steps

### Step 1: Set Up the New ML Service

```bash
# Navigate to ml-service directory
cd ml-service

# Windows
setup.bat

# Linux/Mac/Git Bash
bash setup.sh
```

### Step 2: Configure Environment Variables

```bash
# Copy environment templates
cp .env.example .env
cp nestjs-backend/.env.example nestjs-backend/.env

# Edit each .env file with your database credentials
```

### Step 3: Test the New ML Service

```bash
# Start the ML service (after setting up environment)
cd ml-service
source venv/Scripts/activate  # Windows
python app.py

# Test the health endpoint
curl http://localhost:5000/health

# Test recommendations
curl http://localhost:5000/recommendations/1?limit=3
```

### Step 4: Update Your NestJS Backend

The new recommendation module is already integrated! Just ensure your NestJS backend can communicate with the ML service:

```bash
cd nestjs-backend
npm install
npm run start:dev
```

Test the integration:
```bash
# Test NestJS → ML Service communication
curl http://localhost:5001/recommendations/1
```

### Step 5: Remove Old Files (Optional)

Once you've verified the new system works, you can remove old files:

```bash
# Backup first!
mkdir backup
cp ai/recommend.py backup/
cp backend/services/recommendation-service.js backup/

# Then remove (only after testing!)
# rm ai/recommend.py
# rm backend/services/recommendation-service.js
# rm ai/recommendation_model.pkl
```

## 🔄 API Changes

### Old API (Node.js backend)
```javascript
// GET /api/recommendations/:studentId
{
  "recommendations": [
    {
      "course_id": 1,
      "title": "Course Name",
      "score": 0.85,
      "reason": "Basic reason"
    }
  ]
}
```

### New API (NestJS + ML Service)
```javascript
// GET /recommendations/:studentId
{
  "success": true,
  "student_id": 1,
  "recommendations": [
    {
      "course_id": 1,
      "title": "Course Name",
      "description": "Detailed description",
      "department_name": "Computer Science",
      "instructor_name": "Dr. Smith",
      "credits": 3,
      "difficulty_level": "intermediate",
      "score": 0.85,
      "strategies": ["collaborative", "content"],
      "reason": "Recommended because students with similar interests also took this course and matches your learning preferences"
    }
  ],
  "timestamp": "2025-06-02T10:30:00Z"
}
```

## 📊 Key Improvements

### Performance
- ⚡ **Caching**: Redis caching reduces response time from seconds to milliseconds
- ⚡ **Real-time**: Live database queries instead of static pickle files
- ⚡ **Scalable**: Microservice architecture handles multiple concurrent requests

### Algorithm Quality
- 🧠 **Hybrid**: Combines collaborative filtering, content-based, and popularity algorithms
- 🧠 **Advanced Features**: TF-IDF analysis of course descriptions
- 🧠 **Contextual**: Department-based and trending course recommendations
- 🧠 **Explainable**: Detailed reasons for each recommendation

### Development Experience
- 🛠️ **Type Safety**: Full TypeScript integration in NestJS
- 🛠️ **Error Handling**: Comprehensive error handling and fallbacks
- 🛠️ **Monitoring**: Health checks and statistics endpoints
- 🛠️ **Testing**: Easy to unit test and integration test

## 🐳 Docker Deployment

### Development
```bash
# Start databases only
docker-compose up mysql-db redis-cache

# Run services locally for development
cd ml-service && python app.py
cd nestjs-backend && npm run start:dev
```

### Production
```bash
# Start entire stack
docker-compose up -d

# Check all services are running
docker-compose ps
```

## 🔧 Troubleshooting

### ML Service Won't Start
1. Check Python version: `python --version` (need 3.8+)
2. Activate virtual environment: `source venv/Scripts/activate`
3. Install dependencies: `pip install -r requirements.txt`
4. Check database connection in `.env` file

### NestJS Can't Connect to ML Service
1. Verify ML service is running: `curl http://localhost:5000/health`
2. Check `ML_SERVICE_URL` in NestJS `.env` file
3. For Docker: use `http://ml-service:8000`
4. For local: use `http://localhost:5000`

### Database Connection Issues
1. Verify MySQL is running
2. Check database credentials in `.env` files
3. Ensure database `lms_db` exists
4. Run the database setup script if needed

### No Recommendations Returned
1. Check if students exist in database: `SELECT * FROM users WHERE role='student'`
2. Check if enrollments exist: `SELECT * FROM enrollments`
3. Check ML service logs for errors
4. Try the fallback: `curl http://localhost:5000/recommendations/1?refresh=true`

## 📈 Monitoring

### Health Checks
```bash
# ML Service health
curl http://localhost:5000/health

# ML Service statistics
curl http://localhost:5000/stats

# NestJS health (if implemented)
curl http://localhost:5001/health
```

### Performance Monitoring
- Redis cache hit rates
- Database query performance
- ML algorithm execution time
- API response times

## 🔄 Data Migration

The new system reads directly from your existing database, so no data migration is needed! It uses the same tables:
- `users` (students)
- `courses` 
- `enrollments`
- `departments`

The ML service automatically builds recommendation models from this live data.

## 🎯 Next Steps

1. **Test thoroughly** with your existing data
2. **Monitor performance** and cache hit rates
3. **Tune algorithms** based on user feedback
4. **Add more features** like:
   - Learning path recommendations
   - Skill-based recommendations
   - Time-based scheduling
   - A/B testing for algorithms

## 🆘 Need Help?

If you encounter issues during migration:
1. Check the logs: `docker-compose logs ml-service`
2. Verify environment variables are set correctly
3. Test individual components separately
4. Check the troubleshooting section above

The new system is designed to be backward-compatible and includes fallbacks, so you can switch back to the old system if needed during testing.
