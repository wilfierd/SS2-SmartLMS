// src/messages/dto/create-message.dto.ts
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsNumber()
  receiverId: number;

  @IsString()
  @IsNotEmpty()
  content: string;
}