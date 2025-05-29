import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnrollCourseDto {
  @ApiProperty({
    description: 'Course ID to enroll in',
    example: 1
  })
  @IsInt()
  @Type(() => Number)
  courseId: number;

  @ApiPropertyOptional({
    description: 'Enrollment key if required by the course',
    example: 'CS101_2024'
  })
  @IsString()
  @IsOptional()
  enrollmentKey?: string;
}