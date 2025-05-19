import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CourseStatus } from '../entities/course.entity';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ description: 'Course title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Course code' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Course instructor ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  instructorId?: number;

  @ApiPropertyOptional({ description: 'Department ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  departmentId?: number;

  @ApiPropertyOptional({ description: 'Course status', enum: CourseStatus })
  @IsOptional()
  @IsEnum(CourseStatus, {
    message: 'Status must be one of the following values: draft, published, upcoming, archived'
  })
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

  @ApiPropertyOptional({ description: 'Enrollment key for the course' })
  @IsOptional()
  @IsString()
  enrollmentKey?: string;

  @ApiPropertyOptional({ description: 'Whether the course is featured' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Course start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Course end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'URL to the course thumbnail image' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
} 