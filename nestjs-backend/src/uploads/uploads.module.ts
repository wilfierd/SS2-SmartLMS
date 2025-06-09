import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { extname } from 'path';
import * as multer from 'multer';
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
    ]),    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // Use memory storage so files are kept in memory as buffers
        // This allows UploadsService to handle file saving manually
        storage: multer.memoryStorage(),
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB limit by default
        },
        fileFilter: (req, file, cb) => {
          // Accept images, documents, videos based on route
          const imageTypes = /jpeg|jpg|png|gif/;
          const documentTypes = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt/;
          const videoTypes = /mp4|avi|mov|wmv|flv/;
          const audioTypes = /mp3|wav|ogg|m4a/;

          const ext = extname(file.originalname).toLowerCase().substring(1);

          if (req.originalUrl.includes('/thumbnail')) {
            // Only images for thumbnails
            cb(null, imageTypes.test(ext));
          } else if (req.originalUrl.includes('/material') || req.originalUrl.includes('/course-material')) {
            // Images, documents, videos, audio for materials
            cb(null, imageTypes.test(ext) || documentTypes.test(ext) || videoTypes.test(ext) || audioTypes.test(ext));
          } else if (req.originalUrl.includes('/submission')) {
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
    forwardRef(() => AssignmentsModule)
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService]
})
export class UploadsModule { } 