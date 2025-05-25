// src/discussions/dto/create-discussion.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDiscussionDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}