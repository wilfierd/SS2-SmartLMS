import { IsString, IsNumber, IsDate, IsBoolean, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAssignmentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxPoints?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;

  @IsString()
  @IsOptional()
  allowedFileTypes?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxFileSize?: number;

  @IsBoolean()
  @IsOptional()
  allowLateSubmissions?: boolean;
} 