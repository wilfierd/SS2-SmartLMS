import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateQuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  optionText: string;

  @IsBoolean()
  isCorrect: boolean;
} 