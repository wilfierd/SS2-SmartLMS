// src/discussions/dto/create-post.dto.ts
import { IsNotEmpty, IsOptional, IsNumber, IsString } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsNumber()
  parentPostId?: number;
}