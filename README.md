<div align="center">

![Header](https://capsule-render.vercel.app/api?type=waving&color=2E86AB&height=200&section=header&text=Smart%20LMS&fontSize=60&fontColor=FFFFFF&desc=Smart%20Learning%20Management%20System&descAlign=50&descAlignY=70)

</div>

# Smart Learning Management System

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E.svg?logo=javascript&logoColor=black)](https://www.javascript.com/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E.svg?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1.svg?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-000000.svg?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![JWT](https://img.shields.io/badge/JWT-000000.svg?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Google OAuth](https://img.shields.io/badge/Google%20OAuth-4285F4.svg?logo=google&logoColor=white)](https://developers.google.com/identity/protocols/oauth2)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-4285F4.svg?logo=google-cloud&logoColor=white)](https://cloud.google.com/)

A comprehensive, intelligent Learning Management System built with modern microservices architecture. Features advanced lesson building, AI-powered recommendations, real-time virtual classrooms, and comprehensive analytics.

## ![](https://img.shields.io/badge/-2E86AB.svg?logo=stackshare&logoColor=white) Architecture

### Microservices Architecture
- **Backend API**: NestJS (TypeScript) with MySQL
- **Frontend**: React.js deployed on Vercel  
- **ML Service**: Python Flask for AI recommendations
- **Authentication**: JWT + Google OAuth2.0
- **Database**: MySQL with optimized schema
- **File Storage**: Local/Cloud storage support
- **API Documentation**: Swagger/OpenAPI
- **Reverse Proxy**: Nginx (for Docker deployment)

## ![](https://img.shields.io/badge/-FF6B6B.svg?logo=checkmarx&logoColor=white) System Requirements

- **Node.js**: v18 or higher (recommended)
- **Python**: v3.8+ (for ML service)
- **MySQL**: v8.0 or higher
- **npm** or **yarn**: Latest version
- **TypeScript**: v4.0+ (automatically installed)
- **Docker**: For containerized deployment (optional)

## <img src="https://cdn-icons-png.flaticon.com/512/3159/3159310.png" width="22" height="22" alt="Setup"> Installation Instructions

### 🚀 Production Deployment (Recommended)

#### Frontend (Vercel)
```bash
# Deploy frontend to Vercel
cd frontend
npm install
npm run build
# Deploy to Vercel (configure REACT_APP_API_URL)
```

#### Backend (Cloud Run - Recommended)
```bash
# Automatic deployment via GitHub Actions
# See CLOUD_RUN_SETUP.md for detailed setup instructions

# Manual deployment (requires gcloud CLI)
gcloud run deploy smartlms-backend --source ./nestjs-backend
gcloud run deploy smartlms-ml-service --source ./ml-service
```

#### Backend (Docker Alternative)
```bash
# Deploy backend services with Docker
docker-compose up -d
```

### 📦 Quick Start with Docker (Backend Services Only)

```bash
git clone https://github.com/yourusername/SS2-SmartLMS.git
cd SS2-SmartLMS
docker-compose up -d
```

**Note**: This starts backend services only (API + ML + Database). Frontend should be deployed separately on Vercel.

### 🔧 Development Setup

#### 1. Frontend Development (Local)
```bash
cd frontend
npm install
# Configure environment variables
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.local
npm start
```

#### 2. Backend Development (Docker)
```bash
# Start backend services
docker-compose up -d

# Or run backend locally:
cd nestjs-backend
npm install
npm run start:dev
```

The application will be available at:
- **Frontend**: https://your-app.vercel.app (Vercel deployment)
- **Backend API**: 
  - https://smartlms-backend-xxx.a.run.app (Cloud Run - Recommended)
  - http://localhost:5000 (Docker alternative)
- **ML Service**: 
  - https://smartlms-ml-service-xxx.a.run.app (Cloud Run - Recommended)
  - http://localhost:8000 (Docker alternative)
- **API Documentation**: https://your-backend-url/api/docs

### 🛠️ Manual Installation (Full Local Development)

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/SS2-SmartLMS.git
cd SS2-SmartLMS
```

#### 2. Set Up MySQL Database

First, ensure MySQL is running, then set up the database using the provided Node.js setup script:

```bash
cd nestjs-backend
npm install
```

Create `.env` file with your database credentials:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=lms_db
```

Run the database setup script (this will create the database and import the schema):
```bash
node setupdb.js
```

Alternatively, you can set up manually:
```bash
# Create database
mysql -u your_username -p -e "CREATE DATABASE IF NOT EXISTS lms_db;"

# Import schema
mysql -u your_username -p lms_db < schema.sql
```

#### 3. Complete Backend Configuration

Complete your `.env` file with all required settings:

#### 4. Set Up ML Service

```bash
cd ml-service
pip install -r requirements.txt
```

Create ML service `.env`:
```env
FLASK_ENV=development
DATABASE_URL=mysql://username:password@localhost/lms_db
```

#### 5. Set Up Frontend (Local Development)

```bash
cd frontend
npm install
```

Create `.env.local` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ML_SERVICE_URL=http://localhost:8000
```

#### 6. Start All Services

```bash
# Terminal 1: Backend
cd nestjs-backend
npm run start:dev

# Terminal 2: ML Service  
cd ml-service
python app.py

# Terminal 3: Frontend (Local Development)
cd frontend
npm start
```

**For Production**: Deploy frontend to Vercel and backend via Docker/Cloud Run.

## 🏗️ Deployment Architecture

### Production Setup
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Vercel      │    │   Cloud Run      │    │   Cloud SQL     │
│   (Frontend)    │───▶│   (Backend API   │───▶│   (Database)    │
│                 │    │    + ML Service) │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Development Setup
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   localhost:3000│    │   localhost:5000 │    │   localhost:3307│
│   (React Dev)   │───▶│   (NestJS)       │───▶│   (MySQL)       │
│                 │    │   + ML:8000      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Cloud Run Services (Production)
- **smartlms-backend**: Main API server (NestJS)
- **smartlms-ml-service**: AI recommendations (Python Flask)
- **Cloud SQL**: Managed MySQL database
- **Automatic scaling**: 0 to 10 instances based on traffic
- **HTTPS**: Automatic SSL certificates

### Docker Services (Backend Only)
- **nginx**: API Gateway and reverse proxy
- **nestjs-backend**: Main API server (port 5000)
- **ml-service**: AI recommendations (port 8000)  
- **mysql-db**: Database (port 3307)
- **redis-cache**: Caching layer
- **meilisearch**: Search engine

## 📚 Deployment Guides

- **[Cloud Run Setup](CLOUD_RUN_SETUP.md)**: Complete guide for deploying to Google Cloud Run (Recommended)
- **Docker Setup**: Use `docker-compose up -d` for local development or VPS deployment

```json
{
  "oauth_credentials": {
    "web": {
      "client_id": "your_google_client_id",
      "client_secret": "your_google_client_secret",
      "redirect_uris": ["http://localhost:3000/auth/callback"]
    }
  }
}
```

### 6. Set Up Frontend

```bash
cd ../frontend
npm install
```

### 7. Start the NestJS Backend Server

```bash
cd ../nestjs-backend
npm run start:dev
```

The backend will start at http://localhost:5000 with:
- API endpoints at `http://localhost:5000/api/`
- Swagger documentation at `http://localhost:5000/api/docs`

### 8. Frontend Deployment

**Production (Vercel)**:
```bash
cd frontend
# Deploy to Vercel with environment variables:
# REACT_APP_API_URL=https://your-backend.com/api
vercel deploy --prod
```

**Local Development**:
```bash
cd frontend
npm start  # Opens at http://localhost:3000
```

## <img src="https://cdn-icons-png.flaticon.com/512/1077/1077114.png" width="22" height="22" alt="Credentials"> Default Login Credentials

After setting up the database, you can use these default credentials:

### Admin
- **Email**: admin@lms.com
- **Password**: admin123

### Instructor  
- **Email**: instructor@lms.com
- **Password**: instructor123

### Student
- **Email**: student@lms.com  
- **Password**: 123456789

> **Note**: Students are required to change their password upon first login for security.

## <img src="https://cdn-icons-png.flaticon.com/512/1828/1828970.png" width="22" height="22" alt="Features"> Key Features

### ![](https://img.shields.io/badge/-FF6B6B.svg?logo=book&logoColor=white) Advanced Course Management
- **Dynamic Lesson Builder**: Drag-and-drop content blocks
  - Text blocks with rich formatting
  - Image blocks with upload support
  - Video embedding (YouTube, Vimeo, etc.)
  - File attachments and downloads
  - Interactive quiz blocks
- **Course Structure**: Modules and lessons organization
- **Student Enrollment**: Automated enrollment system
- **Progress Tracking**: Real-time completion tracking
- **Course Analytics**: Detailed statistics and insights

### ![](https://img.shields.io/badge/-FFD93D.svg?logo=video&logoColor=black) Virtual Classroom
- **Real-time Sessions**: Live video conferencing
- **Breakout Rooms**: Small group collaboration
- **Interactive Whiteboard**: Digital collaboration tools
- **Screen Sharing**: Content presentation
- **Session Recording**: For later review
- **Participant Management**: Attendance tracking

### ![](https://img.shields.io/badge/-6BCF7F.svg?logo=chat&logoColor=white) Communication Hub
- **Discussion Forums**: Course-specific discussions
- **Direct Messaging**: Private communication
- **Real-time Notifications**: Instant updates
- **Announcement System**: Broadcast communications
- **Email Integration**: Automated notifications

### ![](https://img.shields.io/badge/-9B59B6.svg?logo=robot&logoColor=white) AI-Powered Features
- **ML Recommendation Engine**: Personalized course suggestions
- **Learning Analytics**: AI-driven insights
- **Performance Prediction**: Student success forecasting
- **Content Optimization**: Data-driven improvements

## <img src="https://cdn-icons-png.flaticon.com/512/716/716784.png" width="22" height="22" alt="Structure"> Project Structure

```
SS2-SmartLMS/
├── nestjs-backend/              # NestJS TypeScript Backend API
│   ├── src/
│   │   ├── assessments/         # Quiz & Assignment modules
│   │   ├── auth/                # Authentication & Authorization
│   │   ├── chatbot/            # AI Chatbot integration
│   │   ├── courses/            # Course management
│   │   ├── departments/        # Department management
│   │   ├── discussions/        # Forum discussions
│   │   ├── enrollments/        # Student enrollments
│   │   ├── mailer/             # Email notifications
│   │   ├── messages/           # Direct messaging
│   │   ├── notifications/      # Real-time notifications
│   │   ├── recommendations/    # ML recommendations
│   │   ├── search/             # Search functionality
│   │   ├── uploads/            # File upload handling
│   │   ├── users/              # User management
│   │   ├── virtual-classroom/  # Live sessions
│   │   ├── common/             # Shared utilities
│   │   ├── config/             # Configuration
│   │   ├── database/           # Database connections
│   │   └── main.ts             # Application entry point
│   ├── uploads/                # Uploaded files storage
│   ├── schema.sql              # Database schema
│   ├── Dockerfile              # Container configuration
│   └── package.json
├── frontend/                    # React.js Frontend (Deploy to Vercel)
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── 1.admin/        # Admin dashboard
│   │   │   ├── 2.instructor/   # Instructor interface
│   │   │   ├── 3.student/      # Student interface
│   │   │   ├── assessment/     # Quiz & assignment components
│   │   │   ├── auth/           # Authentication forms
│   │   │   ├── chatbot/        # AI chatbot interface
│   │   │   ├── classroom/      # Virtual classroom UI
│   │   │   ├── common/         # Shared components
│   │   │   ├── course/         # Course management
│   │   │   │   └── LessonBuilder/ # Dynamic lesson builder
│   │   │   ├── message/        # Messaging interface
│   │   │   ├── notifications/  # Notification components
│   │   │   ├── profile/        # User profiles
│   │   │   ├── quiz/           # Quiz interface
│   │   │   └── routing/        # Route management
│   │   ├── services/           # API service layer
│   │   ├── context/            # React context providers
│   │   ├── hooks/              # Custom React hooks
│   │   ├── styles/             # Styling files
│   │   ├── utils/              # Utility functions
│   │   └── config.js           # Frontend configuration
│   ├── build/                  # Production build
│   ├── public/                 # Static assets
│   ├── vercel.json             # Vercel deployment config
│   └── package.json
├── ml-service/                  # Python Flask ML Service
│   ├── app.py                  # Flask application
│   ├── recommendation_engine.py # AI recommendation logic
│   ├── recommendation_model.pkl # Trained ML model
│   ├── recommender_utils.py    # ML utilities
│   ├── database.py             # Database connection
│   ├── extract_data.py         # Data extraction scripts
│   ├── data/                   # Training data
│   ├── ml/                     # ML model components
│   ├── Dockerfile              # Container configuration
│   └── requirements.txt        # Python dependencies
├── docker-compose.yml          # Backend services orchestration
├── nginx.conf                  # API Gateway configuration
├── key.json                    # Google OAuth credentials
└── README.md                   # This file
```

