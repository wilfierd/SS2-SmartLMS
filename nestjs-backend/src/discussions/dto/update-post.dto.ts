// src/discussions/dto/update-post.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePostDto {
  @IsNotEmpty()
  @IsString()
  content: string;
}