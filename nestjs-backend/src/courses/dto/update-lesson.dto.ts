import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ContentType } from '../entities/lesson.entity';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';

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
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  durationMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  orderIndex?: number;

  // Add transformation from 'order' to 'orderIndex' for compatibility
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value, obj }) => {
    // If value exists and orderIndex is not set, use this value for orderIndex
    if (value !== undefined && obj.orderIndex === undefined) {
      obj.orderIndex = value;
    }
    return undefined; // Remove 'order' property from the validated object
  })
  order?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
} 