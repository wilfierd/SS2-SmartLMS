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
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const configService = app.get(ConfigService);
  app.use(passport.initialize());

  // Log incoming requests
  app.use((req, res, next) => {
    if (req.method !== 'OPTIONS') {
      console.log(`Request: ${req.method} ${req.url}`);
    }
    next();
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  // Define global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: false,
    transform: true,
    forbidNonWhitelisted: false,
    transformOptions: {
      enableImplicitConversion: true
    }
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
  // Configure Swagger documentation (after global prefix)
  const config = new DocumentBuilder()
    .setTitle('SS2-SmartLMS API')
    .setDescription('The SmartLMS API endpoints documentation.')
    .setVersion('1.0')
    .addServer('http://localhost:5000', 'Development server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

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

  const profileUploadsDir = join(uploadsDir, 'profiles');
  if (!fs.existsSync(profileUploadsDir)) {
    fs.mkdirSync(profileUploadsDir, { recursive: true });
  }

  // Setup static file serving for uploads
  app.use('/uploads', express.static(uploadsDir));
  // Apply global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Start the server using port from configuration
  const port = configService.get<number>('port', 5000);
  app.setGlobalPrefix('api');
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}
bootstrap();
