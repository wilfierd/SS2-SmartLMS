import { IsString, IsEnum, IsInt, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../entities/quiz-question.entity';
import { CreateQuestionOptionDto } from './create-question-option.dto';
import { CreateFillInAnswerDto } from './create-fill-in-answer.dto';

export class CreateQuestionDto {
  @IsString()
  questionText: string;

  @IsEnum(QuestionType)
  questionType: QuestionType;

  @IsString()
  @IsOptional()
  imageData?: string;

  @IsNumber()
  @IsOptional()
  points?: number = 1;

  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  @IsOptional()
  options?: CreateQuestionOptionDto[];

  @ValidateNested()
  @Type(() => CreateFillInAnswerDto)
  @IsOptional()
  fillInAnswer?: CreateFillInAnswerDto;
} 