import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentsApiController } from './enrollments-api.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
  ],
  controllers: [
    EnrollmentsApiController
  ],
  providers: [],
})
export class EnrollmentsApiModule {}
