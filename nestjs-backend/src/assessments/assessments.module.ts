import { Module } from '@nestjs/common';
import { AssignmentsModule } from './assignments/assignments.module';
import { QuizzesModule } from './quizzes/quizzes.module';

@Module({
  imports: [
    AssignmentsModule,
    QuizzesModule
  ],
  exports: [
    AssignmentsModule,
    QuizzesModule
  ]
})
export class AssessmentsModule {} 