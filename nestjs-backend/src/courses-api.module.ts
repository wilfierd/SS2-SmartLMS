import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesApiController } from './courses-api.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
  ],
  controllers: [
    CoursesApiController
  ],
  providers: [],
})
export class CoursesApiModule {}
