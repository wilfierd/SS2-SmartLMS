# SS2-SmartLMS - Learning Management System

A comprehensive Learning Management System with support for students, instructors, and administrators.

## System Requirements

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/SS2-SmartLMS.git
cd SS2-SmartLMS
```

### 2. Set Up Backend

```bash
cd backend
npm install
```

### 3. Configure Backend Environment Variables

Create or edit the .env file in the backend directory:

```
PORT=5000
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=lms_db
JWT_SECRET=your_secret_key_should_be_long_and_random_replace_this
NODE_ENV=development
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="LMS Admin <no-reply@lms.com>"
FRONTEND_URL=http://localhost:3000
```

### 4. Set Up Database

```bash
node setupdb.js
```

### 5. Set Up Frontend

```bash
cd ../frontend
npm install
```

### 6. Configure Frontend (API URL and Google Client ID)

The frontend is already configured to use the Google client ID from the key.json file via the config.js file. No additional configuration is needed.

### 7. Start the Backend Server

```bash
cd ../backend
nodemon sever.js
```

### 8. Start the Frontend Server

In a new terminal:

```bash
cd frontend
npm start
```

The application will open in your browser at http://localhost:3000

## Default Login Credentials

### Admin
- Email: (Check the database after setup)
- Password: admin123

### Instructor
- Email: (Check the database after setup)
- Password: instructor123

### Student
- Email: (Check the database after setup)
- Password: 123456789

Students are required to change their password upon first login.

## Features

- User authentication (email/password and Google OAuth)
- Role-based access control (Student, Instructor, Admin)
- Dashboard for each user type
- Course management
- Session scheduling
- Student enrollments
- Password reset functionality
- User profile management

## Troubleshooting

If you encounter the "Google Client ID not configured" error:
1. Make sure the backend server is running
2. Check that the Google client ID in config.js matches the one in key.json
(you can find this file in ours drive)
3. Restart both frontend and backend servers

## License

This project is licensed under the terms of the license included in the LICENSE file.
