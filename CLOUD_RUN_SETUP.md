# Cloud Run Deployment Setup Guide

## 🚀 GitHub Secrets Configuration

You need to set up the following secrets in your GitHub repository:

### 1. Google Cloud Platform Secrets

#### `GCP_SA_KEY`
Service Account Key JSON for Cloud Run deployment:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** → **Service Accounts**
3. Create a new service account or use existing one
4. Grant these roles:
   - `Cloud Run Admin`
   - `Cloud Build Editor`
   - `Artifact Registry Admin`
   - `Service Account User`
5. Create a key (JSON format)
6. Copy the entire JSON content to this secret

#### `GCP_PROJECT_ID`
Your Google Cloud Project ID:
```
your-project-id
```

#### `GCP_REGION`
The region where you want to deploy (recommended: `us-central1`):
```
us-central1
```

### 2. Database Secrets (same as your existing SQL deployment)

#### `DB_HOST`
Your Cloud SQL instance public IP:
```
34.123.456.789
```

#### `DB_USERNAME`
Database username:
```
root
```

#### `DB_PASSWORD`
Database password:
```
your_database_password
```

#### `DB_SSL_CA`
SSL CA certificate content (from your Cloud SQL instance)

#### `DB_SSL_CERT`
SSL client certificate content

#### `DB_SSL_KEY`
SSL client key content

### 3. Application Secrets

#### `JWT_SECRET`
JWT secret for authentication:
```
your_very_long_and_secure_jwt_secret_key_here
```

#### `GOOGLE_CLIENT_ID`
Google OAuth client ID:
```
your_google_client_id.apps.googleusercontent.com
```

#### `GOOGLE_CLIENT_SECRET`
Google OAuth client secret:
```
your_google_client_secret
```

#### `FRONTEND_URL`
Your Vercel frontend URL:
```
https://your-app.vercel.app
```

### 4. Email Service Secrets

#### `MAIL_HOST`
SMTP host:
```
live.smtp.mailtrap.io
```

#### `MAIL_PORT`
SMTP port:
```
587
```

#### `MAIL_USER`
SMTP username:
```
smtp@mailtrap.io
```

#### `MAIL_PASSWORD`
SMTP password:
```
your_smtp_password
```

#### `MAIL_FROM`
From email address:
```
SmartLMS System <noreply@yourdomain.com>
```

## 🛠️ Pre-deployment Setup

### 1. Enable Required APIs

Run these commands in Google Cloud Shell:

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com
```

### 2. Create Artifact Registry Repository

```bash
# Create repository for Docker images
gcloud artifacts repositories create smartlms \
    --repository-format=docker \
    --location=us-central1 \
    --description="Smart LMS Docker images"
```

### 3. Configure Cloud SQL Authorized Networks

Add these IP ranges to your Cloud SQL authorized networks:
- `0.0.0.0/0` (for GitHub Actions - less secure but simple)

Or for better security, add GitHub Actions IP ranges:
- Get current ranges from: https://api.github.com/meta

## 🚀 Deployment Process

### Automatic Deployment

The workflow will automatically deploy when you:
1. Push to `master` branch
2. Modify files in `nestjs-backend/` or `ml-service/`
3. Manually trigger via GitHub Actions

### Manual Deployment

Trigger manually in GitHub:
1. Go to **Actions** tab
2. Select **Deploy Backend to Cloud Run**
3. Click **Run workflow**

## 📋 After Deployment

### 1. Get Service URLs

After successful deployment, you'll see URLs in the workflow logs:
```
Backend API: https://smartlms-backend-xxx-uc.a.run.app
ML Service: https://smartlms-ml-service-xxx-uc.a.run.app
```

### 2. Update Frontend Configuration

Update your Vercel environment variables:
```
REACT_APP_API_URL=https://smartlms-backend-xxx-uc.a.run.app/api
```

### 3. Configure CORS

The backend should automatically allow your frontend domain, but verify in your NestJS configuration:

```typescript
// main.ts
app.enableCors({
  origin: [
    'https://your-app.vercel.app',
    'http://localhost:3000' // for development
  ],
  credentials: true,
});
```

## 🔍 Monitoring and Troubleshooting

### Cloud Run Logs

```bash
# View backend logs
gcloud logs read --service=smartlms-backend --limit=50

# View ML service logs
gcloud logs read --service=smartlms-ml-service --limit=50
```

### Health Checks

Test your deployed services:
```bash
# Backend health
curl https://smartlms-backend-xxx-uc.a.run.app/health

# ML service health
curl https://smartlms-ml-service-xxx-uc.a.run.app/health

# API documentation
curl https://smartlms-backend-xxx-uc.a.run.app/api/docs
```

### Common Issues

1. **Cold Start**: First request may be slow (30s+)
2. **Memory Limits**: Increase if you see OOM errors
3. **Timeout**: Increase if requests take longer than 5 minutes
4. **CORS**: Ensure frontend domain is whitelisted

## 💰 Cost Optimization

Cloud Run pricing:
- **CPU**: Only charged when processing requests
- **Memory**: Only charged during execution
- **Requests**: $0.40 per million requests
- **Free Tier**: 2 million requests/month

To optimize costs:
- Use `--min-instances 0` (cold starts but saves money)
- Optimize Docker image size
- Use proper memory allocation (1Gi for backend, 2Gi for ML)

## 🔄 CI/CD Pipeline Flow

```
Code Push → GitHub Actions → Build Docker → Push to Artifact Registry → Deploy to Cloud Run → Health Check
```

Your complete deployment architecture:
```
Vercel (Frontend) → Cloud Run (Backend + ML) → Cloud SQL (Database)
```
