import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';

export class CreateAssignmentDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value, obj }) => {
    // Support both lesson_id and lessonId
    if (obj.lesson_id !== undefined && obj.lessonId === undefined) {
      return obj.lesson_id;
    }
    return value;
  })
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
  @Transform(({ value, obj }) => {
    // Support both max_points and maxPoints
    if (obj.max_points !== undefined && obj.maxPoints === undefined) {
      return obj.max_points;
    }
    return value;
  })
  maxPoints?: number; // Defaults to 100 in server.js

  @IsNotEmpty()
  @IsDateString()
  @Transform(({ value, obj }) => {
    // Support both due_date and dueDate
    if (obj.due_date !== undefined && obj.dueDate === undefined) {
      return obj.due_date;
    }
    return value;
  })
  dueDate: string;

  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => {
    // Support both allowed_file_types and allowedFileTypes
    if (obj.allowed_file_types !== undefined && obj.allowedFileTypes === undefined) {
      return obj.allowed_file_types;
    }
    return value;
  })
  allowedFileTypes?: string; // e.g., 'pdf,docx', defaults in server.js

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value, obj }) => {
    // Support both max_file_size and maxFileSize
    if (obj.max_file_size !== undefined && obj.maxFileSize === undefined) {
      return obj.max_file_size;
    }
    return value;
  })
  maxFileSize?: number; // In MB, defaults in server.js

  @IsOptional()
  @IsBoolean()
  @Transform(({ value, obj }) => {
    // Support both allow_late_submissions and allowLateSubmissions
    if (obj.allow_late_submissions !== undefined && obj.allowLateSubmissions === undefined) {
      return obj.allow_late_submissions;
    }
    return value;
  })
  allowLateSubmissions?: boolean; // Defaults in server.js
} 