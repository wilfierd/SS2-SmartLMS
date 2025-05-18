import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ContentType } from '../entities/lesson.entity';
import { Type } from 'class-transformer';

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  moduleId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

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