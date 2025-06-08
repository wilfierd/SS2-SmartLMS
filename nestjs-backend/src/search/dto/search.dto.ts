import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ContentType {
  COURSE = 'course',
  DISCUSSION = 'discussion',
  ANNOUNCEMENT = 'announcement',
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export class SearchDto {
  @ApiProperty({
    description: 'Search query',
    example: 'javascript programming',
  })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: 'Filter by department name',
    example: 'Computer Science',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Filter by instructor name',
    example: 'John Smith',
  })
  @IsOptional()
  @IsString()
  instructor?: string;

  @ApiPropertyOptional({
    description: 'Filter by content type',
    enum: ContentType,
    example: ContentType.COURSE,
  })
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional({
    description: 'Filter by difficulty level',
    enum: DifficultyLevel,
    example: DifficultyLevel.BEGINNER,
  })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'active',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Number of results to return',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of results to skip',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

export class SearchResultDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Title of the content' })
  title: string;

  @ApiProperty({ description: 'Content description' })
  content: string;

  @ApiProperty({ description: 'Content type', enum: ContentType })
  type: ContentType;

  @ApiPropertyOptional({ description: 'Instructor name' })
  instructor?: string;

  @ApiPropertyOptional({ description: 'Department name' })
  department?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  thumbnailUrl?: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'Formatted/highlighted content' })
  _formatted?: any;
}

export class SearchResponseDto {
  @ApiProperty({ description: 'Search results', type: [SearchResultDto] })
  results: SearchResultDto[];

  @ApiProperty({ description: 'Total number of results' })
  total: number;

  @ApiProperty({ description: 'Search query' })
  query: string;

  @ApiProperty({ description: 'Applied filters' })
  filters: any;
}

export class FilterOptionDto {
  @ApiProperty({ description: 'Filter value' })
  value: string;

  @ApiProperty({ description: 'Filter label' })
  label: string;
}

export class FilterOptionsResponseDto {
  @ApiProperty({ description: 'Available departments', type: [FilterOptionDto] })
  departments: FilterOptionDto[];

  @ApiProperty({ description: 'Available instructors', type: [FilterOptionDto] })
  instructors: FilterOptionDto[];

  @ApiProperty({ description: 'Available content types', type: [FilterOptionDto] })
  contentTypes: FilterOptionDto[];

  @ApiProperty({ description: 'Available difficulties', type: [FilterOptionDto] })
  difficulties: FilterOptionDto[];
} 