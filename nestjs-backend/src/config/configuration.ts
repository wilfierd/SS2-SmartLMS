import * as fs from 'fs';
import * as path from 'path';

// Try loading key.json from several possible locations
const possibleKeyPaths = [
  path.resolve(process.cwd(), 'key.json'), // root of current working dir
  path.resolve(process.cwd(), '..', 'key.json'), // parent dir
  path.resolve(__dirname, '../../../key.json'), // workspace root when running from src/config
];
let keyJsonData: any = {};
for (const p of possibleKeyPaths) {
  if (fs.existsSync(p)) {
    keyJsonData = JSON.parse(fs.readFileSync(p, 'utf-8'));
    break;
  }
}
const googleWeb = keyJsonData.oauth_credentials?.web || {};

export default () => ({
  port: parseInt(process.env.PORT ?? '5000', 10), database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'lms_db', ssl: process.env.DB_SSL_MODE === 'REQUIRED' ? (() => {
      // Check if we have certificates from environment variables (GitHub Secrets)
      if (process.env.DB_SSL_CA_CONTENT && process.env.DB_SSL_CERT_CONTENT && process.env.DB_SSL_KEY_CONTENT) {
        return {
          ca: process.env.DB_SSL_CA_CONTENT,
          cert: process.env.DB_SSL_CERT_CONTENT,
          key: process.env.DB_SSL_KEY_CONTENT,
          rejectUnauthorized: false,
        };
      }
      // Otherwise use certificate files (local development)
      try {
        const caPath = path.resolve(process.env.DB_SSL_CA || './ssl/server-ca.pem');
        const certPath = path.resolve(process.env.DB_SSL_CERT || './ssl/client-cert.pem');
        const keyPath = path.resolve(process.env.DB_SSL_KEY || './ssl/client-key.pem');

        if (fs.existsSync(caPath) && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
          return {
            ca: fs.readFileSync(caPath),
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
            rejectUnauthorized: false,
          };
        }
      } catch (error) {
        console.warn('SSL certificate files not found, using simple SSL');
      }
      // Fallback to simple SSL
      return { rejectUnauthorized: false };
    })() : false,
    // Cloud SQL connection settings
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    extra: {
      connectionLimit: 10,
      idleTimeout: 900000,
      acquireTimeout: 60000,
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_default_jwt_secret_for_development',
    expiresIn: '1h',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || googleWeb?.client_id,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || googleWeb?.client_secret,
  }, frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  mlService: {
    url: process.env.ML_SERVICE_URL || 'http://localhost:8000',
    timeout: parseInt(process.env.ML_SERVICE_TIMEOUT ?? '30000', 10),
  },
  nodeEnv: process.env.NODE_ENV || 'development',
}); 