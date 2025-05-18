import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { MaterialType } from '../entities/lesson-material.entity';
import { Type } from 'class-transformer';

export class UpdateLessonMaterialDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lessonId?: number;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsString()
  externalUrl?: string;

  @IsOptional()
  @IsEnum(MaterialType)
  materialType?: MaterialType;
} 