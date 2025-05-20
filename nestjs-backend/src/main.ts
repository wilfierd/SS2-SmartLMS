import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as passport from 'passport';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  
  app.use(passport.initialize());
  
  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('SS2-SmartLMS API')
    .setDescription('The SmartLMS API endpoints documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // Log incoming requests
  app.use((req, res, next) => {
    if (req.method !== 'OPTIONS') {
      console.log(`Request: ${req.method} ${req.url}`);
    }
    next();
  });
  
  // Define global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  
  // Define global prefix
  app.setGlobalPrefix('api', {
    exclude: [
      '', 
      'status'
    ],
  });
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Create subdirectories for different upload types
  const lessonUploadsDir = join(uploadsDir, 'lessons');
  if (!fs.existsSync(lessonUploadsDir)) {
    fs.mkdirSync(lessonUploadsDir, { recursive: true });
  }
  
  const assignmentUploadsDir = join(uploadsDir, 'assignments');
  if (!fs.existsSync(assignmentUploadsDir)) {
    fs.mkdirSync(assignmentUploadsDir, { recursive: true });
  }
  
  // Setup static file serving for uploads
  app.use('/uploads', express.static(uploadsDir));
  
  // Start the server on port 5000
  const port = 5000; // Default port
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}
bootstrap();
