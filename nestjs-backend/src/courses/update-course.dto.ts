import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseStatus } from '../common/enums/course-status.enum';

export class UpdateCourseDto {
  @ApiPropertyOptional({ description: 'Course title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Course code' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Course instructor ID' })
  @IsNumber()
  @IsOptional()
  instructorId?: number;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsNumber()
  @IsOptional()
  departmentId?: number;

  @ApiPropertyOptional({ description: 'Course start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Course end date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Course status', enum: CourseStatus })
  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

  @ApiPropertyOptional({ description: 'Whether the course is featured' })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Enrollment key for the course' })
  @IsString()
  @IsOptional()
  enrollmentKey?: string;

  @ApiPropertyOptional({ description: 'URL to the course thumbnail image' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
} 