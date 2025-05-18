import { IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PollResponseDto {
  @ApiProperty({ description: 'ID of the poll being responded to' })
  @IsNumber()
  @IsNotEmpty()
  pollId: number;

  @ApiProperty({ description: 'ID of the option selected' })
  @IsNumber()
  @IsNotEmpty()
  optionId: number;
} 