// src/discussions/discussions.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from './entities/discussion.entity';
import { DiscussionPost } from './entities/discussion-post.entity';
import { DiscussionsService } from './discussions.service';
import { DiscussionsController } from './discussions.controller';
import { CoursesModule } from '../courses/courses.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Discussion, DiscussionPost]),
    forwardRef(() => CoursesModule),
    forwardRef(() => SearchModule),
  ],
  controllers: [DiscussionsController],
  providers: [DiscussionsService],
  exports: [DiscussionsService],
})
export class DiscussionsModule { }