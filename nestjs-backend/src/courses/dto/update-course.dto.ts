import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CourseStatus } from '../entities/course.entity';
import { Transform, Type } from 'class-transformer';

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
  @Type(() => Number)
  instructorId?: number;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
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
  @IsEnum(CourseStatus, {
    message: 'Status must be one of the following values: draft, published, upcoming, archived'
  })
  @IsOptional()
  @Transform(({ value }) => {
    console.log('Original status value:', value);
    
    // If it's already a valid enum value, return it
    if (Object.values(CourseStatus).includes(value as CourseStatus)) {
      console.log('Status already valid:', value);
      return value;
    }
    
    // If it's a string, convert to lowercase
    if (typeof value === 'string') {
      const lowercaseValue = value.toLowerCase();
      console.log('Lowercase status:', lowercaseValue);
      
      // Check if lowercase version is valid by comparing with enum values
      const enumValues = Object.values(CourseStatus) as string[];
      if (enumValues.includes(lowercaseValue)) {
        console.log('Status valid after lowercase:', lowercaseValue);
        return lowercaseValue;
      }
    }
    
    // If we get here, we'll let validation fail
    console.log('Invalid status, will fail validation:', value);
    return value;
  })
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