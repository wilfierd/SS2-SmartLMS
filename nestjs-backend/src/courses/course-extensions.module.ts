import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseStatisticsController } from './statistics.controller';
import { StudentManagementController } from './student-management.controller';
import { CourseStudentsApiController } from './course-students-api.controller';
import { CourseStatisticsApiController } from './course-statistics-api.controller';
import { CourseDetailApiController } from './course-detail-api.controller';
import { CourseDiscussionsApiController } from './course-discussions-api.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
  ],
  controllers: [
    CourseStatisticsController,
    StudentManagementController,
    CourseStudentsApiController,
    CourseStatisticsApiController,
    CourseDetailApiController,
    CourseDiscussionsApiController
  ],
  providers: [],
})
export class CourseExtensionsModule {}
