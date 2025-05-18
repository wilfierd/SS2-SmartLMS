import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class GradeSubmissionDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  grade: number;

  @IsString()
  @IsOptional()
  feedback?: string;
} 