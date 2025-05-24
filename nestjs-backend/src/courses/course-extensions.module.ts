import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseStatisticsController } from './statistics.controller';
import { StudentManagementController } from './student-management.controller';
import { CoursesController } from './courses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [
    CourseStatisticsController,
    StudentManagementController,
    CoursesController,
  ],
  providers: [],
})
export class CourseExtensionsModule {}
