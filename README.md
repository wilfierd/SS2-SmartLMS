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
[![Swagger](https://img.shields.io/badge/Swagger-85EA2D.svg?logo=swagger&logoColor=black)](http://localhost:5000/api/docs)
[![JWT](https://img.shields.io/badge/JWT-000000.svg?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Google OAuth](https://img.shields.io/badge/Google%20OAuth-4285F4.svg?logo=google&logoColor=white)](https://developers.google.com/identity/protocols/oauth2)

A comprehensive Learning Management System built with modern technologies including NestJS backend, React frontend, and MySQL database. The system supports students, instructors, and administrators with features for course management, assessments, virtual classrooms, and more.

## ![](https://img.shields.io/badge/-2E86AB.svg?logo=stackshare&logoColor=white) Architecture

- **Backend**: NestJS (TypeScript) - Migrated from Express.js
- **Frontend**: React.js
- **Database**: MySQL with TypeORM
- **Authentication**: JWT + Google OAuth2.0
- **API Documentation**: Swagger/OpenAPI

## ![](https://img.shields.io/badge/-FF6B6B.svg?logo=checkmarx&logoColor=white) System Requirements

- **Node.js**: v18 or higher (recommended)
- **MySQL**: v8.0 or higher
- **npm** or **yarn**: Latest version
- **TypeScript**: v4.0+ (automatically installed)

## <img src="https://cdn-icons-png.flaticon.com/512/3159/3159310.png" width="22" height="22" alt="Setup"> Installation Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/SS2-SmartLMS.git
cd SS2-SmartLMS
```

### 2. Set Up NestJS Backend

```bash
cd nestjs-backend
npm install
```

### 3. Configure Backend Environment Variables

Create a `.env` file in the `nestjs-backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=lms_db

# JWT Configuration
JWT_SECRET=your_very_long_and_secure_jwt_secret_key_replace_this_in_production

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="LMS Admin <no-reply@lms.com>"

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Google OAuth (optional - configure if using Google login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 4. Set Up Database

The application will automatically create database tables using TypeORM migrations. Ensure your MySQL server is running and the database exists:

```sql
CREATE DATABASE lms_db;
```

### 5. Configure Google OAuth (Optional)

Place your `key.json` file in the project root with your Google OAuth credentials:

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

### 8. Start the Frontend Server

In a new terminal:

```bash
cd frontend
npm start
```

The application will open automatically at http://localhost:3000

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

### ![](https://img.shields.io/badge/-2E86AB.svg?logo=shield&logoColor=white) Authentication & Authorization
- Email/password authentication
- Google OAuth2.0 integration
- JWT-based session management
- Role-based access control (Student, Instructor, Admin)
- Password reset functionality

### ![](https://img.shields.io/badge/-FF6B6B.svg?logo=book&logoColor=white) Course Management
- Create and manage courses
- Lesson planning and materials
- Course modules and structure
- Student enrollment system
- Progress tracking

### ![](https://img.shields.io/badge/-4ECDC4.svg?logo=clipboard&logoColor=white) Assessment System
- **Quiz Creation**: Multiple choice, true/false questions
- **Assignment Management**: File uploads and submissions
- **Grading System**: Automated and manual grading
- **Progress Analytics**: Student performance tracking

### ![](https://img.shields.io/badge/-FFD93D.svg?logo=video&logoColor=black) Virtual Classroom
- Live session scheduling
- Video conferencing integration
- Session recording capabilities
- Interactive whiteboard features

### ![](https://img.shields.io/badge/-6BCF7F.svg?logo=chat&logoColor=white) Communication
- Discussion forums
- Direct messaging
- Announcement system
- Email notifications

### ![](https://img.shields.io/badge/-2E86AB.svg?logo=barchart&logoColor=white) Analytics & Reporting
- Student progress reports
- Course completion statistics
- Performance analytics
- Export capabilities

## ![](https://img.shields.io/badge/-FF6B6B.svg?logo=swagger&logoColor=white) API Documentation

The NestJS backend automatically generates Swagger documentation available at:
```
http://localhost:5000/api/docs
```

### Key API Endpoints

```
Authentication:
POST /api/auth/login           # Login with email/password
POST /api/auth/google          # Google OAuth login
GET  /api/auth/google          # Google OAuth redirect
POST /api/auth/logout          # Logout

Users (Admin Only):
GET    /api/users              # List all users (admin only)
GET    /api/users/me           # Get current user profile
PUT    /api/users/:id          # Update user (admin only)
DELETE /api/users/:id          # Delete user (admin only)
POST   /api/users/admin-register # Create new user (admin only)

Courses:
GET    /api/courses            # List courses
POST   /api/courses            # Create course (instructor/admin)
GET    /api/courses/:id        # Get course details
PUT    /api/courses/:id        # Update course (instructor/admin)
DELETE /api/courses/:id        # Delete course (admin only)

Assessments:
GET    /api/quizzes            # List quizzes
POST   /api/quizzes            # Create quiz (instructor/admin)
GET    /api/quizzes/:id        # Get quiz details
PUT    /api/quizzes/:id        # Update quiz (instructor/admin)

GET    /api/assignments        # List assignments
POST   /api/assignments        # Create assignment (instructor/admin)
GET    /api/assignments/:id    # Get assignment details

Virtual Classroom:
GET    /api/virtual-sessions   # List virtual sessions
POST   /api/virtual-sessions   # Create session (instructor/admin)
GET    /api/virtual-sessions/:id # Get session details
```

### Authentication & Authorization

| Endpoint | Authentication | Authorization |
|----------|---------------|---------------|
| `/api/status` | None | None |
| `/api/auth/login` | None | None |
| `/api/users` | JWT | Admin only |
| `/api/users/me` | JWT | Any user |
| `/api/courses` | JWT | Any user |
| `/api/quizzes` | JWT | Any user |

## <img src="https://cdn-icons-png.flaticon.com/512/716/716784.png" width="22" height="22" alt="Structure"> Project Structure

```
SS2-SmartLMS/
├── nestjs-backend/          # NestJS TypeScript Backend
│   ├── src/
│   │   ├── assessments/     # Quiz & Assignment modules
│   │   ├── auth/           # Authentication & Authorization
│   │   ├── courses/        # Course management
│   │   ├── users/          # User management
│   │   ├── uploads/        # File upload handling
│   │   └── main.ts         # Application entry point
│   ├── uploads/            # Uploaded files storage
│   └── package.json
├── frontend/               # React.js Frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API service layer
│   │   └── context/        # React context providers
│   └── package.json
├── backend/               # Legacy Express.js (deprecated)
└── key.json              # Google OAuth credentials
```

## <img src="https://cdn-icons-png.flaticon.com/512/2040/2040504.png" width="22" height="22" alt="Troubleshooting"> Troubleshooting

### Common Issues

#### Backend Connection Issues
```bash
# Check if NestJS server is running
curl http://localhost:5000/api/status

# View server logs
cd nestjs-backend
npm run start:dev
```

#### Database Connection
```bash
# Test MySQL connection
mysql -u your_username -p -h localhost

# Check if database exists
SHOW DATABASES;
USE lms_db;
SHOW TABLES;
```

#### Google OAuth Issues
1. Ensure `key.json` is in the project root
2. Verify Google client ID matches in both `key.json` and frontend config
3. Check redirect URIs are properly configured in Google Console
4. Restart both servers after configuration changes

#### Frontend API Connection
1. Verify backend is running on port 5000
2. Check CORS configuration in `main.ts`
3. Ensure `FRONTEND_URL` environment variable is set correctly

#### File Upload Issues
1. Check upload directory permissions
2. Verify multer configuration in uploads module
3. Ensure file size limits are appropriate

### Environment Variables Checklist

Ensure these variables are set in your `.env` file:
- ✓ `PORT` (default: 5000)
- ✓ `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- ✓ `JWT_SECRET` (use a strong, random string)
- ✓ `FRONTEND_URL` (for CORS)
- ✓ Email configuration (if using notifications)
