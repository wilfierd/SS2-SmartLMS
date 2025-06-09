import { Module, forwardRef } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { CoursesModule } from '../courses/courses.module';
import { DiscussionsModule } from '../discussions/discussions.module';
import { UsersModule } from '../users/users.module';
import { DepartmentsModule } from '../departments/departments.module';

@Module({
  imports: [
    forwardRef(() => CoursesModule),
    forwardRef(() => DiscussionsModule),
    UsersModule,
    DepartmentsModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule { } 