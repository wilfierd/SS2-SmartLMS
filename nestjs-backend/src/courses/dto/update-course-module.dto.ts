import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UpdateCourseModuleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

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