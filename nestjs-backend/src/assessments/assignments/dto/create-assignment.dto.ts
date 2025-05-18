import { IsString, IsNumber, IsDate, IsBoolean, IsOptional, IsNotEmpty, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxPoints?: number = 100;

  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @IsString()
  @IsOptional()
  allowedFileTypes?: string = 'pdf,docx';

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxFileSize?: number = 5;

  @IsBoolean()
  @IsOptional()
  allowLateSubmissions?: boolean = false;

  @IsInt()
  @Type(() => Number)
  lessonId: number;
} 