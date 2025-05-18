import { IsString, IsNotEmpty } from 'class-validator';

export class CreateFillInAnswerDto {
  @IsString()
  @IsNotEmpty()
  answerText: string;
} 