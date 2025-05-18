import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PollOptionDto {
  @ApiProperty({ description: 'Option text for the poll' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiPropertyOptional({ description: 'Order index for display', default: 0 })
  @IsNumber()
  @IsOptional()
  orderIndex?: number;
}

export class CreatePollDto {
  @ApiProperty({ description: 'ID of the session this poll belongs to' })
  @IsNumber()
  @IsNotEmpty()
  sessionId: number;

  @ApiProperty({ description: 'Poll question text' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ description: 'Whether multiple options can be selected' })
  @IsBoolean()
  @IsOptional()
  isMultipleChoice: boolean = false;

  @ApiProperty({ description: 'Whether responses should be anonymous' })
  @IsBoolean()
  @IsOptional()
  isAnonymous: boolean = false;

  @ApiProperty({ description: 'List of options for this poll', type: [PollOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[];
} 