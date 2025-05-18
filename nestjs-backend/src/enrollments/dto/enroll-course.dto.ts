import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class EnrollCourseDto {
  @IsInt()
  @Type(() => Number)
  courseId: number;

  @IsString()
  @IsOptional()
  enrollmentKey?: string;
} 