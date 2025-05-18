import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { MaterialType } from '../entities/lesson-material.entity';
import { Type } from 'class-transformer';

export class CreateLessonMaterialDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  lessonId: number;

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsString()
  externalUrl?: string;

  @IsNotEmpty()
  @IsEnum(MaterialType)
  materialType: MaterialType;
} 