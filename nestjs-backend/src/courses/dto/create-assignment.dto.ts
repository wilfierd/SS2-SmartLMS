import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssignmentDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  lessonId: number; // Maps to course_modules.id in the database

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPoints?: number; // Defaults to 100 in server.js

  @IsNotEmpty()
  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsString()
  allowedFileTypes?: string; // e.g., 'pdf,docx', defaults in server.js

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxFileSize?: number; // In MB, defaults in server.js

  @IsOptional()
  @IsBoolean()
  allowLateSubmissions?: boolean; // Defaults in server.js
} 