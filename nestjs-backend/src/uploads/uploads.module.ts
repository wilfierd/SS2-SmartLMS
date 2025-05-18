import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { CoursesModule } from '../courses/courses.module';
import { AssignmentsModule } from '../assessments/assignments/assignments.module';
import { AssignmentSubmission } from '../assessments/assignments/entities/assignment-submission.entity';
import { LessonMaterial } from '../courses/entities/lesson-material.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { Course } from '../courses/entities/course.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssignmentSubmission,
      LessonMaterial,
      Lesson,
      Course
    ]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: diskStorage({
          destination: (req, file, cb) => {
            // Default uploads path
            let uploadPath = join(__dirname, '..', '..', 'uploads');
            
            // Path can be customized based on the route
            if (req.originalUrl.includes('/thumbnail/course')) {
              uploadPath = join(uploadPath, 'thumbnails');
            } else if (req.originalUrl.includes('/material/lesson')) {
              uploadPath = join(uploadPath, 'lesson-materials');
            } else if (req.originalUrl.includes('/submission/assignment')) {
              uploadPath = join(uploadPath, 'assignment-submissions');
            }
            
            // Create directory if it doesn't exist
            const fs = require('fs');
            if (!fs.existsSync(uploadPath)) {
              fs.mkdirSync(uploadPath, { recursive: true });
            }
            
            cb(null, uploadPath);
          },
          filename: (req, file, cb) => {
            // Generate unique filename with original extension
            const uniqueSuffix = uuidv4();
            const ext = extname(file.originalname);
            cb(null, `${uniqueSuffix}${ext}`);
          },
        }),
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB limit by default
        },
        fileFilter: (req, file, cb) => {
          // Accept images, documents, videos based on route
          const imageTypes = /jpeg|jpg|png|gif/;
          const documentTypes = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt/;
          const videoTypes = /mp4|avi|mov|wmv|flv/;
          
          const ext = extname(file.originalname).toLowerCase().substring(1);
          
          if (req.originalUrl.includes('/thumbnail/course')) {
            // Only images for thumbnails
            cb(null, imageTypes.test(ext));
          } else if (req.originalUrl.includes('/material/lesson')) {
            // Images, documents, videos for lesson materials
            cb(null, imageTypes.test(ext) || documentTypes.test(ext) || videoTypes.test(ext));
          } else if (req.originalUrl.includes('/submission/assignment')) {
            // Allow document uploads for assignments by default, can be customized
            cb(null, documentTypes.test(ext) || imageTypes.test(ext));
          } else {
            cb(null, true); // Accept all types for other routes
          }
        }
      }),
      inject: [ConfigService],
    }),
    CoursesModule,
    AssignmentsModule
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService]
})
export class UploadsModule {} 