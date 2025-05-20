import { IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuestionOptionDto {
  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}

class QuizQuestionDto {
  @IsString()
  questionText: string;

  @IsString()
  questionType: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber()
  points?: number;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @IsOptional()
  @IsString()
  fillInAnswer?: string;
}

export class CreateQuizDto {
  @IsNumber()
  courseId: number;

  @IsNumber()
  lessonId: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  timeLimitMinutes?: number;

  @IsOptional()
  @IsNumber()
  passingScore?: number;

  // Virtual field to determine if this is a test or quiz
  // Used by controllers, not directly saved to DB
  @IsOptional()
  @IsBoolean()
  isTest?: boolean;

  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];
} 