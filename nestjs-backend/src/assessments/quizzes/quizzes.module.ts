import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { Quiz } from './entities/quiz.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { FillInAnswer } from './entities/fill-in-answer.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizResponse } from './entities/quiz-response.entity';
import { CoursesModule } from '../../courses/courses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quiz,
      QuizQuestion,
      QuestionOption,
      FillInAnswer,
      QuizAttempt,
      QuizResponse
    ]),
    CoursesModule
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService]
})
export class QuizzesModule {} 