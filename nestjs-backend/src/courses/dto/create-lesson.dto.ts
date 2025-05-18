import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ContentType } from '../entities/lesson.entity';
import { Type } from 'class-transformer';

export class CreateLessonDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  moduleId: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEnum(ContentType)
  contentType: ContentType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  durationMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  orderIndex?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
} 