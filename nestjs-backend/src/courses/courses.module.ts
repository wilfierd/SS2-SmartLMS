import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CourseModule } from './entities/course-module.entity';
import { Lesson } from './entities/lesson.entity';
import { LessonMaterial } from './entities/lesson-material.entity';
import { Assignment } from './entities/assignment.entity';
import { CoursesService } from './courses.service';
import { CourseModulesService } from './course-modules.service';
import { LessonsService } from './lessons.service';
import { CoursesController } from './courses.controller';
import { CourseModulesController } from './course-modules.controller';
import { LessonsController } from './lessons.controller';
import { LessonMaterialsController } from './lesson-materials.controller';
import { DepartmentsModule } from '../departments/departments.module';
import { UsersModule } from '../users/users.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseModule, Lesson, LessonMaterial, Assignment]),
    DepartmentsModule,
    UsersModule,
    forwardRef(() => EnrollmentsModule),
  ],
  providers: [
    CoursesService,
    CourseModulesService,
    LessonsService
  ],
  controllers: [
    CoursesController,
    CourseModulesController,
    LessonsController,
    LessonMaterialsController
  ],
  exports: [
    CoursesService,
    CourseModulesService,
    LessonsService
  ]
})
export class CoursesModule {}
