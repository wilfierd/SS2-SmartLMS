// src/discussions/dto/update-discussion.dto.ts
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateDiscussionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}