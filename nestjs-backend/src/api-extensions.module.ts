import { Module } from '@nestjs/common';
import { EnrollmentsApiController } from './enrollments/enrollments-api.controller';

@Module({
  imports: [],
  controllers: [
    EnrollmentsApiController
  ],
  providers: [],
})
export class ApiExtensionsModule {}
