// src/messages/dto/message-seen.dto.ts
import { IsNumber } from 'class-validator';

export class MessageSeenDto {
  @IsNumber()
  messageId: number;
}