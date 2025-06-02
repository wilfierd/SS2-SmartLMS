# Environment Configuration Guide

This project uses multiple environment files for different services. Here's how they work together:

## 📁 Environment Files Structure

```
e:\Uni\SS\SS2-SmartLMS\
├── .env                          # Main environment file (Docker Compose)
├── nestjs-backend/
│   ├── .env.example             # NestJS backend environment template
│   └── .env                     # NestJS backend environment (create from .env.example)
├── ml-service/
│   ├── .env.example             # ML service environment template
│   └── .env                     # ML service environment (create from .env.example)
└── docker-compose.yml           # Uses main .env file
```

## 🔧 Setup Instructions

### 1. Main Project Environment (.env)
Create `.env` in the root directory:

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=lms_db

# Application Ports
NESTJS_PORT=5001
ML_SERVICE_PORT=5000
FRONTEND_PORT=3000

# Redis
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret_change_this_in_production

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 2. NestJS Backend Environment
```bash
cd nestjs-backend
cp .env.example .env
# Edit .env with your values
```

### 3. ML Service Environment
```bash
cd ml-service
cp .env.example .env
# Edit .env with your values
```

## 🌐 Environment Variables Explained

### Main .env (Docker Compose)
- Used by `docker-compose.yml`
- Sets up database, Redis, and service ports
- Shared across all services in Docker

### NestJS Backend .env
- Used by NestJS application
- Database connection, JWT secret, OAuth settings
- ML service URL for communication

### ML Service .env
- Used by Flask/Python ML service
- Database connection for real-time queries
- Redis connection for caching

## 🐳 Docker Environment Mapping

In Docker Compose, environment variables flow like this:

```yaml
# Main .env → Docker Compose → Service containers
nestjs-backend:
  environment:
    - DB_HOST=mysql-db              # From main .env
    - ML_SERVICE_URL=http://ml-service:8000
    
ml-service:
  environment:
    - DB_HOST=mysql-db              # From main .env  
    - REDIS_HOST=redis-cache
```

## 🔄 Development vs Production

### Development (Local)
- Services run on localhost
- Direct database connections
- Hot reloading enabled

### Production (Docker)
- Services use container names (mysql-db, redis-cache)
- Internal Docker networking
- Optimized for performance

## 🚀 Quick Start

1. **Copy environment files:**
```bash
# Main environment
cp .env.example .env

# NestJS backend
cp nestjs-backend/.env.example nestjs-backend/.env

# ML service  
cp ml-service/.env.example ml-service/.env
```

2. **Edit each .env file with your values**

3. **Start with Docker:**
```bash
docker-compose up -d
```

4. **Or start individually for development:**
```bash
# Terminal 1: Database
docker-compose up mysql-db redis-cache

# Terminal 2: ML Service
cd ml-service
python app.py

# Terminal 3: NestJS Backend
cd nestjs-backend
npm run start:dev

# Terminal 4: Frontend
cd frontend
npm start
```

## 🔧 Environment Variables Priority

1. **Docker Compose**: Uses main `.env` file
2. **NestJS**: Uses `nestjs-backend/.env` → falls back to `configuration.ts` defaults
3. **ML Service**: Uses `ml-service/.env` → falls back to hardcoded defaults

## 🌍 Service Communication

### Development Mode:
- NestJS → ML Service: `http://localhost:5000`
- Frontend → NestJS: `http://localhost:5001`

### Docker Mode:
- NestJS → ML Service: `http://ml-service:8000`
- Frontend → NestJS: `http://nestjs-backend:5001`
- External → Nginx: `http://localhost` (proxies to services)

## 🔐 Security Notes

- Never commit `.env` files to Git
- Use strong passwords for production
- Change JWT secrets for production
- Use environment-specific Google OAuth credentials
