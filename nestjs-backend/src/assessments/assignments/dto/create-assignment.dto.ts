import { IsString, IsNumber, IsDate, IsBoolean, IsOptional, IsNotEmpty, Min, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';

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
  @Transform(({ value, obj }) => {
    // Support both max_points and maxPoints
    if (obj.max_points !== undefined && obj.maxPoints === undefined) {
      return obj.max_points;
    }
    return value;
  })
  maxPoints?: number = 100;

  @IsDate()
  @Type(() => Date)
  @Transform(({ value, obj }) => {
    // Support both due_date and dueDate
    if (obj.due_date !== undefined && obj.dueDate === undefined) {
      return new Date(obj.due_date);
    }
    return value;
  })
  dueDate: Date;

  @IsString()
  @IsOptional()
  @Transform(({ value, obj }) => {
    // Support both allowed_file_types and allowedFileTypes
    if (obj.allowed_file_types !== undefined && obj.allowedFileTypes === undefined) {
      return obj.allowed_file_types;
    }
    return value;
  })
  allowedFileTypes?: string = 'pdf,docx';

  @IsNumber()
  @Min(1)
  @IsOptional()
  @Transform(({ value, obj }) => {
    // Support both max_file_size and maxFileSize
    if (obj.max_file_size !== undefined && obj.maxFileSize === undefined) {
      return obj.max_file_size;
    }
    return value;
  })
  maxFileSize?: number = 5;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value, obj }) => {
    // Support both allow_late_submissions and allowLateSubmissions
    if (obj.allow_late_submissions !== undefined && obj.allowLateSubmissions === undefined) {
      return obj.allow_late_submissions;
    }
    return value;
  })
  allowLateSubmissions?: boolean = false;

  @IsInt()
  @Type(() => Number)
  @Transform(({ value, obj }) => {
    // Support both lesson_id and lessonId
    if (obj.lesson_id !== undefined && obj.lessonId === undefined) {
      return obj.lesson_id;
    }
    return value;
  })
  lessonId: number;
} 